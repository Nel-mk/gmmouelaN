const mysql = require('mysql2');
require('dotenv').config();

console.log('🔍 Configuration DB détectée:');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Database:', process.env.DB_NAME);
console.log('Password défini:', process.env.DB_PASS ? 'Oui' : 'Non');

// Utiliser un pool au lieu d'une connexion unique
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'ticket_platform',
    charset: 'utf8mb4',
    // Configuration du pool
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    // Gestion des connexions fermées
    handleDisconnects: true
});

// Test de connexion
pool.getConnection((err, connection) => {
    if (err) {
        console.error(' Erreur de connexion à la base de données:');
        console.error('Code:', err.code);
        console.error('Message:', err.message);
        
        if (err.code === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR') {
            console.log('\n🔧 Solutions possibles:');
            console.log('1. Vérifier le fichier .env');
            console.log('2. Créer un utilisateur MySQL dédié');
        }
        return;
    }
    
    console.log(' Connexion réussie à la base de données MySQL');
    connection.release(); // Libérer la connexion de test
});

// Gestion des erreurs du pool
pool.on('connection', (connection) => {
    console.log('Nouvelle connexion établie:', connection.threadId);
});

pool.on('error', (err) => {
    console.error(' Erreur pool de connexions:', err.code, err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log(' Reconnexion automatique...');
    }
});

module.exports = pool;