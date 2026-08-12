const request = require('supertest');
const app = require('../../src/app');
const { resetDb, closeDb } = require('../helpers/resetDb');

describe('App - endpoints transverses', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('GET /health', () => {
    it('retourne un statut ok avec les métadonnées attendues', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
      expect(res.body.env).toBe('test');
    });
  });

  describe('Route inconnue', () => {
    it('retourne 404 avec un message explicite', async () => {
      const res = await request(app).get('/route/qui/nexiste/pas');

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('/route/qui/nexiste/pas');
    });
  });

  describe('GET /metrics', () => {
    it('expose les métriques au format Prometheus', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('taskflow_http_requests_total');
      expect(res.text).toContain('taskflow_db_pool_connections');
      expect(res.text).toContain('taskflow_process_cpu_seconds_total');
    });

    it('normalise les segments numériques pour éviter une explosion de cardinalité', async () => {
      const project = await request(app).post('/api/v1/projects').send({ name: 'Projet Metrics' });
      await request(app).get(`/api/v1/projects/${project.body.data.id}`);
      await request(app).get('/api/v1/projects/999999'); // 404

      const res = await request(app).get('/metrics');

      // Les deux appels (succès ET échec) doivent partager le même label de
      // route normalisé, jamais l'id brut dans le nom de la série.
      expect(res.text).toContain('route="/api/v1/projects/:id",status_code="200"');
      expect(res.text).toContain('route="/api/v1/projects/:id",status_code="404"');
      expect(res.text).not.toContain(`/api/v1/projects/${project.body.data.id}"`);
    });
  });
});
