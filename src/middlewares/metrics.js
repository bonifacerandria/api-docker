const client = require('prom-client');
const pool = require('../config/db');

/**
 * Registre dédié à l'application (pas le registre global de prom-client),
 * pour garder un contrôle explicite sur ce qui est exposé - évite les
 * surprises si une dépendance tierce enregistre ses propres métriques
 * globalement un jour.
 */
const register = new client.Registry();

// Métriques par défaut du process Node (CPU, mémoire heap, event loop lag,
// garbage collector...) - précieuses pour repérer une fuite mémoire ou un
// event loop bloqué, sans rien avoir à instrumenter soi-même.
client.collectDefaultMetrics({ register, prefix: 'taskflow_' });

// --- Métriques HTTP personnalisées ---

const httpRequestsTotal = new client.Counter({
  name: 'taskflow_http_requests_total',
  help: "Nombre total de requêtes HTTP reçues",
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'taskflow_http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status_code'],
  // Buckets adaptés à une API REST classique : la plupart des requêtes
  // devraient être sous 100ms, mais on garde de la granularité jusqu'à 5s
  // pour repérer les requêtes lentes (grosses jointures, verrous DB...).
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// --- Métrique du pool PostgreSQL ---
// Une Gauge avec callback : sa valeur est recalculée à chaque scrape,
// pas maintenue à jour en continu -> coût nul entre deux scrapes.
// eslint-disable-next-line no-new
new client.Gauge({
  name: 'taskflow_db_pool_connections',
  help: 'État du pool de connexions PostgreSQL',
  labelNames: ['state'],
  registers: [register],
  collect() {
    this.set({ state: 'total' }, pool.totalCount);
    this.set({ state: 'idle' }, pool.idleCount);
    this.set({ state: 'waiting' }, pool.waitingCount);
  },
});

/**
 * Remplace les segments purement numériques d'un chemin par ":id"
 * (ex: "/api/v1/projects/42" -> "/api/v1/projects/:id"), pour que toutes
 * les requêtes vers la même route logique partagent la même série
 * temporelle, quel que soit l'id demandé - évite une explosion de
 * cardinalité si on utilisait l'URL brute telle quelle.
 */
function normalizeRoute(path) {
  return path
    .split('/')
    .map((segment) => (/^\d+$/.test(segment) ? ':id' : segment))
    .join('/');
}

/**
 * Middleware Express : mesure chaque requête HTTP et incrémente les
 * métriques ci-dessus. Doit être monté tôt dans app.js, avant les routes.
 *
 * Important : on normalise directement req.path (l'URL réelle sans query
 * string) plutôt que de s'appuyer sur req.route/req.baseUrl. Ces derniers
 * sont fragiles sur un chemin d'erreur : Express restaure req.baseUrl à la
 * valeur du routeur parent dès qu'un next(err) traverse les couches
 * imbriquées, BIEN AVANT que le error handler global ne s'exécute -> le
 * label "route" devenait incomplet uniquement sur les réponses en erreur
 * (ex: "/:id" au lieu de "/api/v1/projects/:id"), créant deux séries
 * temporelles différentes pour la même route selon qu'elle réussit ou
 * échoue. Normaliser l'URL réelle contourne complètement ce problème.
 */
function metricsMiddleware(req, res, next) {
  const endTimer = httpRequestDuration.startTimer();

  res.on('finish', () => {
    // req.originalUrl (jamais req.path, ni req.baseUrl) : Express réécrit
    // req.path et req.baseUrl à chaque frontière de routeur imbriqué (au
    // sens propre : ce sont des valeurs relatives au routeur courant, qui
    // changent en descendant/remontant la pile). req.originalUrl est la
    // seule valeur qu'Express garantit stable et absolue du début à la fin
    // de la requête, quel que soit le nombre de routeurs traversés ou si
    // la réponse part en erreur.
    const path = req.originalUrl.split('?')[0];
    const route = normalizeRoute(path);

    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };

    httpRequestsTotal.inc(labels);
    endTimer(labels);
  });

  next();
}

/**
 * Handler pour GET /metrics - exposé par app.js.
 */
async function metricsHandler(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = { metricsMiddleware, metricsHandler, register };
