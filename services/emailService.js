// services/emailService.js - Version avec QR Codes en pièces jointes

const nodemailer = require('nodemailer');
const { genererQRTicket } = require('./qrService');

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASSWORD
        }
    });
};

// 🎓 LEÇON : Template HTML modifié pour référencer les QR Codes en pièces jointes
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
            
            /* 🎓 NOUVEAU : Styles pour QR Code en pièce jointe */
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
            <!-- Header -->
            <div class="header">
                <div class="logo">🎵 GM MOUELA</div>
                <div class="subtitle">Vos tickets avec QR Codes</div>
            </div>

            <!-- Bienvenue -->
            <h2> Félicitations ${participants[0].nom} !</h2>
            <p>Votre commande a été confirmée avec succès. Vos QR Codes sont en <strong>pièces jointes</strong> de cet email !</p>

            <!--  NOUVEAU : Instructions QR Codes en pièces jointes -->
            <div class="qr-instructions">
                <h3>📱 Vos QR Codes sont en pièces jointes !</h3>
                <ul>
                    <li><strong>📎 Pièces jointes :</strong> Téléchargez les images QR Code ci-dessous</li>
                    <li><strong> Sur téléphone :</strong> Sauvegardez les images QR dans vos photos</li>
                    <li><strong> Impression :</strong> Imprimez les QR Codes sur papier</li>
                    <li><strong>✅ À l'entrée :</strong> Montrez votre QR Code (écran ou papier)</li>
                </ul>
            </div>

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
                <p><strong> Lieu :</strong> ${concert.lieu}</p>
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

            <!-- 🎓 NOUVEAU : Liste des QR Codes en pièces jointes -->
            <h3 style="color: #ff6b35;"> Vos QR Codes (Pièces jointes)</h3>
            ${participants.map((participant, index) => {
                const qrCode = qrCodes[index];
                return `
                <div class="qr-ticket">
                    <h4> Ticket ${index + 1} - ${participant.nom}</h4>
                    <p><strong>Type :</strong> ${ticketType.toUpperCase()}</p>
                    <p><strong>Email :</strong> ${participant.email}</p>
                    <p><strong>Téléphone :</strong> ${participant.telephone}</p>
                    
                    <!-- Information sur la pièce jointe QR Code -->
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
                            ⚠️ Erreur génération QR Code - Contactez le support
                        </div>
                    `}
                </div>
                `;
            }).join('')}

            <!-- Informations importantes -->
            <div class="important-info">
                <h3>⚠️ Instructions importantes</h3>
                <ul>
                    <li><strong> Téléchargez</strong> les QR Codes depuis les pièces jointes</li>
                    <li><strong> Sauvegardez</strong> les images QR sur votre téléphone</li>
                    <li><strong> OU imprimez</strong> cette page avec les QR Codes</li>
                    <li><strong>Un QR par personne</strong> - Chaque participant doit avoir son QR</li>
                    <li><strong>Pièce d'identité :</strong> Obligatoire + QR Code</li>
                </ul>
            </div>

            <!-- Support -->
            <div class="support">
                <h3>🆘 Besoin d'aide ?</h3>
                <p>Pour toute question concernant vos QR Codes ou votre commande :</p>
                <p><strong>Email :</strong> gmmouela@gmail.com</p>
                <p><strong>Référence :</strong> ${transactionId}</p>
                <p><strong>Problème QR Codes :</strong> Vérifiez vos pièces jointes d'abord !</p>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>🎵 À bientôt au concert GM MOUELA ! 🎵</p>
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

// 🎓 LEÇON : Fonction principale avec QR Codes en pièces jointes
const sendTicketEmail = async (ticketData) => {
    try {
        console.log(' Préparation envoi email tickets avec QR Codes en pièces jointes...');
        
        const transporter = createTransporter();
        
        // ÉTAPE 1 : Générer les QR Codes pour chaque participant
        console.log(' Génération des QR Codes...');
        const qrCodes = [];
        const attachments = []; // ← NOUVEAU : Pour les pièces jointes
        
        for (let i = 0; i < ticketData.participants.length; i++) {
            const participant = ticketData.participants[i];
            
            // Créer les données pour le QR Code
            const qrData = {
                id: participant.ticketId || (Date.now() + i),
                nom: participant.nom,
                type: ticketData.ticketType,
                transaction_id: ticketData.transactionId
            };
            
            console.log(`    QR Code ${i + 1}/${ticketData.participants.length} pour ${participant.nom}...`);
            
            // Générer le QR Code
            const qrResult = await genererQRTicket(qrData);
            
            if (qrResult.success !== false) {
                qrCodes.push(qrResult);
                
                // 🎓 NOUVEAU : Ajouter le QR Code comme pièce jointe
                // Extraire les données base64 de l'image
                const base64Data = qrResult.qrImage.replace(/^data:image\/png;base64,/, '');
                
                // Nom du fichier QR Code
                const filename = `QR_${participant.nom.replace(/\s+/g, '_')}_${ticketData.ticketType.toUpperCase()}.png`;
                
                // Ajouter aux pièces jointes
                attachments.push({
                    filename: filename,
                    content: base64Data,
                    encoding: 'base64',
                    cid: `qr_${i}` // ID unique pour référencer dans le HTML si besoin
                });
                
                console.log(`    QR Code généré et ajouté en pièce jointe: ${filename}`);
            } else {
                console.error(`   ❌ Erreur QR Code pour ${participant.nom}:`, qrResult.error);
                qrCodes.push({
                    qrImage: null,
                    qrText: 'ERREUR_GENERATION',
                    error: qrResult.error
                });
            }
        }
        
        console.log(` QR Codes générés: ${qrCodes.filter(qr => qr.qrImage).length}/${ticketData.participants.length}`);
        console.log(` Pièces jointes créées: ${attachments.length}`);
        
        // ÉTAPE 2 : Récupérer les détails du concert
        const concertInfo = {
            nom: 'GM MOUELA CONCERT PRESENTATION',
            date_debut: '2025-12-13 15:00:00',
            lieu: 'TEATRO MOLARCHI'
        };
        
        // ÉTAPE 3 : Préparer les données pour le template
        const emailData = {
            participants: ticketData.participants,
            concert: concertInfo,
            transactionId: ticketData.transactionId,
            totalAmount: ticketData.amount,
            ticketType: ticketData.ticketType
        };
        
        // ÉTAPE 4 : Configuration de l'email avec pièces jointes
        const mailOptions = {
            from: {
                name: 'GM MOUELA - Tickets & QR Codes',
                address: process.env.GMAIL_USER
            },
            to: ticketData.participants.map(p => p.email).join(', '),
            subject: ` Vos tickets GM MOUELA avec QR Codes - ${ticketData.transactionId}`,
            
            // HTML avec références aux pièces jointes
            html: createTicketEmailHTML(emailData, qrCodes),
            
            // 🎓 NOUVEAU : Pièces jointes avec les QR Codes
            attachments: attachments,
            
            // Version texte améliorée
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

QR Codes en pièces jointes :
${ticketData.participants.map((p, i) => `${i + 1}. QR_${p.nom.replace(/\s+/g, '_')}_${ticketData.ticketType.toUpperCase()}.png`).join('\n')}

⚠️ INSTRUCTIONS : 
1. Téléchargez les QR Codes (pièces jointes)
2. Sauvegardez sur votre téléphone OU imprimez
3. Montrez à l'entrée (QR Code obligatoire)

Besoin d'aide ? gmmouela@gmail.com

GM MOUELA - QR Codes en pièces jointes
            `
        };
        
        // ÉTAPE 5 : Envoi de l'email avec pièces jointes
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Email avec QR Codes (pièces jointes) envoyé avec succès !');
        console.log(' Message ID:', info.messageId);
        console.log(' Destinataires:', ticketData.participants.map(p => p.email).join(', '));
        console.log(' Pièces jointes:', attachments.length);
        console.log(' QR Codes attachés:', attachments.map(att => att.filename).join(', '));
        
        return {
            success: true,
            messageId: info.messageId,
            recipients: ticketData.participants.map(p => p.email),
            qrCodesGenerated: qrCodes.length,
            qrCodesSuccess: qrCodes.filter(qr => qr.qrImage).length,
            attachments: attachments.length,
            attachmentNames: attachments.map(att => att.filename)
        };
        
    } catch (error) {
        console.error('❌ Erreur envoi email avec QR Codes (pièces jointes):', error);
        
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
};

const testEmailConfig = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('Configuration email validée !');
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