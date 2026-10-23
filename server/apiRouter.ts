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
