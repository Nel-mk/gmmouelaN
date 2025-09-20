const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Configuration PostgreSQL détectée:');
console.log('Database URL définie:', process.env.DATABASE_URL ? 'Oui' : 'Non');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test de connexion
pool.connect()
    .then(client => {
        console.log('✅ Connexion réussie à PostgreSQL');
        client.release();
    })
    .catch(err => {
        console.error('❌ Erreur PostgreSQL:', err.message);
    });

module.exports = pool;