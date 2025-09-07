
// services/emailService.js
const nodemailer = require('nodemailer');

// Configuration du transporteur Gmail
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASSWORD // Mot de passe d'application ou mot de passe normal
        }
    });
};

// Template HTML du ticket
const createTicketEmailHTML = (ticketData) => {
    const { participants, concert, transactionId, totalAmount, ticketType } = ticketData;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vos Tickets GM MOUELA</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                border-bottom: 3px solid #ff6b35;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #ff6b35;
                margin-bottom: 10px;
            }
            .subtitle {
                color: #666;
                font-size: 16px;
            }
            .ticket-info {
                background: linear-gradient(135deg, #ff6b35, #f7931e);
                color: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .ticket-info h2 {
                margin: 0 0 15px 0;
                font-size: 24px;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #eee;
            }
            .detail-row:last-child {
                border-bottom: none;
                font-weight: bold;
                background: #f8f9fa;
                margin: 10px -15px -15px -15px;
                padding: 15px;
            }
            .participant {
                background: #f8f9fa;
                padding: 15px;
                margin: 10px 0;
                border-left: 4px solid #ff6b35;
                border-radius: 0 5px 5px 0;
            }
            .participant h4 {
                margin: 0 0 10px 0;
                color: #ff6b35;
            }
            .important-info {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
            }
            .important-info h3 {
                color: #856404;
                margin: 0 0 10px 0;
            }
            .footer {
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .support {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            @media (max-width: 600px) {
                .detail-row {
                    flex-direction: column;
                }
                .container {
                    padding: 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="logo">🎵 GM MOUELA</div>
                <div class="subtitle">Confirmation d'achat de tickets</div>
            </div>

            <!-- Bienvenue -->
            <h2>🎫 Félicitations ${participants[0].nom} !</h2>
            <p>Votre commande a été confirmée avec succès. Voici les détails de vos tickets :</p>

            <!-- Info Concert -->
            <div class="ticket-info">
                <h2>${concert.nom}</h2>
                <p><strong>📅 Date :</strong> ${new Date(concert.date_debut).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
                <p><strong>📍 Lieu :</strong> ${concert.lieu}</p>
            </div>

            <!-- Détails Commande -->
            <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #ff6b35;">📋 Détails de votre commande</h3>
                
                <div class="detail-row">
                    <span>ID Transaction :</span>
                    <span><strong>${transactionId}</strong></span>
                </div>
                <div class="detail-row">
                    <span>Type de ticket :</span>
                    <span><strong>${ticketType.toUpperCase()}</strong></span>
                </div>
                <div class="detail-row">
                    <span>Nombre de tickets :</span>
                    <span><strong>${participants.length}</strong></span>
                </div>
                <div class="detail-row">
                    <span>Montant total :</span>
                    <span><strong>${parseFloat(totalAmount).toFixed(2)} €</strong></span>
                </div>
            </div>

            <!-- Liste des Participants -->
            <h3 style="color: #ff6b35;">👥 Participants</h3>
            ${participants.map((p, index) => `
                <div class="participant">
                    <h4>🎫 Ticket ${index + 1}</h4>
                    <p><strong>Nom :</strong> ${p.nom}</p>
                    <p><strong>Email :</strong> ${p.email}</p>
                    <p><strong>Téléphone :</strong> ${p.telephone}</p>
                </div>
            `).join('')}

            <!-- Informations importantes -->
            <div class="important-info">
                <h3>⚠️ Informations importantes</h3>
                <ul>
                    <li><strong>Conservez cet email</strong> - Il fait office de preuve d'achat</li>
                    <li><strong>Arrivée :</strong> Présentez-vous 30 minutes avant le début</li>
                    <li><strong>Pièce d'identité :</strong> Obligatoire à l'entrée</li>
                    <li><strong>Transfert :</strong> Les tickets ne sont pas transférables</li>
                </ul>
            </div>

            <!-- Support -->
            <div class="support">
                <h3>🆘 Besoin d'aide ?</h3>
                <p>Pour toute question concernant votre commande, contactez-nous :</p>
                <p><strong>Email :</strong> gmmouela@gmail.com</p>
                <p><strong>Référence :</strong> ${transactionId}</p>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>Merci pour votre confiance ! 🎵</p>
                <p style="color: #999; font-size: 12px;">
                    GM MOUELA - Concert Presentation<br>
                    Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Fonction principale d'envoi de tickets par email
const sendTicketEmail = async (ticketData) => {
    try {
        console.log('📧 Préparation envoi email tickets...');
        
        const transporter = createTransporter();
        
        // Récupérer les détails du concert
        const concertInfo = {
            nom: 'GM MOUELA CONCERT PRESENTATION',
            date_debut: '2025-12-13 15:00:00',
            lieu: 'TEATRO MOLARCHI'
        };
        
        // Préparer les données pour le template
        const emailData = {
            participants: ticketData.participants,
            concert: concertInfo,
            transactionId: ticketData.transactionId,
            totalAmount: ticketData.amount,
            ticketType: ticketData.ticketType
        };
        
        // Configuration de l'email
        const mailOptions = {
            from: {
                name: 'GM MOUELA - Tickets',
                address: process.env.GMAIL_USER
            },
            to: ticketData.participants.map(p => p.email).join(', '),
            subject: `🎫 Vos tickets GM MOUELA - Transaction ${ticketData.transactionId}`,
            html: createTicketEmailHTML(emailData),
            // Version texte simple en fallback
            text: `
Bonjour ${ticketData.participants[0].nom},

Votre commande de tickets GM MOUELA a été confirmée !

Détails :
- Transaction : ${ticketData.transactionId}
- Type : ${ticketData.ticketType.toUpperCase()}
- Nombre : ${ticketData.participants.length} ticket(s)
- Montant : ${parseFloat(ticketData.amount).toFixed(2)} €

Concert : GM MOUELA CONCERT PRESENTATION
Date : 13 décembre 2025 à 15h00
Lieu : TEATRO MOLARCHI

Participants :
${ticketData.participants.map((p, i) => `${i + 1}. ${p.nom} (${p.email})`).join('\n')}

Conservez cet email comme preuve d'achat.

Merci pour votre confiance !
GM MOUELA
            `
        };
        
        // Envoi de l'email
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Email envoyé avec succès !');
        console.log('📧 Message ID:', info.messageId);
        console.log('👥 Destinataires:', ticketData.participants.map(p => p.email).join(', '));
        
        return {
            success: true,
            messageId: info.messageId,
            recipients: ticketData.participants.map(p => p.email)
        };
        
    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
        
        // Log détaillé pour debug
        if (error.code === 'EAUTH') {
            console.error('🔐 Problème d\'authentification Gmail - Vérifiez vos identifiants');
        } else if (error.code === 'ENOTFOUND') {
            console.error('🌐 Problème de connexion réseau');
        }
        
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
};

// Test de la configuration email
const testEmailConfig = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('✅ Configuration email validée !');
        return true;
    } catch (error) {
        console.error('❌ Erreur configuration email:', error.message);
        return false;
    }
};

module.exports = {
    sendTicketEmail,
    testEmailConfig
};