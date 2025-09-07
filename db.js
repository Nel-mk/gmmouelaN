const mysql = require('mysql2');
require('dotenv').config();

console.log('🔍 Configuration DB détectée:');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Database:', process.env.DB_NAME);
console.log('Password défini:', process.env.DB_PASS ? 'Oui' : 'Non');

// Configuration de la connexion MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'ticket_platform',
    charset: 'utf8mb4'
});

// Test de la connexion
db.connect((err) => {
    if (err) {
        console.error('❌ Erreur de connexion à la base de données:');
        console.error('Code:', err.code);
        console.error('Message:', err.message);
        
        // Suggestions basées sur l'erreur
        if (err.code === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR') {
            console.log('\n🔧 Solutions possibles:');
            console.log('1. Vérifier le fichier .env');
            console.log('2. Créer un utilisateur MySQL dédié');
            console.log('3. Utiliser sudo mysql au lieu de mysql -p');
        }
        return;
    }
    console.log('✅ Connexion réussie à la base de données MySQL');
});

// Gestion des erreurs de connexion
db.on('error', (err) => {
    console.error('❌ Erreur base de données:', err.code, err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Tentative de reconnexion...');
        // Ne pas reconnecter automatiquement pour éviter les boucles
    }
});

module.exports = db;