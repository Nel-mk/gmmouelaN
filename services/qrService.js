// services/qrService.js - Service pour générer les QR codes des tickets

const QRCode = require('qrcode');

/**
 * 🎓 LEÇON : Fonction pour créer un QR Code pour un ticket spécifique
 * 
 * @param {Object} ticketData - Les informations du ticket
 * @param {number} ticketData.id - ID unique du ticket en BDD
 * @param {string} ticketData.nom - Nom du participant
 * @param {string} ticketData.type - Type de ticket (vip/standard)
 * @param {string} ticketData.transaction_id - ID de la transaction PayPal
 * @returns {Object} - Objet contenant l'image QR et les infos
 */
async function genererQRTicket(ticketData) {
    try {
        console.log(`🎫 Génération QR Code pour ticket ID: ${ticketData.id}`);
        
        // ÉTAPE 1 : Construire l'identifiant unique du ticket
        // Format: GM_MOUELA-ID-TYPE-NOM
        // Pourquoi ce format ?
        // - GM_MOUELA : Identifie votre événement (évite confusion avec autres concerts)
        // - ID : Identifiant unique en base de données (impossible de dupliquer)
        // - TYPE : VIP ou STANDARD (information rapide pour le contrôle)
        // - NOM : Nom du participant (vérification visuelle rapide)
        const identifiantQR = `GM_MOUELA-${ticketData.id}-${ticketData.type.toUpperCase()}-${ticketData.nom.toUpperCase()}`;
        
        console.log(`🔐 Identifiant QR généré: ${identifiantQR}`);
        
        // ÉTAPE 2 : Configuration du QR Code
        const optionsQR = {
            // Taille de l'image (300x300 pixels = bonne qualité pour email et impression)
            width: 300,
            
            // Marge autour du QR (2 = marge standard)
            margin: 2,
            
            // Couleurs du QR Code
            color: {
                dark: '#000000',    // Couleur des carrés (noir standard)
                light: '#FFFFFF'    // Couleur du fond (blanc standard)
            },
            
            // Niveau de correction d'erreur
            // 'M' = Medium (15% de tolérance aux dommages)
            // Même si le QR est un peu abîmé, il reste lisible
            errorCorrectionLevel: 'M'
        };
        
        // ÉTAPE 3 : Génération de l'image QR Code
        // toDataURL() crée une image au format "data:image/png;base64,..."
        // Ce format peut être directement utilisé dans les emails HTML
        const imageQR = await QRCode.toDataURL(identifiantQR, optionsQR);
        
        console.log(` QR Code généré avec succès !`);
        console.log(` Dimensions: ${optionsQR.width}x${optionsQR.width} pixels`);
        console.log(` Taille données: ${imageQR.length} caractères`);
        
        // ÉTAPE 4 : Retourner toutes les informations utiles
        return {
            // L'image QR Code prête à être utilisée
            qrImage: imageQR,
            
            // Le texte encodé dans le QR (pour debug/log)
            qrText: identifiantQR,
            
            // Informations du ticket (pour référence)
            ticketInfo: {
                id: ticketData.id,
                nom: ticketData.nom,
                type: ticketData.type,
                transaction: ticketData.transaction_id
            },
            
            // Métadonnées utiles
            metadata: {
                generatedAt: new Date().toISOString(),
                dimensions: `${optionsQR.width}x${optionsQR.width}`,
                format: 'PNG (Base64)'
            }
        };
        
    } catch (error) {
        console.error(' Erreur génération QR Code:', error);
        
        // Retourner un objet d'erreur plutôt que null
        // Cela permet de gérer l'erreur proprement dans le code appelant
        return {
            success: false,
            error: error.message,
            ticketId: ticketData.id
        };
    }
}

/**
 * 🎓 LEÇON : Fonction pour créer plusieurs QR Codes en une fois
 * Utile quand quelqu'un achète plusieurs tickets
 * 
 * @param {Array} ticketsArray - Tableau de tickets
 * @returns {Array} - Tableau de QR Codes générés
 */
async function genererQRMultiples(ticketsArray) {
    console.log(`🎫 Génération de ${ticketsArray.length} QR Codes...`);
    
    const qrCodes = [];
    
    // Boucle pour générer un QR Code par ticket
    for (let i = 0; i < ticketsArray.length; i++) {
        const ticket = ticketsArray[i];
        
        console.log(`   📱 QR Code ${i + 1}/${ticketsArray.length} pour ${ticket.nom}...`);
        
        // Générer le QR Code pour ce ticket
        const qrResult = await genererQRTicket(ticket);
        
        if (qrResult.success !== false) {
            qrCodes.push(qrResult);
            console.log(`    QR Code ${i + 1} généré avec succès`);
        } else {
            console.error(`    Échec QR Code ${i + 1}:`, qrResult.error);
            // On continue malgré l'erreur sur un ticket
        }
    }
    
    console.log(` QR Codes générés: ${qrCodes.length}/${ticketsArray.length}`);
    return qrCodes;
}

/**
 * 🎓 LEÇON : Fonction de validation d'un QR Code
 * Cette fonction sera utilisée à l'entrée du concert pour valider les tickets
 * 
 * @param {string} qrText - Le texte lu depuis le QR Code scanné
 * @returns {Object} - Informations extraites du QR Code
 */
function analyserQRCode(qrText) {
    try {
        console.log(`🔍 Analyse du QR Code: ${qrText}`);
        
        // ÉTAPE 1 : Vérifier le format
        // Format attendu: GM_MOUELA-ID-TYPE-NOM
        const parties = qrText.split('-');
        
        if (parties.length < 4) {
            return {
                valide: false,
                erreur: 'Format QR Code invalide - Pas assez de parties'
            };
        }
        
        // ÉTAPE 2 : Vérifier que c'est bien un QR de GM MOUELA
        if (parties[0] !== 'GM_MOUELA') {
            return {
                valide: false,
                erreur: 'QR Code non reconnu - Pas un ticket GM MOUELA'
            };
        }
        
        // ÉTAPE 3 : Extraire les informations
        const ticketId = parseInt(parties[1]);
        const type = parties[2].toLowerCase();
        const nom = parties.slice(3).join('-'); // Au cas où le nom contient des tirets
        
        // ÉTAPE 4 : Validation des données
        if (isNaN(ticketId) || ticketId <= 0) {
            return {
                valide: false,
                erreur: 'ID ticket invalide'
            };
        }
        
        if (!['vip', 'standard'].includes(type)) {
            return {
                valide: false,
                erreur: 'Type de ticket invalide'
            };
        }
        
        // ÉTAPE 5 : Retourner les informations extraites
        return {
            valide: true,
            ticketId: ticketId,
            type: type,
            nom: nom,
            texteOriginal: qrText
        };
        
    } catch (error) {
        console.error(' Erreur analyse QR Code:', error);
        return {
            valide: false,
            erreur: `Erreur analyse: ${error.message}`
        };
    }
}

/**
 * 🎓 LEÇON : Fonction de test pour vérifier le service
 */
async function testerServiceQR() {
    console.log('🧪 Test du service QR Code...\n');
    
    // Test avec un ticket exemple
    const ticketTest = {
        id: 456,
        nom: 'Marie Dupont',
        type: 'standard',
        transaction_id: 'TEST123456'
    };
    
    // Générer le QR Code
    const qrResult = await genererQRTicket(ticketTest);
    
    if (qrResult.success !== false) {
        console.log(' QR Code généré avec succès !');
        console.log('🔐 Texte QR:', qrResult.qrText);
        
        // Tester l'analyse du QR Code
        const analyse = analyserQRCode(qrResult.qrText);
        
        if (analyse.valide) {
            console.log(' Analyse QR réussie !');
            console.log('   - Ticket ID:', analyse.ticketId);
            console.log('   - Type:', analyse.type);
            console.log('   - Nom:', analyse.nom);
        } else {
            console.log(' Erreur analyse:', analyse.erreur);
        }
    } else {
        console.log(' Erreur génération QR:', qrResult.error);
    }
}

// Exporter les fonctions pour les utiliser dans d'autres fichiers
module.exports = {
    genererQRTicket,
    genererQRMultiples,
    analyserQRCode,
    testerServiceQR
};

// Si ce fichier est exécuté directement, lancer le test
if (require.main === module) {
    testerServiceQR();
}