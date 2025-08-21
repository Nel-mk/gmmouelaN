
const entreQuantite = document.getElementById("quantity");
const entreNom = document.getElementById("containerNom");

entreQuantite.addEventListener("input", ()=> {
    entreNom.innerHTML =""; // Efface le contenu de l'élément pour éviter la duplication
    const quantity = parseInt(entreQuantite.value);// Récupère la valeur de l'input quantity pour la création des éléments, on fait un parseInt pour convertir la valeur en nombre entier

    for (let i = 1 ; i<quantity;i++){
        const newDiv = document.createElement("div"); // Crée un nouvel élément div
        newDiv.classList.add("mb-3");// Ajoute la classe mb-3 à la div pour l'espacement
        newDiv.innerHTML =` <label class="form-label">Nom participant ${i}</label> <input type="text" name="participant${i}" class="form-control" required></input> `; // Définit le contenu HTML de la div avec un label et un input pour le nom du participant

        entreNom.appendChild(newDiv); // Ajoute la nouvelle div à l'élément entreNom
    }

});

