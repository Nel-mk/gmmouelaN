const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware de validation
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

// Route pour enregistrer un ticket
router.post('/', validateTicketData, async (req, res) => {
    const { ticketType, quantity, transactionId, amount, participants } = req.body;
    
    console.log('📝 Enregistrement de ticket:', {
        type: ticketType,
        quantity: quantity,
        transactionId: transactionId,
        amount: amount,
        participantsCount: participants.length
    });

    // Vérifier si la transaction existe déjà
    const checkQuery = 'SELECT COUNT(*) as count FROM tickets WHERE transaction_id = ?';
    
    db.query(checkQuery, [transactionId], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('❌ Erreur lors de la vérification:', checkErr);
            return res.status(500).json({ 
                success: false, 
                error: "Erreur serveur lors de la vérification" 
            });
        }

        if (checkResults[0].count > 0) {
            console.log('⚠️ Transaction déjà enregistrée:', transactionId);
            return res.status(409).json({ 
                success: false, 
                error: "Cette transaction a déjà été enregistrée" 
            });
        }

        // Insérer tous les participants
        const insertQuery = `
            INSERT INTO tickets (type, quantite, nom, email, telephone, transaction_id, montant)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        let insertions = 0;
        let errors = [];
        const pricePerTicket = parseFloat(amount)/parseInt(quantity);

        participants.forEach((p, index) => {
            db.query(insertQuery, [
                ticketType, 
                1, //quantity = 1 par participant 
                p.nom.trim(), 
                p.email.trim().toLowerCase(), 
                p.tel.trim(), 
                transactionId, 
                pricePerTicket //Prix par ticket
            ], (err) => {
                if (err) {
                    console.error(`❌ Erreur participant ${index + 1}:`, err);
                    errors.push(`Erreur pour ${p.nom}: ${err.message}`);
                } else {
                    console.log(`✅ Participant ${index + 1} enregistré: ${p.nom}`);
                    insertions++;
                }

                // Vérifier si toutes les insertions sont terminées
                if (insertions + errors.length === participants.length) {
                    if (errors.length > 0) {
                        return res.status(500).json({ 
                            success: false, 
                            error: "Erreurs lors de l'enregistrement",
                            details: errors 
                        });
                    } else {
                        console.log(`🎉 Tous les tickets enregistrés pour la transaction: ${transactionId}`);
                        return res.json({ 
                            success: true,
                            message: `${insertions} ticket(s) enregistré(s) avec succès`,
                            transactionId: transactionId
                        });
                    }
                }
            });
        });
    });
});

// Route pour récupérer les tickets d'une transaction
router.get('/transaction/:transactionId', (req, res) => {
    const transactionId = req.params.transactionId;
    
    const query = `
        SELECT id, type, nom, email, telephone, montant, statut, date_creation
        FROM tickets 
        WHERE transaction_id = ?
        ORDER BY date_creation ASC
    `;

    db.query(query, [transactionId], (err, results) => {
        if (err) {
            console.error('❌ Erreur lors de la récupération:', err);
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

// Route pour les statistiques (admin)
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
            console.error('❌ Erreur statistiques:', err);
            return res.status(500).json({ 
                success: false, 
                error: "Erreur serveur" 
            });
        }

        // Calculer le total général
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

module.exports = router;