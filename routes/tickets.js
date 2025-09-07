const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendTicketEmail } = require('../services/emailService'); //pour l'envoi d'email, on importe la fonction d'envoi d'email

// Middleware de validation (votre code existant)
const validateTicketData = (req, res, next) => {
    const { ticketType, quantity, transactionId, amount, participants } = req.body;
    
    // Vérifications de base
    if (!ticketType || !quantity || !transactionId || !amount || !participants) {
        return res.status(400).json({
            success: false,
            error: "Données manquantes"
        });
    }
    
    if (!Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({
            success: false,
            error: "Participants manquants"
        });
    }
    
    if (participants.length !== parseInt(quantity)) {
        return res.status(400).json({
            success: false,
            error: "Le nombre de participants ne correspond pas à la quantité"
        });
    }
    
    // Vérifier que chaque participant a tous les champs requis
    for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        if (!p.nom || !p.email || !p.tel) {
            return res.status(400).json({
                success: false,
                error: `Données manquantes pour le participant ${i + 1}`
            });
        }
        
        // Validation email basique
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(p.email)) {
            return res.status(400).json({
                success: false,
                error: `Email invalide pour le participant ${i + 1}`
            });
        }
    }
    
    next();
};

// 🔒 NOUVELLE FONCTION : Vérification du stock disponible
const verifyStockAvailability = async (ticketType, quantity) => {
    return new Promise((resolve, reject) => {
        console.log(`🔍 Vérification stock: ${quantity} places ${ticketType}`);
        
        // Requête pour calculer le stock disponible
        const stockQuery = `
            SELECT 
                e.places_${ticketType}_total as total_places,
                COALESCE(SUM(t.quantite), 0) as places_vendues,
                (e.places_${ticketType}_total - COALESCE(SUM(t.quantite), 0)) as places_disponibles
            FROM evenements e
            LEFT JOIN tickets t ON e.id = t.evenement_id 
                AND t.type = ? 
                AND t.statut = 'confirmed'
            WHERE e.id = 1
            GROUP BY e.id, e.places_${ticketType}_total
        `;
        
        db.query(stockQuery, [ticketType], (err, results) => {
            if (err) {
                console.error(' Erreur vérification stock:', err);
                return reject(err);
            }
            
            if (results.length === 0) {
                return reject(new Error('Événement non trouvé'));
            }
            
            const stockInfo = results[0];
            console.log(' Info stock:', stockInfo);
            
            // Vérifier si assez de places disponibles
            const stockSuffisant = stockInfo.places_disponibles >= quantity;
            
            resolve({
                available: stockSuffisant,
                totalPlaces: stockInfo.total_places,
                placesVendues: stockInfo.places_vendues,
                placesDisponibles: stockInfo.places_disponibles,
                quantiteDemandee: quantity
            });
        });
    });
};

// 🔒 NOUVELLE FONCTION : Transaction atomique sécurisée
const insertTicketsAtomically = async (ticketType, quantity, transactionId, amount, participants) => {
    return new Promise((resolve, reject) => {
        console.log('🔄 Début transaction atomique...');
        
        // Commencer une transaction
        db.beginTransaction((err) => {
            if (err) {
                console.error('❌ Erreur début transaction:', err);
                return reject(err);
            }
            
            // ÉTAPE 1 : Re-vérifier le stock AVEC VERROU (FOR UPDATE)
            const lockQuery = `
                SELECT 
                    (e.places_${ticketType}_total - COALESCE(SUM(t.quantite), 0)) as places_disponibles
                FROM evenements e
                LEFT JOIN tickets t ON e.id = t.evenement_id 
                    AND t.type = ? 
                    AND t.statut = 'confirmed'
                WHERE e.id = 1
                GROUP BY e.id
                FOR UPDATE
            `;
            
            db.query(lockQuery, [ticketType], (lockErr, lockResults) => {
                if (lockErr) {
                    return db.rollback(() => {
                        console.error(' Erreur verrou:', lockErr);
                        reject(lockErr);
                    });
                }
                
                const placesDisponibles = lockResults[0]?.places_disponibles || 0;
                
                // Vérifier ENCORE le stock (protection finale)
                if (placesDisponibles < quantity) {
                    return db.rollback(() => {
                        console.log(`❌ Stock insuffisant au moment final: ${placesDisponibles} < ${quantity}`);
                        reject(new Error(`Stock insuffisant: ${placesDisponibles} places disponibles, ${quantity} demandées`));
                    });
                }
                
                // ÉTAPE 2 : Insérer tous les tickets
                const insertQuery = `
                    INSERT INTO tickets (evenement_id, type, quantite, nom, email, telephone, transaction_id, montant, statut)
                    VALUES (1, ?, 1, ?, ?, ?, ?, ?, 'confirmed')
                `;
                
                const pricePerTicket = parseFloat(amount) / parseInt(quantity);
                let insertions = 0;
                let errors = [];
                
                participants.forEach((p, index) => {
                    db.query(insertQuery, [
                        ticketType,
                        p.nom.trim(),
                        p.email.trim().toLowerCase(),
                        p.tel.trim(),
                        transactionId,
                        pricePerTicket
                    ], (insertErr) => {
                        if (insertErr) {
                            console.error(` Erreur insertion participant ${index + 1}:`, insertErr);
                            errors.push(`Erreur pour ${p.nom}: ${insertErr.message}`);
                        } else {
                            console.log(` Participant ${index + 1} enregistré: ${p.nom}`);
                            insertions++;
                        }
                        
                        // Vérifier si toutes les insertions sont terminées
                        if (insertions + errors.length === participants.length) {
                            if (errors.length > 0) {
                                return db.rollback(() => {
                                    reject(new Error(`Erreurs insertion: ${errors.join(', ')}`));
                                });
                            }
                            
                            // SUCCÈS : Confirmer la transaction
                            db.commit((commitErr) => {
                                if (commitErr) {
                                    return db.rollback(() => {
                                        console.error(' Erreur commit:', commitErr);
                                        reject(commitErr);
                                    });
                                }
                                
                                console.log(`🎉 Transaction confirmée: ${insertions} tickets pour ${transactionId}`);
                                resolve({
                                    success: true,
                                    ticketsInserted: insertions,
                                    transactionId: transactionId
                                });
                            });
                        }
                    });
                });
            });
        });
    });
};

// 🚀 ROUTE PRINCIPALE MODIFIÉE avec protection stock
router.post('/', validateTicketData, async (req, res) => {
    const { ticketType, quantity, transactionId, amount, participants } = req.body;
    
    console.log(' Enregistrement de ticket avec vérification stock:', {
        type: ticketType,
        quantity: quantity,
        transactionId: transactionId,
        amount: amount,
        participantsCount: participants.length
    });
    
    try {
        // ÉTAPE 1 : Vérifier si la transaction existe déjà
        const checkQuery = 'SELECT COUNT(*) as count FROM tickets WHERE transaction_id = ?';
        
        const checkExisting = await new Promise((resolve, reject) => {
            db.query(checkQuery, [transactionId], (err, results) => {
                if (err) reject(err);
                else resolve(results[0].count > 0);
            });
        });
        
        if (checkExisting) {
            console.log('⚠️ Transaction déjà enregistrée:', transactionId);
            return res.status(409).json({
                success: false,
                error: "Cette transaction a déjà été enregistrée"
            });
        }
        
        // ÉTAPE 2 : 🔒 VÉRIFICATION DU STOCK (NOUVEAU!)
        const stockVerification = await verifyStockAvailability(ticketType, parseInt(quantity));
        
        if (!stockVerification.available) {
            console.log('❌ Stock insuffisant:', stockVerification);
            return res.status(409).json({
                success: false,
                error: `Stock insuffisant`,
                details: {
                    type: ticketType,
                    demandees: stockVerification.quantiteDemandee,
                    disponibles: stockVerification.placesDisponibles,
                    total: stockVerification.totalPlaces,
                    vendues: stockVerification.placesVendues
                }
            });
        }
        
        console.log(' Stock vérifié - Places disponibles:', stockVerification.placesDisponibles);
        
        // ÉTAPE 3 : 🔒 INSERTION ATOMIQUE SÉCURISÉE (NOUVEAU!)
        const insertResult = await insertTicketsAtomically(
            ticketType, 
            parseInt(quantity), 
            transactionId, 
            amount, 
            participants
        );

        //  ENVOYER EMAIL AUTOMATIQUEMENT
        const emailResult = await sendTicketEmail({ // Hypothétique fonction d'envoi d'email, await veut dire qu'on attend son résultat 
            participants: participants,
            transactionId: transactionId,
            amount: amount,
            ticketType: ticketType
        });
        
        // SUCCÈS !
        res.json({
            success: true,
            message: `${insertResult.ticketsInserted} ticket(s) enregistré(s) avec succès`,
            transactionId: insertResult.transactionId,
            stockInfo: {
                type: ticketType,
                ticketsAchetes: insertResult.ticketsInserted,
                placesRestantesApresAchat: stockVerification.placesDisponibles - parseInt(quantity)
            }
        });
        
    } catch (error) {
        console.error(' Erreur lors du traitement:', error);
        
        // Messages d'erreur spécifiques
        if (error.message.includes('Stock insuffisant')) {
            return res.status(409).json({
                success: false,
                error: error.message
            });
        }
        
        // Erreur générale
        res.status(500).json({
            success: false,
            error: "Erreur serveur lors de l'enregistrement",
            details: error.message
        });
    }
});

// 🆕 NOUVELLE ROUTE : Vérifier le stock en temps réel (pour l'affichage)
router.get('/stock', (req, res) => {
    const stockQuery = `
        SELECT 
            'STOCK_EN_TEMPS_REEL' as info,
            e.nom as concert,
            
            -- VIP
            e.places_vip_total as vip_total,
            COALESCE(SUM(CASE WHEN t.type = 'vip' AND t.statut = 'confirmed' THEN t.quantite END), 0) as vip_vendues,
            e.places_vip_total - COALESCE(SUM(CASE WHEN t.type = 'vip' AND t.statut = 'confirmed' THEN t.quantite END), 0) as vip_disponibles,
            
            -- STANDARD
            e.places_standard_total as standard_total,
            COALESCE(SUM(CASE WHEN t.type = 'standard' AND t.statut = 'confirmed' THEN t.quantite END), 0) as standard_vendues,
            e.places_standard_total - COALESCE(SUM(CASE WHEN t.type = 'standard' AND t.statut = 'confirmed' THEN t.quantite END), 0) as standard_disponibles,
            
            -- TOTAL
            (e.places_vip_total + e.places_standard_total) as total_initial,
            COALESCE(SUM(CASE WHEN t.statut = 'confirmed' THEN t.quantite END), 0) as total_vendues,
            (e.places_vip_total + e.places_standard_total) - COALESCE(SUM(CASE WHEN t.statut = 'confirmed' THEN t.quantite END), 0) as total_disponibles
            
        FROM evenements e
        LEFT JOIN tickets t ON e.id = t.evenement_id
        WHERE e.id = 1
        GROUP BY e.id
    `;
    
    db.query(stockQuery, (err, results) => {
        if (err) {
            console.error(' Erreur récupération stock:', err);
            return res.status(500).json({
                success: false,
                error: "Erreur serveur"
            });
        }
        
        res.json({
            success: true,
            stock: results[0]
        });
    });
});

// Routes existantes inchangées...
router.get('/transaction/:transactionId', (req, res) => {
    const transactionId = req.params.transactionId;
    const query = `
        SELECT id, evenement_id, type, nom, email, telephone, montant, statut, date_creation
        FROM tickets
        WHERE transaction_id = ?
        ORDER BY date_creation ASC
    `;
    
    db.query(query, [transactionId], (err, results) => {
        if (err) {
            console.error(' Erreur lors de la récupération:', err);
            return res.status(500).json({
                success: false,
                error: "Erreur serveur"
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Transaction non trouvée"
            });
        }
        
        res.json({
            success: true,
            tickets: results,
            totalTickets: results.length
        });
    });
});

router.get('/stats', (req, res) => {
    const query = `
        SELECT
            type,
            COUNT(*) as nombre_tickets,
            SUM(montant) as revenus_total,
            AVG(montant) as montant_moyen
        FROM tickets
        WHERE statut = 'confirmed'
        GROUP BY type
        ORDER BY revenus_total DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(' Erreur statistiques:', err);
            return res.status(500).json({
                success: false,
                error: "Erreur serveur"
            });
        }
        
        const totalGeneral = results.reduce((sum, row) => sum + parseFloat(row.revenus_total), 0);
        const ticketsTotal = results.reduce((sum, row) => sum + parseInt(row.nombre_tickets), 0);
        
        res.json({
            success: true,
            stats: results,
            resume: {
                total_revenus: totalGeneral,
                total_tickets: ticketsTotal
            }
        });
    });
});

//-------------------------------------------------------------
// À ajouter dans routes/tickets.js
//  NOUVELLES ROUTES POUR RAPPORTS CSV

// Route pour générer un rapport CSV complet
router.get('/reports/csv', (req, res) => {
    console.log(' Génération rapport CSV complet...');
    
    const query = `
        SELECT 
            t.id as ticket_id,
            t.transaction_id,
            DATE_FORMAT(t.date_creation, '%Y-%m-%d') as date_achat,
            TIME_FORMAT(t.date_creation, '%H:%i:%s') as heure_achat,
            t.nom as participant,
            t.email,
            t.telephone,
            t.type as type_ticket,
            t.quantite,
            FORMAT(t.montant, 2) as prix_unitaire,
            t.statut,
            e.nom as evenement,
            DATE_FORMAT(e.date_debut, '%Y-%m-%d %H:%i') as date_concert
        FROM tickets t
        JOIN evenements e ON t.evenement_id = e.id
        WHERE t.statut = 'confirmed'
        ORDER BY t.date_creation DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Erreur génération CSV:', err);
            return res.status(500).json({
                success: false,
                error: "Erreur serveur lors de la génération du rapport"
            });
        }
        
        // Générer l'en-tête CSV
        const csvHeader = [
            'ID_Ticket',
            'Transaction_ID', 
            'Date_Achat',
            'Heure_Achat',
            'Nom_Participant',
            'Email',
            'Telephone',
            'Type_Ticket',
            'Quantite',
            'Prix_Unitaire_EUR',
            'Statut',
            'Evenement',
            'Date_Concert'
        ].join(',');
        
        // Générer les lignes de données
        const csvData = results.map(row => [
            row.ticket_id,
            row.transaction_id,
            row.date_achat,
            row.heure_achat,
            `"${row.participant}"`, // Guillemets pour les noms avec espaces
            row.email,
            row.telephone,
            row.type_ticket.toUpperCase(),
            row.quantite,
            row.prix_unitaire,
            row.statut,
            `"${row.evenement}"`,
            row.date_concert
        ].join(',')).join('\n');
        
        // Combiner header + data
        const csvContent = csvHeader + '\n' + csvData;
        
        // Configuration de la réponse pour téléchargement
        const filename = `GM_MOUELA_Rapport_${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Ajouter BOM UTF-8 pour Excel
        res.write('\ufeff');
        res.end(csvContent);
        
        console.log(` Rapport CSV généré: ${filename} (${results.length} tickets)`);
    });
});

// Route pour rapport par période
router.get('/reports/csv/:periode', (req, res) => {
    const periode = req.params.periode; // 'today', 'week', 'month', 'all'
    
    let dateCondition = '';
    let periodeName = '';
    
    switch(periode) {
        case 'today':
            dateCondition = "AND DATE(t.date_creation) = CURDATE()";
            periodeName = 'Aujourd\'hui';
            break;
        case 'week':
            dateCondition = "AND t.date_creation >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            periodeName = '7_derniers_jours';
            break;
        case 'month':
            dateCondition = "AND t.date_creation >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            periodeName = '30_derniers_jours';
            break;
        case 'all':
        default:
            dateCondition = '';
            periodeName = 'Complet';
            break;
    }
    
    console.log(` Génération rapport CSV: ${periodeName}`);
    
    const query = `
        SELECT 
            t.id as ticket_id,
            t.transaction_id,
            DATE_FORMAT(t.date_creation, '%Y-%m-%d') as date_achat,
            TIME_FORMAT(t.date_creation, '%H:%i:%s') as heure_achat,
            t.nom as participant,
            t.email,
            t.telephone,
            t.type as type_ticket,
            t.quantite,
            FORMAT(t.montant, 2) as prix_unitaire,
            t.statut,
            e.nom as evenement
        FROM tickets t
        JOIN evenements e ON t.evenement_id = e.id
        WHERE t.statut = 'confirmed' ${dateCondition}
        ORDER BY t.date_creation DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(' Erreur génération CSV période:', err);
            return res.status(500).json({
                success: false,
                error: "Erreur serveur"
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Aucune vente trouvée pour la période: ${periodeName}`
            });
        }
        
        // En-tête CSV
        const csvHeader = [
            'ID_Ticket',
            'Transaction_ID',
            'Date_Achat', 
            'Heure_Achat',
            'Nom_Participant',
            'Email',
            'Telephone',
            'Type_Ticket',
            'Quantite',
            'Prix_Unitaire_EUR',
            'Statut',
            'Evenement'
        ].join(',');
        
        // Données CSV
        const csvData = results.map(row => [
            row.ticket_id,
            row.transaction_id,
            row.date_achat,
            row.heure_achat,
            `"${row.participant}"`,
            row.email,
            row.telephone,
            row.type_ticket.toUpperCase(),
            row.quantite,
            row.prix_unitaire,
            row.statut,
            `"${row.evenement}"`
        ].join(',')).join('\n');
        
        const csvContent = csvHeader + '\n' + csvData;
        
        // Nom de fichier avec période
        const filename = `GM_MOUELA_${periodeName}_${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.write('\ufeff'); // BOM UTF-8
        res.end(csvContent);
        
        console.log(` Rapport ${periodeName} généré: ${results.length} tickets`);
    });
});

// Route pour résumé financier CSV
router.get('/reports/financial-csv', (req, res) => {
    console.log('💰 Génération rapport financier CSV...');
    
    const query = `
        SELECT 
            DATE_FORMAT(t.date_creation, '%Y-%m-%d') as date_vente,
            t.type as type_ticket,
            COUNT(*) as nombre_tickets,
            FORMAT(SUM(t.montant), 2) as revenus_total,
            FORMAT(AVG(t.montant), 2) as prix_moyen,
            GROUP_CONCAT(t.transaction_id) as transactions
        FROM tickets t
        WHERE t.statut = 'confirmed'
        GROUP BY DATE(t.date_creation), t.type
        ORDER BY date_vente DESC, t.type
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(' Erreur rapport financier:', err);
            return res.status(500).json({
                success: false,
                error: "Erreur serveur"
            });
        }
        
        // En-tête financier
        const csvHeader = [
            'Date_Vente',
            'Type_Ticket',
            'Nombre_Tickets',
            'Revenus_Total_EUR',
            'Prix_Moyen_EUR',
            'Transactions_IDs'
        ].join(',');
        
        // Données financières
        const csvData = results.map(row => [
            row.date_vente,
            row.type_ticket.toUpperCase(),
            row.nombre_tickets,
            row.revenus_total,
            row.prix_moyen,
            `"${row.transactions}"`
        ].join(',')).join('\n');
        
        const csvContent = csvHeader + '\n' + csvData;
        
        const filename = `GM_MOUELA_Rapport_Financier_${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.write('\ufeff');
        res.end(csvContent);
        
        console.log(` Rapport financier généré: ${filename}`);
    });
});
module.exports = router;