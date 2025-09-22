const express = require('express');
const router = express.Router();
const pool = require('../db'); // Pool PostgreSQL
const { sendTicketEmail } = require('../services/emailService');

// Middleware de validation
const validateTicketData = (req, res, next) => {
    const { ticketType, quantity, transactionId, amount, participants } = req.body;
    
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
    
    for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        if (!p.nom || !p.email || !p.tel) {
            return res.status(400).json({
                success: false,
                error: `Données manquantes pour le participant ${i + 1}`
            });
        }
        
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

// Fonction de vérification du stock (adaptée PostgreSQL)
const verifyStockAvailability = async (ticketType, quantity) => {
    try {
        console.log(`🔍 Vérification stock: ${quantity} places ${ticketType}`);
        
        const stockQuery = `
            SELECT 
                e.places_${ticketType}_total as total_places,
                COALESCE(SUM(t.quantite), 0) as places_vendues,
                (e.places_${ticketType}_total - COALESCE(SUM(t.quantite), 0)) as places_disponibles
            FROM evenements e
            LEFT JOIN tickets t ON e.id = t.evenement_id 
                AND t.type = $1 
                AND t.statut = 'confirmed'
            WHERE e.id = 1
            GROUP BY e.id, e.places_${ticketType}_total
        `;
        
        const result = await pool.query(stockQuery, [ticketType]);
        
        if (result.rows.length === 0) {
            throw new Error('Événement non trouvé');
        }
        
        const stockInfo = result.rows[0];
        console.log('📊 Info stock:', stockInfo);
        
        const stockSuffisant = stockInfo.places_disponibles >= quantity;
        
        return {
            available: stockSuffisant,
            totalPlaces: stockInfo.total_places,
            placesVendues: stockInfo.places_vendues,
            placesDisponibles: stockInfo.places_disponibles,
            quantiteDemandee: quantity
        };
        
    } catch (error) {
        console.error('❌ Erreur vérification stock:', error);
        throw error;
    }
};

// Transaction atomique sécurisée (adaptée PostgreSQL)
const insertTicketsAtomically = async (ticketType, quantity, transactionId, amount, participants) => {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Début transaction atomique...');
        
        await client.query('BEGIN');
        
        // ÉTAPE 1 : Re-vérifier le stock AVEC VERROU
        const lockQuery = `
            SELECT 
                (e.places_${ticketType}_total - COALESCE(SUM(t.quantite), 0)) as places_disponibles
            FROM evenements e
            LEFT JOIN tickets t ON e.id = t.evenement_id 
                AND t.type = $1 
                AND t.statut = 'confirmed'
            WHERE e.id = 1
            GROUP BY e.id
            FOR UPDATE
        `;
        
        const lockResult = await client.query(lockQuery, [ticketType]);
        
        if (lockResult.rows.length === 0) {
            throw new Error('Événement non trouvé');
        }
        
        const placesDisponibles = lockResult.rows[0].places_disponibles;
        
        if (placesDisponibles < quantity) {
            throw new Error(`Stock insuffisant: ${placesDisponibles} places disponibles, ${quantity} demandées`);
        }
        
        // ÉTAPE 2 : Insérer tous les tickets
        const insertQuery = `
            INSERT INTO tickets (evenement_id, type, quantite, nom, email, telephone, transaction_id, montant, statut)
            VALUES (1, $1, 1, $2, $3, $4, $5, $6, 'confirmed')
            RETURNING id
        `;
        
        const pricePerTicket = parseFloat(amount) / parseInt(quantity);
        const insertedTickets = [];
        
        for (let i = 0; i < participants.length; i++) {
            const participant = participants[i];
            const ticketResult = await client.query(insertQuery, [
                ticketType,
                participant.nom.trim(),
                participant.email.trim().toLowerCase(),
                participant.tel.trim(),
                transactionId,
                pricePerTicket
            ]);
            
            insertedTickets.push({
                id: ticketResult.rows[0].id,
                ...participant
            });
            
            console.log(`✅ Participant ${i + 1} enregistré: ${participant.nom}`);
        }
        
        await client.query('COMMIT');
        
        console.log(`🎉 Transaction confirmée: ${insertedTickets.length} tickets pour ${transactionId}`);
        
        return {
            success: true,
            ticketsInserted: insertedTickets.length,
            transactionId: transactionId,
            tickets: insertedTickets
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur transaction:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Route principale (adaptée PostgreSQL)
router.post('/', validateTicketData, async (req, res) => {
    const { ticketType, quantity, transactionId, amount, participants } = req.body;
    
    console.log('📝 Enregistrement de ticket avec vérification stock:', {
        type: ticketType,
        quantity: quantity,
        transactionId: transactionId,
        amount: amount,
        participantsCount: participants.length
    });
    
    try {
        // ÉTAPE 1 : Vérifier si la transaction existe déjà
        const checkQuery = 'SELECT COUNT(*) as count FROM tickets WHERE transaction_id = $1';
        const checkResult = await pool.query(checkQuery, [transactionId]);
        
        if (checkResult.rows[0].count > 0) {
            console.log('⚠️ Transaction déjà enregistrée:', transactionId);
            return res.status(409).json({
                success: false,
                error: "Cette transaction a déjà été enregistrée"
            });
        }
        
        // ÉTAPE 2 : Vérification du stock
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
        
        console.log('✅ Stock vérifié - Places disponibles:', stockVerification.placesDisponibles);
        
        // ÉTAPE 3 : Insertion atomique sécurisée
        const insertResult = await insertTicketsAtomically(
            ticketType, 
            parseInt(quantity), 
            transactionId, 
            amount, 
            participants
        );
        
        // ÉTAPE 4 : Envoyer email automatiquement
        try {
            const emailResult = await sendTicketEmail({
                participants: participants,
                transactionId: transactionId,
                amount: amount,
                ticketType: ticketType
            });
            
            if (emailResult.success) {
                console.log('📧 Email envoyé avec succès');
            } else {
                console.error('❌ Échec envoi email:', emailResult.error);
            }
        } catch (emailError) {
            console.error('❌ Erreur envoi email:', emailError);
            // On continue même si l'email échoue
        }
        
        // SUCCÈS
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
        console.error('❌ Erreur lors du traitement:', error);
        
        if (error.message.includes('Stock insuffisant')) {
            return res.status(409).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: "Erreur serveur lors de l'enregistrement",
            details: error.message
        });
    }
});

// Route stock en temps réel (adaptée PostgreSQL)
router.get('/stock', async (req, res) => {
    try {
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
        
        const result = await pool.query(stockQuery);
        
        res.json({
            success: true,
            stock: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération stock:', error);
        res.status(500).json({
            success: false,
            error: "Erreur serveur"
        });
    }
});

// Route transaction (adaptée PostgreSQL)
router.get('/transaction/:transactionId', async (req, res) => {
    const transactionId = req.params.transactionId;
    
    try {
        const query = `
            SELECT id, evenement_id, type, nom, email, telephone, montant, statut, date_creation
            FROM tickets
            WHERE transaction_id = $1
            ORDER BY date_creation ASC
        `;
        
        const result = await pool.query(query, [transactionId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Transaction non trouvée"
            });
        }
        
        res.json({
            success: true,
            tickets: result.rows,
            totalTickets: result.rows.length
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la récupération:', error);
        res.status(500).json({
            success: false,
            error: "Erreur serveur"
        });
    }
});

// Route stats (adaptée PostgreSQL)
router.get('/stats', async (req, res) => {
    try {
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
        
        const result = await pool.query(query);
        
        const totalGeneral = result.rows.reduce((sum, row) => sum + parseFloat(row.revenus_total), 0);
        const ticketsTotal = result.rows.reduce((sum, row) => sum + parseInt(row.nombre_tickets), 0);
        
        res.json({
            success: true,
            stats: result.rows,
            resume: {
                total_revenus: totalGeneral,
                total_tickets: ticketsTotal
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur statistiques:', error);
        res.status(500).json({
            success: false,
            error: "Erreur serveur"
        });
    }
});

// Routes rapports CSV (adaptées PostgreSQL)
router.get('/reports/csv', async (req, res) => {
    console.log('📊 Génération rapport CSV complet...');
    
    try {
        const query = `
            SELECT 
                t.id as ticket_id,
                t.transaction_id,
                TO_CHAR(t.date_creation, 'YYYY-MM-DD') as date_achat,
                TO_CHAR(t.date_creation, 'HH24:MI:SS') as heure_achat,
                t.nom as participant,
                t.email,
                t.telephone,
                t.type as type_ticket,
                t.quantite,
                t.montant as prix_unitaire,
                t.statut,
                e.nom as evenement,
                TO_CHAR(e.date_debut, 'YYYY-MM-DD HH24:MI') as date_concert
            FROM tickets t
            JOIN evenements e ON t.evenement_id = e.id
            WHERE t.statut = 'confirmed'
            ORDER BY t.date_creation DESC
        `;
        
        const result = await pool.query(query);
        
        // Générer CSV
        const csvHeader = [
            'ID_Ticket', 'Transaction_ID', 'Date_Achat', 'Heure_Achat',
            'Nom_Participant', 'Email', 'Telephone', 'Type_Ticket',
            'Quantite', 'Prix_Unitaire_EUR', 'Statut', 'Evenement', 'Date_Concert'
        ].join(',');
        
        const csvData = result.rows.map(row => [
            row.ticket_id, row.transaction_id, row.date_achat, row.heure_achat,
            `"${row.participant}"`, row.email, row.telephone, row.type_ticket.toUpperCase(),
            row.quantite, row.prix_unitaire, row.statut, `"${row.evenement}"`, row.date_concert
        ].join(',')).join('\n');
        
        const csvContent = csvHeader + '\n' + csvData;
        const filename = `GM_MOUELA_Rapport_${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.write('\ufeff');
        res.end(csvContent);
        
        console.log(`✅ Rapport CSV généré: ${filename} (${result.rows.length} tickets)`);
        
    } catch (error) {
        console.error('❌ Erreur génération CSV:', error);
        res.status(500).json({
            success: false,
            error: "Erreur serveur lors de la génération du rapport"
        });
    }
});

module.exports = router;