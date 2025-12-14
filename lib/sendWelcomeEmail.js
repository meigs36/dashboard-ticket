// lib/sendWelcomeEmail.js
// Funzione per inviare email di benvenuto tramite n8n

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8nsimpro.simulationproject.it/webhook';

/**
 * Invia email di benvenuto con credenziali al nuovo utente del portale
 * @param {Object} userData - Dati dell'utente
 * @param {string} userData.email - Email di accesso
 * @param {string} userData.password - Password generata
 * @param {string} userData.nome - Nome utente
 * @param {string} userData.cognome - Cognome utente
 * @param {string} userData.ragione_sociale - Ragione sociale cliente
 * @param {string} userData.telefono - Telefono (opzionale)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendWelcomeEmail(userData) {
  try {
    console.log('📧 Invio email benvenuto a:', userData.email);
    
    const response = await fetch(`${N8N_WEBHOOK_URL}/customer-welcome-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        nome: userData.nome || '',
        cognome: userData.cognome || '',
        ragione_sociale: userData.ragione_sociale,
        telefono: userData.telefono || '',
        ruolo: userData.ruolo_aziendale || 'Referente',
        portal_url: 'https://gestionale.odonto-service.it/portal'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Email benvenuto inviata:', result);
    
    return { success: true, message: 'Email inviata con successo' };
    
  } catch (error) {
    console.error('❌ Errore invio email benvenuto:', error);
    return { success: false, message: error.message };
  }
}

export default sendWelcomeEmail;
