/**
 * Kutxi WhatsApp Messaging Service
 * Handles dispatching RSVP tokens and wedding invitation links via:
 * 1. Twilio WhatsApp API (via secure backend proxy /api/twilio/send-whatsapp)
 * 2. Custom Webhook / API de Mensageria (Evolution API, Z-API, Custom)
 * 3. Direct WhatsApp web/mobile fallback link (wa.me)
 * Dispatches asynchronously to guarantee never blocking the user interface.
 * Persists comprehensive delivery & error logs for system audits.
 */

import { Guest, WeddingConfig, MessagingWebhookConfig, MessagingLog } from '../types';
import { safeGetItem, safeSetItem } from '../utils/storage';

const CONFIG_KEY = 'kutxi_messaging_config';
const LOGS_KEY = 'kutxi_messaging_logs';

export const DEFAULT_MESSAGING_CONFIG: MessagingWebhookConfig = {
  webhookUrl: '',
  apiToken: '',
  provider: 'twilio', // Twilio credentials are configured only on the server
  autoSendOnGuestCreated: true,
  senderNumber: '+14155238886',
  customTemplate: 'Olá, {guestName}! 💍 É com imensa honra e alegria que {groom} & {bride} convidam você para o seu casamento em {date}.\n\n📌 Mesa Reservada: {table}\n🎟️ Assentos: {seats}\n\nAcesse seu passe digital e confirme sua presença:\n🔗 {link}\n(Token: {token})',
  twilioAccountSid: '',
  twilioApiKeySid: '',
  twilioAuthToken: '',
  twilioWhatsAppFrom: '',
  twilioConnected: false
};

/**
 * Retrieve current messaging API configuration
 */
export function getMessagingConfig(): MessagingWebhookConfig {
  try {
    const saved = safeGetItem(CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Never read or persist Twilio secrets from browser storage. Credentials belong on the server.
      return { ...DEFAULT_MESSAGING_CONFIG, ...parsed, twilioAccountSid: '', twilioApiKeySid: '', twilioAuthToken: '', twilioWhatsAppFrom: '', twilioConnected: false };
    }
  } catch (e) {
    console.warn('[messagingService] Error reading config:', e);
  }
  return DEFAULT_MESSAGING_CONFIG;
}

/**
 * Save messaging API configuration
 */
export function saveMessagingConfig(config: Partial<MessagingWebhookConfig>): MessagingWebhookConfig {
  const current = getMessagingConfig();
  const safeConfig = { ...config, twilioAccountSid: '', twilioApiKeySid: '', twilioAuthToken: '', twilioWhatsAppFrom: '' };
  const updated: MessagingWebhookConfig = { ...current, ...safeConfig, twilioAccountSid: '', twilioApiKeySid: '', twilioAuthToken: '', twilioWhatsAppFrom: '' };
  safeSetItem(CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Retrieve messaging logs (delivery attempts & failures)
 */
export function getMessagingLogs(): MessagingLog[] {
  try {
    const raw = safeGetItem(LOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[messagingService] Error reading logs:', e);
  }
  return [];
}

/**
 * Save a new log entry
 */
export function addMessagingLog(log: Omit<MessagingLog, 'id' | 'timestamp'>): MessagingLog {
  const fullLog: MessagingLog = {
    ...log,
    id: 'msg_log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString()
  };
  try {
    const current = getMessagingLogs();
    const updated = [fullLog, ...current].slice(0, 50); // Keep last 50 logs
    safeSetItem(LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[messagingService] Error saving log:', e);
  }
  return fullLog;
}

/**
 * Clear messaging logs
 */
export function clearMessagingLogs(): void {
  safeSetItem(LOGS_KEY, JSON.stringify([]));
}

/**
 * Builds the personalized invitation text for a guest
 */
export function formatGuestMessage(guest: Guest, config: WeddingConfig): string {
  const cfg = getMessagingConfig();
  const groom = config.brideGroom?.groomName || 'Noivo';
  const bride = config.brideGroom?.brideName || 'Noiva';
  
  let formattedDate = 'Data do casamento';
  try {
    const d = new Date(config.date);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch (e) {}

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${origin}/?invite=${guest.rsvpToken}&clientId=${config.clientId || 'client_1'}`;

  const template = cfg.customTemplate || DEFAULT_MESSAGING_CONFIG.customTemplate!;

  return template
    .replace(/{guestName}/g, guest.name)
    .replace(/{groom}/g, groom)
    .replace(/{bride}/g, bride)
    .replace(/{date}/g, formattedDate)
    .replace(/{link}/g, inviteUrl)
    .replace(/{token}/g, guest.rsvpToken)
    .replace(/{table}/g, guest.tableNumber || 'Reservada')
    .replace(/{seats}/g, String(1 + (guest.maxPlusOnes || 0)));
}

/**
 * Test connectivity with Twilio API through backend proxy
 */
export async function testTwilioConnection(customConfig?: Partial<MessagingWebhookConfig>): Promise<{ success: boolean; message: string; data?: any }> {
  const cfg = { ...getMessagingConfig(), ...customConfig };
  try {
    const response = await fetch('/api/twilio/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const data = await response.json();
    if (response.ok && data.success) {
      saveMessagingConfig({ twilioConnected: true });
      return { success: true, message: data.message || 'Twilio autenticado com sucesso!', data };
    } else {
      saveMessagingConfig({ twilioConnected: false });
      return { success: false, message: data.error || 'Falha na validação das credenciais Twilio' };
    }
  } catch (err: any) {
    return { success: false, message: `Erro de conexão: ${err.message}` };
  }
}

/**
 * Test dispatching a real WhatsApp message via Twilio
 */
export async function testTwilioSend(phone: string, text: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const cfg = getMessagingConfig();
  try {
    const response = await fetch('/api/twilio/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, message: text })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      addMessagingLog({
        recipientName: 'Teste de Disparo',
        recipientPhone: phone,
        rsvpToken: 'teste-token',
        status: 'success',
        provider: 'twilio',
        responsePayload: `SID: ${data.sid} | Status: ${data.status}`
      });
      return { success: true, message: data.message };
    } else {
      addMessagingLog({
        recipientName: 'Teste de Disparo',
        recipientPhone: phone,
        rsvpToken: 'teste-token',
        status: 'failed',
        errorDetails: data.error,
        provider: 'twilio'
      });
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    const errorText = `Falha de rede: ${err.message}`;
    addMessagingLog({
      recipientName: 'Teste de Disparo',
      recipientPhone: phone,
      rsvpToken: 'teste-token',
      status: 'failed',
      errorDetails: errorText,
      provider: 'twilio'
    });
    return { success: false, error: errorText };
  }
}

/**
 * Dispatches WhatsApp notification asynchronously.
 * Guaranteed NOT to block the UI.
 * Records every failure or success into the log system.
 */
export async function dispatchRsvpWhatsApp(
  guest: Guest,
  config: WeddingConfig,
  customWebhook?: string
): Promise<{ success: boolean; error?: string; messageUrl?: string; twilioSid?: string }> {
  const msgConfig = getMessagingConfig();
  const cleanPhone = (guest.phone || '').replace(/[^0-9]/g, '');
  const messageText = formatGuestMessage(guest, config);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${origin}/?invite=${guest.rsvpToken}&clientId=${config.clientId || 'client_1'}`;

  // If phone is missing or clearly invalid, log failure
  if (!cleanPhone || cleanPhone.length < 8) {
    const errorDetails = `Número de WhatsApp ausente ou inválido (${guest.phone || 'vazio'})`;
    addMessagingLog({
      guestId: guest.id,
      recipientName: guest.name,
      recipientPhone: guest.phone || 'Sem telefone',
      rsvpToken: guest.rsvpToken,
      status: 'failed',
      errorDetails,
      provider: msgConfig.provider || 'twilio'
    });
    return { success: false, error: errorDetails };
  }

  // Fallback direct WhatsApp web link in case of error
  const directUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;

  // 1. PRIMARY ROUTE: TWILIO WHATSAPP INTEGRATION
  if (msgConfig.provider === 'twilio' || (!customWebhook && !msgConfig.webhookUrl)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout max to never block

      const response = await fetch('/api/twilio/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanPhone,
          message: messageText,
          guestName: guest.name,
          rsvpToken: guest.rsvpToken,
          // Credentials and sender are selected securely by the server environment.
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        addMessagingLog({
          guestId: guest.id,
          recipientName: guest.name,
          recipientPhone: cleanPhone,
          rsvpToken: guest.rsvpToken,
          status: 'success',
          provider: 'twilio',
          responsePayload: `SID: ${data.sid} | Status: ${data.status}`
        });
        return { success: true, twilioSid: data.sid };
      } else {
        const errorText = data.error || `Erro Twilio: HTTP ${response.status}`;
        addMessagingLog({
          guestId: guest.id,
          recipientName: guest.name,
          recipientPhone: cleanPhone,
          rsvpToken: guest.rsvpToken,
          status: 'failed',
          errorDetails: errorText,
          provider: 'twilio'
        });
        return { success: false, error: errorText, messageUrl: directUrl };
      }
    } catch (err: any) {
      const errorText = err.name === 'AbortError'
        ? 'Tempo limite de conexão excedido no Twilio (Timeout)'
        : `Erro de rede com servidor proxy Twilio: ${err.message || 'Falha de conexão'}`;

      addMessagingLog({
        guestId: guest.id,
        recipientName: guest.name,
        recipientPhone: cleanPhone,
        rsvpToken: guest.rsvpToken,
        status: 'failed',
        errorDetails: errorText,
        provider: 'twilio'
      });

      return { success: false, error: errorText, messageUrl: directUrl };
    }
  }

  // 2. ALTERNATIVE: CUSTOM WEBHOOK DISPATCH (Evolution API, Z-API, Generic Webhook)
  const webhookUrl = (customWebhook || msgConfig.webhookUrl || '').trim();
  if (webhookUrl) {
    try {
      const payload = {
        event: 'rsvp.invite.created',
        timestamp: new Date().toISOString(),
        guest: {
          id: guest.id,
          name: guest.name,
          phone: cleanPhone,
          email: guest.email,
          rsvpToken: guest.rsvpToken,
          tableNumber: guest.tableNumber,
          maxPlusOnes: guest.maxPlusOnes,
          group: guest.group
        },
        wedding: {
          id: config.id,
          groom: config.brideGroom?.groomName,
          bride: config.brideGroom?.brideName,
          date: config.date,
          venue: config.venue?.ceremonyName,
          address: config.venue?.ceremonyAddress,
          inviteUrl
        },
        message: messageText
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(msgConfig.apiToken ? { 'Authorization': `Bearer ${msgConfig.apiToken}` } : {})
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = `Falha no Webhook: HTTP ${response.status} ${response.statusText}`;
        addMessagingLog({
          guestId: guest.id,
          recipientName: guest.name,
          recipientPhone: cleanPhone,
          rsvpToken: guest.rsvpToken,
          status: 'failed',
          errorDetails: errorText,
          provider: msgConfig.provider
        });
        return { success: false, error: errorText, messageUrl: directUrl };
      }

      addMessagingLog({
        guestId: guest.id,
        recipientName: guest.name,
        recipientPhone: cleanPhone,
        rsvpToken: guest.rsvpToken,
        status: 'success',
        provider: msgConfig.provider,
        responsePayload: `HTTP ${response.status}`
      });

      return { success: true };
    } catch (err: any) {
      const errorText = err.name === 'AbortError'
        ? 'Tempo limite de conexão excedido (Timeout no Webhook)'
        : `Erro de rede no Webhook: ${err.message || 'Falha de conexão'}`;

      addMessagingLog({
        guestId: guest.id,
        recipientName: guest.name,
        recipientPhone: cleanPhone,
        rsvpToken: guest.rsvpToken,
        status: 'failed',
        errorDetails: errorText,
        provider: msgConfig.provider
      });

      return { success: false, error: errorText, messageUrl: directUrl };
    }
  }

  // 3. Fallback: Direct WhatsApp ready
  addMessagingLog({
    guestId: guest.id,
    recipientName: guest.name,
    recipientPhone: cleanPhone,
    rsvpToken: guest.rsvpToken,
    status: 'queued',
    errorDetails: 'Mensagem preparada para envio direto via WhatsApp.',
    provider: 'whatsapp_direct',
    responsePayload: directUrl
  });

  return { success: true, messageUrl: directUrl };
}
