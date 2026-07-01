# TaskFlow API

API REST de gestion de projets et tâches — **projet fil rouge** de la formation DevOps Senior.
Chaque module de la formation viendra enrichir ce même projet (Docker, PostgreSQL, CI/CD,
monitoring, Kubernetes...) sans jamais le réécrire de zéro.

## Pourquoi cette architecture ?

Le code est découpé en couches, chacune avec une seule responsabilité :

```
Requête HTTP
    │
    ▼
routes/          → définit les URLs et branche la validation
    │
    ▼
middlewares/      → validation (Joi), logs, sécurité
    │
    ▼
controllers/      → traduit HTTP <-> appel service (aucune logique métier ici)
    │
    ▼
services/         → RÈGLES MÉTIER (ex: on ne supprime pas un projet avec des tâches)
    │
    ▼
repositories/      → accès aux données (en mémoire aujourd'hui, PostgreSQL au module 5)
```

**Pourquoi c'est important pour la suite de la formation :** au module 5, on ne touchera
QUE le contenu des fichiers `repositories/*.js` pour brancher PostgreSQL. Les routes,
controllers et services resteront identiques. C'est le principe du *Repository Pattern*,
une pratique standard en entreprise.

## Installation

```bash
npm install
cp .env.example .env
npm run dev      # avec rechargement automatique (nodemon)
# ou
npm start         # démarrage simple
```

Le serveur démarre par défaut sur `http://localhost:3000`.

## Endpoints disponibles

| Méthode | URL | Description |
|---|---|---|
| GET | `/health` | État de santé du serveur (uptime, env) |
| GET | `/api/v1/projects` | Liste des projets |
| GET | `/api/v1/projects/:id` | Détail d'un projet |
| POST | `/api/v1/projects` | Créer un projet |
| PATCH | `/api/v1/projects/:id` | Modifier un projet |
| DELETE | `/api/v1/projects/:id?force=true` | Supprimer un projet |
| GET | `/api/v1/tasks?projectId=&status=` | Liste des tâches (filtrable) |
| GET | `/api/v1/tasks/:id` | Détail d'une tâche |
| POST | `/api/v1/tasks` | Créer une tâche |
| PATCH | `/api/v1/tasks/:id` | Modifier une tâche |
| PATCH | `/api/v1/tasks/:id/status` | Changer le statut (workflow contrôlé) |
| DELETE | `/api/v1/tasks/:id` | Supprimer une tâche |

## Règles métier notables

- **Suppression protégée** : un projet contenant des tâches ne peut pas être supprimé
  sans le paramètre `?force=true` (retourne `409 Conflict`).
- **Workflow de statut contrôlé** : une tâche ne peut pas passer directement de
  `todo` à `done` — elle doit obligatoirement transiter par `in_progress`
  (retourne `400 Bad Request` sinon).
- **Validation stricte des entrées** via Joi sur toutes les routes `POST`/`PATCH`.

## Exemple d'utilisation

```bash
# Créer un projet
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Migration Cloud","description":"Migrer vers AWS"}'

# Créer une tâche dans ce projet
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"projectId":1,"title":"Provisionner le VPC","priority":"high"}'

# Faire avancer la tâche dans le workflow
curl -X PATCH http://localhost:3000/api/v1/tasks/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'
```

## Ce qui arrive dans les prochains modules

- **Module 2** : ce projet part sur GitHub avec un vrai historique de commits
- **Module 3-4** : conteneurisation avec Docker et Docker Compose
- **Module 5** : le `repository` en mémoire devient PostgreSQL
- **Module 7** : suite de tests (Jest + Supertest) sur ces mêmes règles métier
- **Module 11-14** : ce serveur exposera des métriques Prometheus et ses logs
  partiront vers Loki
