import { Router } from 'express';

export const apiRouter = Router();

function getTwilioServerCreds() {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const apiKeySid = (process.env.TWILIO_API_KEY_SID || '').trim();
  const secret = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const fromNumber = (process.env.TWILIO_WHATSAPP_FROM || '+14155238886').trim();
  return { accountSid, apiKeySid, secret, fromNumber };
}

// Health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Twilio status endpoint (NEVER reveals raw secrets)
apiRouter.get('/twilio/status', (_req, res) => {
  const { accountSid, apiKeySid, secret, fromNumber } = getTwilioServerCreds();
  const isConfigured = Boolean(accountSid && secret);
  res.json({
    configured: isConfigured,
    accountSid: accountSid ? `${accountSid.slice(0, 6)}...${accountSid.slice(-4)}` : null,
    apiKeySid: apiKeySid ? `${apiKeySid.slice(0, 6)}...${apiKeySid.slice(-4)}` : null,
    whatsappFrom: fromNumber,
    provider: 'twilio_whatsapp'
  });
});

// Test Twilio connection
apiRouter.post('/twilio/test-connection', async (_req, res) => {
  try {
    const { accountSid, apiKeySid, secret } = getTwilioServerCreds();

    if (!accountSid || !secret) {
      return res.status(400).json({ 
        success: false, 
        error: 'Credenciais da Twilio não configuradas no servidor. Defina TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN nas variáveis de ambiente da hospedagem.' 
      });
    }

    const credentialsToTry = [
      { user: apiKeySid || accountSid, pass: secret },
      { user: accountSid, pass: secret }
    ];

    let lastError = '';
    let accountData: any = null;

    for (const cred of credentialsToTry) {
      const authHeader = 'Basic ' + Buffer.from(`${cred.user}:${cred.pass}`).toString('base64');
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;

      try {
        const response = await fetch(twilioUrl, {
          method: 'GET',
          headers: { 'Authorization': authHeader }
        });

        if (response.ok) {
          accountData = await response.json();
          break;
        } else {
          const errJson = await response.json().catch(() => ({}));
          lastError = errJson.message || `HTTP ${response.status} ${response.statusText}`;
        }
      } catch (e: any) {
        lastError = e.message || 'Erro de conexão';
      }
    }

    if (accountData) {
      return res.json({
        success: true,
        accountSid: accountData.sid,
        friendlyName: accountData.friendly_name,
        status: accountData.status,
        type: accountData.type,
        message: `Conectado com sucesso à conta Twilio: "${accountData.friendly_name}" (Status: ${accountData.status})`
      });
    } else {
      return res.status(401).json({
        success: false,
        error: `Falha na autenticação com a Twilio: ${lastError}`
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Erro interno no servidor: ${err.message}`
    });
  }
});

// Send WhatsApp message via Twilio (server environment credentials only)
apiRouter.post('/twilio/send-whatsapp', async (req, res) => {
  try {
    const { to, message } = req.body || {};

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios ausentes: "to" (destinatário) e "message" (conteúdo)'
      });
    }

    const { accountSid, apiKeySid, secret, fromNumber } = getTwilioServerCreds();

    if (!accountSid || !secret) {
      return res.status(400).json({
        success: false,
        error: 'Serviço Twilio não configurado no servidor. Defina TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN nas variáveis de ambiente.'
      });
    }

    const cleanTo = String(to).replace(/[^0-9]/g, '');
    if (cleanTo.length < 8) {
      return res.status(400).json({
        success: false,
        error: `Número de telefone inválido para envio: ${to}`
      });
    }

    const toFormatted = cleanTo.startsWith('+') ? `whatsapp:${cleanTo}` : `whatsapp:+${cleanTo}`;
    const cleanFrom = fromNumber.replace(/[^0-9+]/g, '');
    const fromFormatted = cleanFrom.startsWith('whatsapp:') 
      ? cleanFrom 
      : (cleanFrom.startsWith('+') ? `whatsapp:${cleanFrom}` : `whatsapp:+${cleanFrom}`);

    const twilioMessagesUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const credentialsToTry = [
      { user: apiKeySid || accountSid, pass: secret },
      { user: accountSid, pass: secret }
    ];

    let twilioResult: any = null;
    let lastErrorData: any = null;

    for (const cred of credentialsToTry) {
      const authHeader = 'Basic ' + Buffer.from(`${cred.user}:${cred.pass}`).toString('base64');
      const formParams = new URLSearchParams();
      formParams.append('To', toFormatted);
      formParams.append('From', fromFormatted);
      formParams.append('Body', String(message));

      try {
        const response = await fetch(twilioMessagesUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formParams.toString()
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          twilioResult = data;
          break;
        } else {
          lastErrorData = data;
        }
      } catch (e: any) {
        lastErrorData = { message: e.message };
      }
    }

    if (twilioResult) {
      return res.json({
        success: true,
        sid: twilioResult.sid,
        status: twilioResult.status,
        to: twilioResult.to,
        from: twilioResult.from,
        dateCreated: twilioResult.date_created,
        message: `Mensagem WhatsApp disparada com sucesso via Twilio (SID: ${twilioResult.sid})`
      });
    } else {
      let userFriendlyError = lastErrorData?.message || 'Falha no envio via Twilio';
      const errorCode = lastErrorData?.code;

      if (errorCode === 63015) {
        userFriendlyError = `Sandbox do Twilio: O número de destino (${to}) ainda não enviou 'join <código>' para o número ${fromFormatted}. No modo Sandbox da Twilio, é obrigatório o opt-in prévio.`;
      } else if (errorCode === 21608) {
        userFriendlyError = `Número não verificado na conta de teste Twilio (${to}).`;
      } else if (errorCode === 21211) {
        userFriendlyError = `Número de telefone inválido formatado (${to}). Verifique o DDI (ex: +244 para Angola).`;
      }

      return res.status(400).json({
        success: false,
        error: userFriendlyError,
        rawError: lastErrorData?.message,
        code: errorCode,
        moreInfo: lastErrorData?.more_info
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Erro ao processar envio: ${err.message}`
    });
  }
});

// ==========================================
// PERSISTENT MULTI-DEVICE AUTH & SYNC ROUTES
// ==========================================

import { 
  authenticateUser, 
  registerCouple, 
  syncWithServer, 
  getServerDb, 
  saveServerDb,
  createActivationRequest,
  getActivationRequests,
  approveActivationRequest,
  rejectActivationRequest
} from './dbStore';

// POST /api/auth/login: Cross-device login check
apiRouter.post('/auth/login', (req, res) => {
  try {
    const { username, pass } = req.body || {};
    const result = authenticateUser(username, pass);
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(401).json(result);
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: `Erro no servidor: ${err.message}` });
  }
});

// POST /api/auth/register: Cross-device registration
apiRouter.post('/auth/register', (req, res) => {
  try {
    const { client, user1, user2 } = req.body || {};
    if (!client || !user1 || !user2) {
      return res.status(400).json({ success: false, error: 'Dados de cadastro incompletos.' });
    }
    const saved = registerCouple(client, user1, user2);
    return res.json({ success: saved, client, user1, user2 });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: `Erro ao salvar cadastro: ${err.message}` });
  }
});

// GET /api/auth/accounts: List accounts (for synchronization)
apiRouter.get('/auth/accounts', (_req, res) => {
  try {
    const db = getServerDb();
    // Return accounts (omit passwords if not admin, or return full for sync)
    return res.json({ success: true, accounts: db.userAccounts });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sync: Retrieve full server state for initial hydration
apiRouter.get('/sync', (_req, res) => {
  try {
    const db = getServerDb();
    return res.json({ success: true, data: db });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sync: Bidirectional sync between browser state and server database
apiRouter.post('/sync', (req, res) => {
  try {
    const updatedDb = syncWithServer(req.body || {});
    return res.json({ success: true, data: updatedDb });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: `Erro na sincronização: ${err.message}` });
  }
});

// GET /api/wedding-config/:clientId
apiRouter.get('/wedding-config/:clientId', (req, res) => {
  try {
    const cid = req.params.clientId;
    const db = getServerDb();
    let config = db.weddingConfigs[cid] || null;
    if (!config) {
      const match = db.clients.find(c => 
        c.id === cid || 
        c.config?.id === cid || 
        c.config?.slug === cid || 
        c.config?.clientId === cid
      );
      if (match?.config) {
        config = match.config;
      }
    }
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/wedding-config/:clientId
apiRouter.post('/wedding-config/:clientId', (req, res) => {
  try {
    const cid = req.params.clientId;
    const config = req.body;
    const db = getServerDb();
    const now = Date.now();
    const incomingTs = Number(config.updatedAt) || now;
    const existing = db.weddingConfigs[cid];
    const existingTs = Number(existing?.updatedAt) || 0;

    if (!existing || incomingTs >= existingTs) {
      config.updatedAt = Math.max(incomingTs, now);
      db.weddingConfigs[cid] = config;
      const client = db.clients.find(c => 
        c.id === cid || 
        c.config?.id === cid || 
        c.config?.slug === cid
      );
      if (client) {
        client.config = config;
        client.updatedAt = config.updatedAt;
        if (config.brideGroom?.groomName && config.brideGroom?.brideName) {
          client.clientName = `${config.brideGroom.groomName} & ${config.brideGroom.brideName}`;
        }
      }
      saveServerDb(db);
    }
    return res.json({ success: true, config: db.weddingConfigs[cid] || config });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/guests/:clientId
apiRouter.get('/guests/:clientId', (req, res) => {
  try {
    const cid = req.params.clientId;
    const db = getServerDb();
    let guests = db.guests[cid] || null;
    if (!guests) {
      const match = db.clients.find(c => c.id === cid || c.config?.id === cid || c.config?.slug === cid);
      if (match && db.guests[match.id]) {
        guests = db.guests[match.id];
      }
    }
    return res.json({ success: true, guests: guests || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/guests/:clientId
apiRouter.post('/guests/:clientId', (req, res) => {
  try {
    const cid = req.params.clientId;
    const { guests } = req.body || {};
    if (Array.isArray(guests)) {
      const db = getServerDb();
      db.guests[cid] = guests;
      const client = db.clients.find(c => c.id === cid);
      if (client) {
        client.guestCount = guests.length;
        client.rsvpsReceived = guests.filter(g => g.status === 'Confirmed').length;
      }
      saveServerDb(db);
      return res.json({ success: true, count: guests.length });
    }
    return res.status(400).json({ success: false, error: 'O corpo deve conter array "guests".' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/activation-requests: List all package activation requests
apiRouter.get('/activation-requests', (_req, res) => {
  try {
    const requests = getActivationRequests();
    return res.json({ success: true, requests });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/activation-requests: Couple submits package activation request
apiRouter.post('/activation-requests', (req, res) => {
  try {
    const requestData = req.body;
    if (!requestData?.clientId || !requestData?.requestedPlan) {
      return res.status(400).json({ success: false, error: 'Dados da solicitação incompletos.' });
    }
    const saved = createActivationRequest(requestData);
    return res.json({ success: saved, request: requestData });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/activation-requests/:id/approve: SuperAdmin approves activation request
apiRouter.post('/activation-requests/:id/approve', (req, res) => {
  try {
    const result = approveActivationRequest(req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/activation-requests/:id/reject: SuperAdmin rejects activation request
apiRouter.post('/activation-requests/:id/reject', (req, res) => {
  try {
    const { reason } = req.body || {};
    const result = rejectActivationRequest(req.params.id, reason);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clients/:id/toggle-access: Toggle client suspended status
apiRouter.post('/clients/:id/toggle-access', (req, res) => {
  try {
    const cid = req.params.id;
    const db = getServerDb();
    const client = db.clients.find(c => c.id === cid);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente não encontrado.' });
    }
    const newStatus = client.status === 'Active' ? 'Suspended' : 'Active';
    client.status = newStatus;
    client.accessRevoked = newStatus === 'Suspended';
    saveServerDb(db);
    return res.json({ success: true, client });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

