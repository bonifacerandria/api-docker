const request = require('supertest');
const app = require('../../src/app');
const { resetDb, closeDb } = require('../helpers/resetDb');
const { buildProjectPayload, buildTaskPayload } = require('../helpers/factories');

// Tests D'INTÉGRATION : passent par le vrai app Express, la vraie stack de
// middlewares, et une vraie base PostgreSQL de test. Plus lents que les
// tests unitaires, mais ils valident que toutes les couches s'assemblent
// correctement (routes -> validation -> controller -> service -> SQL).

describe('API /api/v1/projects', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('POST /api/v1/projects', () => {
    it('crée un projet valide (201)', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .send(buildProjectPayload({ name: 'Migration Cloud' }));

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: 'Migration Cloud', status: 'active' });
      expect(res.body.data.id).toBeDefined();
    });

    it('rejette un nom trop court (400)', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .send(buildProjectPayload({ name: 'a' }));

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('retourne le projet demandé', async () => {
      const created = await request(app).post('/api/v1/projects').send(buildProjectPayload({ name: 'Projet unique' }));

      const res = await request(app).get(`/api/v1/projects/${created.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Projet unique');
    });

    it('retourne 404 pour un id inexistant', async () => {
      const res = await request(app).get('/api/v1/projects/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('liste tous les projets', async () => {
      await request(app).post('/api/v1/projects').send(buildProjectPayload({ name: 'Projet A' }));
      await request(app).post('/api/v1/projects').send(buildProjectPayload({ name: 'Projet B' }));

      const res = await request(app).get('/api/v1/projects');

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(2);
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('met à jour un projet existant', async () => {
      const project = await request(app).post('/api/v1/projects').send(buildProjectPayload());

      const res = await request(app)
        .patch(`/api/v1/projects/${project.body.data.id}`)
        .send({ status: 'archived' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('archived');
    });

    it('retourne 404 pour un projet inexistant', async () => {
      const res = await request(app).patch('/api/v1/projects/99999').send({ status: 'archived' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/projects/:id - règle de suppression protégée', () => {
    it('refuse la suppression (409) si le projet a des tâches, sans force', async () => {
      const project = await request(app).post('/api/v1/projects').send(buildProjectPayload());
      await request(app).post('/api/v1/tasks').send(buildTaskPayload(project.body.data.id));

      const res = await request(app).delete(`/api/v1/projects/${project.body.data.id}`);

      expect(res.status).toBe(409);
    });

    it('supprime en cascade avec force=true', async () => {
      const project = await request(app).post('/api/v1/projects').send(buildProjectPayload());
      const task = await request(app).post('/api/v1/tasks').send(buildTaskPayload(project.body.data.id));

      const del = await request(app).delete(`/api/v1/projects/${project.body.data.id}?force=true`);
      expect(del.status).toBe(204);

      // La tâche doit avoir disparu elle aussi (ON DELETE CASCADE en base).
      const taskCheck = await request(app).get(`/api/v1/tasks/${task.body.data.id}`);
      expect(taskCheck.status).toBe(404);
    });
  });
});
