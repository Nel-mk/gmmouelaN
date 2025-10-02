// services/emailService.js - Version SendGrid pour Render

const sgMail = require('@sendgrid/mail');
const { genererQRTicket } = require('./qrService');

// Configuration SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Template HTML du ticket avec QR Codes
const createTicketEmailHTML = (ticketData, qrCodes) => {
    const { participants, concert, transactionId, totalAmount, ticketType } = ticketData;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vos Tickets GM MOUELA avec QR Codes</title>
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
            .qr-ticket {
                background: #f8f9fa;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #ff6b35;
                border-radius: 0 8px 8px 0;
                text-align: center;
            }
            .qr-ticket h4 {
                margin: 0 0 15px 0;
                color: #ff6b35;
                font-size: 18px;
            }
            .qr-attachment-info {
                background: #e8f5e8;
                border: 2px dashed #4caf50;
                padding: 20px;
                margin: 15px 0;
                border-radius: 8px;
                text-align: center;
            }
            .attachment-icon {
                font-size: 48px;
                margin-bottom: 10px;
                display: block;
            }
            .attachment-name {
                font-weight: bold;
                color: #2e7d32;
                font-size: 16px;
                margin-bottom: 5px;
            }
            .attachment-instruction {
                color: #666;
                font-size: 14px;
            }
            .qr-instructions {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                font-size: 14px;
            }
            .qr-instructions h3 {
                color: #1976d2;
                margin: 0 0 10px 0;
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
            <div class="header">
                <div class="logo">🎵 GM MOUELA</div>
                <div class="subtitle">Vos tickets avec QR Codes</div>
            </div>

            <h2> Félicitations ${participants[0].nom} !</h2>
            <p>Votre commande a été confirmée avec succès. Vos QR Codes sont en pièces jointes de cet email !</p>

            <div class="qr-instructions">
                <h3> Vos QR Codes sont en pièces jointes !</h3>
                <ul>
                    <li> Pièces jointes : Téléchargez les images QR Code ci-dessous</li>
                    <li> Sur téléphone : Sauvegardez les images QR dans vos photos</li>
                    <li> Impression : Imprimez les QR Codes sur papier</li>
                    <li> À l'entrée : Montrez votre QR Code (écran ou papier)</li>
                    <li>⚡ Rapide : Scan en 2 secondes</li>
                </ul>
            </div>

            <div class="ticket-info">
                <h2>${concert.nom}</h2>
                <p><strong> Date :</strong> ${new Date(concert.date_debut).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</p>
                <p><strong> Lieu :</strong> ${concert.lieu}</p>
            </div>

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

            <h3 style="color: #ff6b35;">🎫 Vos QR Codes (Pièces jointes)</h3>
            ${participants.map((participant, index) => {
                const qrCode = qrCodes[index];
                return `
                <div class="qr-ticket">
                    <h4> Ticket ${index + 1} - ${participant.nom}</h4>
                    <p><strong>Type :</strong> ${ticketType.toUpperCase()}</p>
                    <p><strong>Email :</strong> ${participant.email}</p>
                    <p><strong>Téléphone :</strong> ${participant.telephone}</p>
                    
                    ${qrCode && qrCode.qrImage ? `
                        <div class="qr-attachment-info">
                            <span class="attachment-icon">📎</span>
                            <div class="attachment-name">QR_${participant.nom.replace(/\s+/g, '_')}_${ticketType.toUpperCase()}.png</div>
                            <div class="attachment-instruction">
                                QR Code en pièce jointe de cet email<br>
                                <strong>ID:</strong> ${qrCode.qrText}
                            </div>
                        </div>
                    ` : `
                        <div style="background: #ffebee; color: #c62828; padding: 15px; border-radius: 5px;">
                            Erreur génération QR Code - Contactez le support
                        </div>
                    `}
                </div>
                `;
            }).join('')}

            <div class="important-info">
                <h3> Instructions importantes</h3>
                <ul>
                    <li> Téléchargez les QR Codes depuis les pièces jointes</li>
                    <li> Sauvegardez les images QR sur votre téléphone</li>
                    <li> OU imprimez cette page avec les QR Codes</li>
                    <li>Un QR par personne - Chaque participant doit avoir son QR</li>
                    <li>Arrivée : 30 minutes avant pour éviter la queue</li>
                    <li>Pièce d'identité : Obligatoire + QR Code</li>
                </ul>
            </div>

            <div class="support">
                <h3> Besoin d'aide ?</h3>
                <p>Pour toute question concernant vos QR Codes ou votre commande :</p>
                <p><strong>Email :</strong> gmmouela@gmail.com</p>
                <p><strong>Référence :</strong> ${transactionId}</p>
                <p><strong>Problème QR Codes :</strong> Vérifiez vos pièces jointes d'abord !</p>
            </div>

            <div class="footer">
                <p> À bientôt au concert GM MOUELA ! </p>
                <p style="color: #999; font-size: 12px;">
                    GM MOUELA - Concert Presentation<br>
                    QR Codes en pièces jointes - Système sécurisé
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Fonction principale d'envoi avec SendGrid
const sendTicketEmail = async (ticketData) => {
    try {
        console.log(' Préparation envoi email tickets avec SendGrid...');
        
        // ÉTAPE 1 : Générer les QR Codes
        console.log(' Génération des QR Codes...');
        const qrCodes = [];
        const attachments = [];
        
        for (let i = 0; i < ticketData.participants.length; i++) {
            const participant = ticketData.participants[i];
            
            const qrData = {
                id: participant.id || (Date.now() + i),
                nom: participant.nom,
                type: ticketData.ticketType,
                transaction_id: ticketData.transactionId
            };
            
            console.log(`    QR Code ${i + 1}/${ticketData.participants.length} pour ${participant.nom}...`);
            
            const qrResult = await genererQRTicket(qrData);
            
            if (qrResult.success !== false) {
                qrCodes.push(qrResult);
                
                const base64Data = qrResult.qrImage.replace(/^data:image\/png;base64,/, '');
                const filename = `QR_${participant.nom.replace(/\s+/g, '_')}_${ticketData.ticketType.toUpperCase()}.png`;
                
                attachments.push({
                    content: base64Data,
                    filename: filename,
                    type: 'image/png',
                    disposition: 'attachment'
                });
                
                console.log(`    QR Code généré et ajouté: ${filename}`);
            } else {
                console.error(`    Erreur QR Code pour ${participant.nom}:`, qrResult.error);
                qrCodes.push({
                    qrImage: null,
                    qrText: 'ERREUR_GENERATION',
                    error: qrResult.error
                });
            }
        }
        
        console.log(` QR Codes générés: ${qrCodes.filter(qr => qr.qrImage).length}/${ticketData.participants.length}`);
        
        // ÉTAPE 2 : Détails du concert
        const concertInfo = {
            nom: 'GM MOUELA CONCERT PRESENTATION',
            date_debut: '2025-12-13 15:00:00',
            lieu: 'TEATRO MOLARCHI'
        };
        
        const emailData = {
            participants: ticketData.participants,
            concert: concertInfo,
            transactionId: ticketData.transactionId,
            totalAmount: ticketData.amount,
            ticketType: ticketData.ticketType
        };
        
        // ÉTAPE 3 : Configuration email SendGrid
        const msg = {
            to: ticketData.participants.map(p => p.email),
            from: {
                email: 'gmmouela@gmail.com',
                name: 'GM MOUELA - Tickets & QR Codes'
            },
            subject: ` Vos tickets GM MOUELA avec QR Codes - ${ticketData.transactionId}`,
            html: createTicketEmailHTML(emailData, qrCodes),
            text: `
Bonjour ${ticketData.participants[0].nom},

Vos tickets GM MOUELA avec QR Codes sont prêts !

 IMPORTANT : Les QR Codes sont en PIÈCES JOINTES de cet email
 Téléchargez les fichiers PNG et sauvegardez-les sur votre téléphone

Détails :
- Transaction : ${ticketData.transactionId}  
- Type : ${ticketData.ticketType.toUpperCase()}
- Nombre : ${ticketData.participants.length} ticket(s)
- Montant : ${parseFloat(ticketData.amount).toFixed(2)} €

Concert : GM MOUELA CONCERT PRESENTATION
Date : 13 décembre 2025 à 15h00
Lieu : TEATRO MOLARCHI

 INSTRUCTIONS : 
1. Téléchargez les QR Codes (pièces jointes)
2. Sauvegardez sur votre téléphone OU imprimez
3. Montrez à l'entrée (QR Code obligatoire)

Besoin d'aide ? gmmouela@gmail.com

GM MOUELA
            `,
            attachments: attachments
        };
        
        // ÉTAPE 4 : Envoi via SendGrid
        await sgMail.send(msg);
        
        console.log(' Email envoyé avec succès via SendGrid !');
        console.log(' Destinataires:', ticketData.participants.map(p => p.email).join(', '));
        console.log(' Pièces jointes:', attachments.length);
        
        return {
            success: true,
            recipients: ticketData.participants.map(p => p.email),
            qrCodesGenerated: qrCodes.length,
            qrCodesSuccess: qrCodes.filter(qr => qr.qrImage).length,
            attachments: attachments.length
        };
        
    } catch (error) {
        console.error(' Erreur envoi email SendGrid:', error);
        
        if (error.response) {
            console.error('SendGrid Error:', error.response.body);
        }
        
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
};

// Test de configuration (optionnel)
const testEmailConfig = async () => {
    if (!process.env.SENDGRID_API_KEY) {
        console.error(' SENDGRID_API_KEY non définie');
        return false;
    }
    console.log(' SendGrid API Key configurée');
    return true;
};

module.exports = {
    sendTicketEmail,
    testEmailConfig
};