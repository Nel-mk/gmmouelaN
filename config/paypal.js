const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

function environment() {
  let clientId = process.env.PAYPAL_CLIENT_ID;
  let clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
}

function client() {
  return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
}

module.exports = { client };

//On centralise la connexion à PayPal.
//Si tu passes en production, il suffira de remplacer SandboxEnvironment par LiveEnvironment.

/*Le fichier paypal.js sert à centraliser la configuration et la connexion à l’API PayPal (client, clés, environnement).

*/