const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const ticketsRoutes = require('./routes/tickets');
//on active la route paypal pour les paiements pour les tickets
const paypalRoutes = require('./routes/paypal');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static('public'));// Pour servir les fichiers statiques (HTML, CSS, JS)

// Routes API
app.use('/api/tickets', ticketsRoutes);
app.use('/api/paypal', paypalRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur Node.js démarré sur le port ${PORT}`));


