const pool = require('../config/db');

const SELECT_FIELDS = `id, project_id AS "projectId", title, description, status, priority,
  due_date AS "dueDate", created_at AS "createdAt", updated_at AS "updatedAt"`;

const UPDATABLE_COLUMNS = {
  title: 'title',
  description: 'description',
  priority: 'priority',
  dueDate: 'due_date',
  status: 'status',
};

async function findAll(filters = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (filters.projectId) {
    conditions.push(`project_id = $${idx}`);
    values.push(filters.projectId);
    idx += 1;
  }
  if (filters.status) {
    conditions.push(`status = $${idx}`);
    values.push(filters.status);
    idx += 1;
  }
  if (filters.priority) {
    conditions.push(`priority = $${idx}`);
    values.push(filters.priority);
    idx += 1;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT ${SELECT_FIELDS} FROM tasks ${where} ORDER BY id`, values);
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${SELECT_FIELDS} FROM tasks WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create({
  projectId, title, description, priority, dueDate,
}) {
  const { rows } = await pool.query(
    `INSERT INTO tasks (project_id, title, description, priority, due_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${SELECT_FIELDS}`,
    [projectId, title, description || '', priority || 'medium', dueDate || null],
  );
  return rows[0];
}

async function update(id, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([key, value]) => {
    const column = UPDATABLE_COLUMNS[key];
    if (!column) return;
    fields.push(`${column} = $${idx}`);
    values.push(value);
    idx += 1;
  });

  if (fields.length === 0) return findById(id);

  fields.push('updated_at = now()');
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${SELECT_FIELDS}`,
    values,
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  return rowCount > 0;
}

async function countByProject(projectId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM tasks WHERE project_id = $1',
    [projectId],
  );
  return rows[0].count;
}

module.exports = {
  findAll, findById, create, update, remove, countByProject,
};
