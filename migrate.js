
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const createTables = async () => {
    const queries = [
        `CREATE TABLE IF NOT EXISTS evenements (
            id SERIAL PRIMARY KEY,
            nom VARCHAR(200) NOT NULL,
            description TEXT,
            date_debut TIMESTAMP NOT NULL,
            date_fin TIMESTAMP NOT NULL,
            lieu VARCHAR(200),
            prix_standard DECIMAL(10,2) DEFAULT 50.00,
            prix_vip DECIMAL(10,2) DEFAULT 70.00,
            places_total INTEGER DEFAULT 150,
            places_vip_total INTEGER DEFAULT 50,
            places_standard_total INTEGER DEFAULT 100,
            statut VARCHAR(20) DEFAULT 'actif',
            date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS tickets (
            id SERIAL PRIMARY KEY,
            evenement_id INTEGER DEFAULT 1,
            type VARCHAR(50) NOT NULL,
            quantite INTEGER NOT NULL,
            nom VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL,
            telephone VARCHAR(20) NOT NULL,
            transaction_id VARCHAR(100) NOT NULL,
            montant DECIMAL(10,2) NOT NULL,
            statut VARCHAR(20) DEFAULT 'confirmed',
            date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `INSERT INTO evenements (nom, description, date_debut, date_fin, lieu, prix_standard, prix_vip, places_total, places_vip_total, places_standard_total, statut) 
         VALUES ('GM MOUELA CONCERT PRESENTATION', 'ÉVÉNEMENT EXCLUSIF', '2025-12-13 15:00:00', '2025-12-13 01:00:00', 'TEATRO MOLARCHI', 50.00, 70.00, 150, 50, 100, 'actif')
         ON CONFLICT DO NOTHING`
    ];
    
    for (const query of queries) {
        await pool.query(query);
        console.log('Table créée/mise à jour');
    }
    
    console.log('Migration terminée !');
    process.exit(0);
};

createTables().catch(console.error);