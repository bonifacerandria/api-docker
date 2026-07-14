const request = require('supertest');
const app = require('../../src/app');

describe('App - endpoints transverses', () => {
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
});
