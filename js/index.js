
const entreQuantite = document.getElementById("quantity");
const entreNom = document.getElementById("containerNom");
const ticketType =document.getElementById("ticketType");
const paypalContainer = document.getElementById("paypal-button-container"); // <-- ici

function generateParticipantFields() {
    entreNom.innerHTML = ""; // Réinitialiser le conteneur
    const quantity = parseInt(entreQuantite.value)|| 1;

    for (let i = 1; i <= quantity; i++) {
        const newDiv = document.createElement("div");
        newDiv.classList.add("mb-3");
        newDiv.innerHTML = `
            <h5>Participant ${i}</h5>
            <label class="form-label">Nom</label>
            <input type="text" name="participant${i}_nom" class="form-control" required>

            <label class="form-label mt-2">Email</label>
            <input type="email" name="participant${i}_email" class="form-control" required>

            <label class="form-label mt-2">Téléphone</label>
            <input type="tel" name="participant${i}_tel" class="form-control" required>
        `;
        entreNom.appendChild(newDiv);
    }
  }

// Fonction pour créer les champs dynamiques
function verifieChampRempli() {
    const inputs = document.querySelectorAll("#containerNom input");
    let tousremplis =true;
    inputs.forEach(input=>{
      if(input.value.trim()==="")tousremplis=false;
    });//trim() supprime les espaces
    //on ecrit inputs.forEach car querySelectorAll renvoie une liste de noeuds

    //Activer ou desactiver le bouton Paypal
    const bouton =paypalContainer.querySelectorAll("iframe");
    bouton.forEach(iframe=>{
      iframe.style.pointerEvents=tousremplis?"auto":"none";
      iframe.style.opacity=tousremplis?"1":"0.5";
    })
}

//ecouter les changements dans tous les inputs dynamique 
entreNom.addEventListener("input",verifieChampRempli);
entreQuantite.addEventListener("input",()=>{
  generateParticipantFields();//regenerer les champs
  verifieChampRempli();//verifier si les champs sont remplis
});

ticketType.addEventListener("change",()=>{
  generateParticipantFields();//regenerer les champs
  verifieChampRempli();//verifier si les champs sont remplis
});


// Génération initiale et écoute des changements
generateParticipantFields();
entreQuantite.addEventListener("input", generateParticipantFields);
ticketType.addEventListener("change", generateParticipantFields);

// PayPal Buttons
paypal.Buttons({
    createOrder: function(data, actions) {
        const price = parseFloat(ticketType.selectedOptions[0].dataset.price);
        const quantity = parseInt(entreQuantite.value);
        const total = (price * quantity).toFixed(2);

        return actions.order.create({
            purchase_units: [{
                amount: {
                    value: total
                }
            }]
        });
    },
    onApprove: function(data, actions) {
        return actions.order.capture().then(function(details) {
            alert("Transaction OK : " + details.payer.name.given_name +
                  "\nMontant payé : " + details.purchase_units[0].amount.value + " €");
        });
    },
    onError: function(err) {
        console.error("Payment Error:", err);
        alert("Paiement échoué !");
    },
    // Limiter les méthodes de paiement affichées
    funding: {
        disallowed: [paypal.FUNDING.CREDIT, paypal.FUNDING.ELV, paypal.FUNDING.ITAU, paypal.FUNDING.BANCONTACT, paypal.FUNDING.SOFORT, paypal.FUNDING.MYBANK]
    }
}).render("#paypal-button-container");


// Récupérer tous les liens du menu
const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

// Parcourir les liens et activer celui correspondant à la page courante
navLinks.forEach(link => {
  // Comparer l'URL du lien avec l'URL actuelle
  if (link.href === window.location.href) {
    link.classList.add('active');
  } else {
    link.classList.remove('active');
  }
});
