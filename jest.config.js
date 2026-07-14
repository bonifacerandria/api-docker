module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup/env.js'],

  // Exécution séquentielle (--runInBand dans les scripts npm) : tous les
  // tests d'intégration partagent la même base taskflow_test. Des workers
  // parallèles se marcheraient dessus sur les TRUNCATE. Ce choix est documenté
  // ici et pas juste dans les scripts, pour qu'il survive même si quelqu'un
  // lance `npx jest` directement sans passer par npm run test.
  maxWorkers: 1,

  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',   // point d'entrée, pas de logique à tester
    '!src/config/**',   // configuration pure
  ],

  // Seuils volontairement élevés sur services/ (règles métier = coeur de
  // l'app, doit être quasi entièrement couvert) et plus souples ailleurs.
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/': {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
  },

  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
};
