/**Le fichier paypal.js servira à gérer les routes API liées au paiement PayPal (ex : création d’un paiement, validation, etc.).
 * logique des routes (ce que le frontend appelle pour lancer un paiement).
 */

const express = require('express');
const router = express.Router();
const { client } = require('../config/paypal');
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

// Créer un ordre
router.post('/create-order', async (req, res) => {
  console.log("➡️ Route /create-order appelée !");
    const amount = req.body.amount || '50.00'; // Valeur par défaut si rien n'est envoyé
  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'EUR',
        value: amount // Montant dynamique
      }
    }]
  });

  try {
    const order = await client().execute(request);
    res.json({ id: order.result.id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de la création de l’ordre');
  }
});

// Capturer un paiement
router.post('/capture-order/:orderID', async (req, res) => {
  const orderID = req.params.orderID;
  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});

  try {
    const capture = await client().execute(request);
    res.json(capture.result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de la capture');
  }
});

module.exports = router;
