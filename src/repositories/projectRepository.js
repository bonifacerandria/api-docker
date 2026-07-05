const pool = require('../config/db');

/**
 * Repository PostgreSQL pour les projets.
 * Remplace l'implémentation en mémoire du module 1, SANS changer la
 * signature d'aucune fonction -> services, controllers et routes
 * n'ont rien eu à changer. C'est tout l'intérêt du Repository Pattern.
 */

const SELECT_FIELDS = `id, name, description, status,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

// Whitelist explicite des colonnes modifiables : on ne construit JAMAIS
// un nom de colonne SQL à partir d'une clé arbitraire venant du client,
// même si Joi filtre déjà les entrées en amont (défense en profondeur).
const UPDATABLE_COLUMNS = {
  name: 'name',
  description: 'description',
  status: 'status',
};

async function findAll() {
  const { rows } = await pool.query(`SELECT ${SELECT_FIELDS} FROM projects ORDER BY id`);
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${SELECT_FIELDS} FROM projects WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create({ name, description }) {
  const { rows } = await pool.query(
    `INSERT INTO projects (name, description) VALUES ($1, $2)
     RETURNING ${SELECT_FIELDS}`,
    [name, description || ''],
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
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${SELECT_FIELDS}`,
    values,
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = {
  findAll, findById, create, update, remove,
};
