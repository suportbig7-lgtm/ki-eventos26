import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Local development API. Production on Vercel uses the serverless handlers in /api.
const credentials = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() || '',
  apiKeySid: process.env.TWILIO_API_KEY_SID?.trim() || '',
  apiKeySecret: process.env.TWILIO_API_KEY_SECRET?.trim() || '',
  authToken: process.env.TWILIO_AUTH_TOKEN?.trim() || '',
  from: process.env.TWILIO_WHATSAPP_FROM?.trim() || ''
});
function authHeader(c: ReturnType<typeof credentials>) {
  if (c.apiKeySid && c.apiKeySecret) return 'Basic ' + Buffer.from(`${c.apiKeySid}:${c.apiKeySecret}`).toString('base64');
  if (c.accountSid && c.authToken) return 'Basic ' + Buffer.from(`${c.accountSid}:${c.authToken}`).toString('base64');
  return '';
}
app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'Kutxi' }));
app.get('/api/twilio/status', (_req, res) => { const c=credentials(); res.json({ configured: Boolean(c.accountSid && authHeader(c) && c.from), provider: 'twilio_whatsapp' }); });
app.post('/api/twilio/test-connection', async (_req, res) => {
  const c=credentials(); const auth=authHeader(c);
  if (!c.accountSid || !auth) return res.status(503).json({ success:false, error:'Twilio não configurado no servidor. Configure as variáveis de ambiente.' });
  try { const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}.json`, { headers:{ Authorization:auth } }); const d:any=await r.json(); if(!r.ok) return res.status(401).json({success:false,error:'A Twilio rejeitou as credenciais configuradas.'}); return res.json({success:true,friendlyName:d.friendly_name,status:d.status,message:'Ligação Twilio validada.'}); } catch { return res.status(502).json({success:false,error:'Não foi possível contactar a Twilio.'}); }
});
app.post('/api/twilio/send-whatsapp', async (req, res) => {
  const c=credentials(); const auth=authHeader(c); const to=String(req.body?.to || '').trim(); const message=String(req.body?.message || '').trim();
  if (!c.accountSid || !auth || !c.from) return res.status(503).json({success:false,error:'Twilio não configurado no servidor.'});
  if (!to || !message || message.length>4000 || to.length>40) return res.status(400).json({success:false,error:'Destinatário ou mensagem inválidos.'});
  const digits=to.replace(/[^0-9]/g,''); if(digits.length<8 || digits.length>15) return res.status(400).json({success:false,error:'Número de telefone inválido. Inclua o indicativo internacional.'});
  try { const form=new URLSearchParams({To:`whatsapp:+${digits}`,From:c.from.startsWith('whatsapp:')?c.from:`whatsapp:${c.from}`,Body:message}); const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}/Messages.json`,{method:'POST',headers:{Authorization:auth,'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()}); const d:any=await r.json(); if(!r.ok) return res.status(400).json({success:false,error:d.message || 'A Twilio não aceitou a mensagem.',code:d.code}); return res.json({success:true,sid:d.sid,status:d.status,to:d.to,from:d.from,message:'Mensagem aceite pela Twilio.'}); } catch { return res.status(502).json({success:false,error:'Falha de comunicação com a Twilio.'}); }
});
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true, host: '0.0.0.0' }, appType: 'spa' });
  app.use(vite.middlewares);
} else { app.use(express.static(path.resolve(__dirname, 'dist'))); app.get('*', (_req,res)=>res.sendFile(path.resolve(__dirname,'dist','index.html'))); }
app.listen(PORT, '0.0.0.0', () => console.log(`[Kutxi] http://localhost:${PORT}`));
