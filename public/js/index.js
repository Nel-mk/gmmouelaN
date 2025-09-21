
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
     onClick: function(data, actions) {
        // Vérifie si tous les champs des participants sont remplis
        const inputs = document.querySelectorAll("#containerNom input");
        let tousremplis = true;

        inputs.forEach(input => {
            if (input.value.trim() === "") tousremplis = false;
        });

        if (!tousremplis) {
            alert("Veuillez remplir tous les champs avant de payer !");
            return actions.reject(); // bloque le paiement
        }

        return actions.resolve(); // autorise le paiement
    },
    createOrder: function(data, actions) {
        const price = parseFloat(ticketType.selectedOptions[0].dataset.price);
        const quantity = parseInt(entreQuantite.value);
        const total = (price * quantity).toFixed(2);

        return actions.order.create({
            purchase_units: [{
                amount: { value: total }
            }]
        });
    },
    onApprove: function(data, actions) {
        return actions.order.capture().then(function(details) {
            
            // 1️⃣ Récupérer toutes les informations des participants
            const formData = {
                ticketType: ticketType.value,
                quantity: parseInt(entreQuantite.value),
                transactionId: details.id,
                amount: details.purchase_units[0].amount.value,
                participants: []
            };

            document.querySelectorAll("#containerNom div").forEach(div => {
                const inputs = div.querySelectorAll("input");
                formData.participants.push({
                    nom: inputs[0].value,
                    email: inputs[1].value,
                    tel: inputs[2].value
                });
            });

            // 2️⃣ Envoyer les infos au backend Node.js
            fetch("https:gmmouela.onrender.com/api/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Paiement OK et ticket enregistré !");
                    // Nettoyer le formulaire
                    clearFormAfterSuccess(details.id);
                } else {
                    alert("Paiement OK mais problème lors de l'enregistrement !");
                }
            })
            .catch(err => {
                console.error(err);
                alert("Erreur de communication avec le serveur !");
            });

        });
    },
    onError: function(err) {
        console.error("Payment Error:", err);
        alert("Paiement échoué !");
    },
    funding: {
        disallowed: [paypal.FUNDING.CREDIT, paypal.FUNDING.ELV, paypal.FUNDING.ITAU, paypal.FUNDING.BANCONTACT, paypal.FUNDING.SOFORT, paypal.FUNDING.MYBANK]
    }
}).render("#paypal-button-container");



// Fonctions de nettoyage du formulaire
function clearFormAfterSuccess(transactionId) {
    // Vider tous les champs
    document.querySelectorAll('#containerNom input').forEach(input => {
        input.value = '';
    });
    
    // Réinitialiser les sélecteurs
    ticketType.value = '';
    entreQuantite.value = '1';
    
    // Afficher le message de succès dans le container PayPal
    paypalContainer.innerHTML = `
        <div class="alert alert-success text-center">
            <i class="bi bi-check-circle-fill fs-1 text-success"></i>
            <h4>Paiement réussi !</h4>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p>Vos tickets ont été enregistrés avec succès.</p>
            <button class="btn btn-primary mt-3" onclick="resetForm()">
                Nouvelle commande
            </button>
        </div>
    `;
    
    // Désactiver le formulaire
    const form = document.querySelector('form') || document.body;
    form.style.opacity = '0.6';
    form.style.pointerEvents = 'none';
}

function resetForm() {
    // Recharger la page pour tout réinitialiser
    location.reload();
}



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
