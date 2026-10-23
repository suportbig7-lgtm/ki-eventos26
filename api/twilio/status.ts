import type { VercelRequest, VercelResponse } from '@vercel/node';
import { twilioConfig, twilioAuth, method } from '../../lib/twilio';
export default function handler(req:VercelRequest,res:VercelResponse){ if(!method(req,res,'GET'))return; const c=twilioConfig(); res.status(200).json({configured:Boolean(c.accountSid && twilioAuth(c) && c.from),provider:'twilio_whatsapp'}); }
