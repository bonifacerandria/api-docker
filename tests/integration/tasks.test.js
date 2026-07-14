const request = require('supertest');
const app = require('../../src/app');
const { resetDb, closeDb } = require('../helpers/resetDb');
const { buildProjectPayload, buildTaskPayload } = require('../helpers/factories');

describe('API /api/v1/tasks', () => {
  let projectId;

  beforeEach(async () => {
    await resetDb();
    const project = await request(app).post('/api/v1/projects').send(buildProjectPayload());
    projectId = project.body.data.id;
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('retourne la tâche demandée', async () => {
      const task = await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId, { title: 'Tâche unique' }));

      const res = await request(app).get(`/api/v1/tasks/${task.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Tâche unique');
    });

    it('retourne 404 pour une tâche inexistante', async () => {
      const res = await request(app).get('/api/v1/tasks/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('met à jour les champs éditables', async () => {
      const task = await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId));

      const res = await request(app)
        .patch(`/api/v1/tasks/${task.body.data.id}`)
        .send({ title: 'Titre modifié', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ title: 'Titre modifié', priority: 'high' });
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('supprime une tâche existante (204)', async () => {
      const task = await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId));

      const res = await request(app).delete(`/api/v1/tasks/${task.body.data.id}`);
      expect(res.status).toBe(204);

      const check = await request(app).get(`/api/v1/tasks/${task.body.data.id}`);
      expect(check.status).toBe(404);
    });

    it('retourne 404 pour une tâche déjà supprimée', async () => {
      const res = await request(app).delete('/api/v1/tasks/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/tasks - sans filtre', () => {
    it('liste toutes les tâches du projet', async () => {
      await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId));
      await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId));

      const res = await request(app).get('/api/v1/tasks');
      expect(res.body.results).toBe(2);
    });
  });

  describe('POST /api/v1/tasks', () => {
    it('crée une tâche liée à un projet existant (201)', async () => {
      const res = await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId));

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ projectId, status: 'todo', priority: 'medium' });
    });

    it("rejette la création si le projet n'existe pas (400)", async () => {
      const res = await request(app).post('/api/v1/tasks').send(buildTaskPayload(999999));
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/tasks/:id/status - workflow', () => {
    it('accepte todo -> in_progress', async () => {
      const task = await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId));

      const res = await request(app)
        .patch(`/api/v1/tasks/${task.body.data.id}/status`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });

    it('refuse todo -> done (saut direct interdit)', async () => {
      const task = await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId));

      const res = await request(app)
        .patch(`/api/v1/tasks/${task.body.data.id}/status`)
        .send({ status: 'done' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/tasks - filtres', () => {
    it('filtre correctement par priority', async () => {
      await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId, { priority: 'high' }));
      await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId, { priority: 'low' }));

      const res = await request(app).get('/api/v1/tasks?priority=high');

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data[0].priority).toBe('high');
    });

    it('filtre correctement par projectId', async () => {
      const otherProject = await request(app).post('/api/v1/projects').send(buildProjectPayload({ name: 'Autre projet' }));
      await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId));
      await request(app).post('/api/v1/tasks').send(buildTaskPayload(otherProject.body.data.id));

      const res = await request(app).get(`/api/v1/tasks?projectId=${projectId}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data[0].projectId).toBe(projectId);
    });

    it('filtre correctement par status', async () => {
      const task = await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId));
      await request(app).patch(`/api/v1/tasks/${task.body.data.id}/status`).send({ status: 'in_progress' });
      await request(app).post('/api/v1/tasks').send(buildTaskPayload(projectId));

      const res = await request(app).get('/api/v1/tasks?status=in_progress');

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
    });
  });
});
