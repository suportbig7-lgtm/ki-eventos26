import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Guest, WeddingConfig, ClientWeddingSaaS, SystemAuditLog } from '../types';
import { safeGetItem, safeSetItem, sanitizeClientsList, sanitizeConfigForStorage } from '../utils/storage';

/**
 * Kutxi Supabase Cloud Storage & Database Service
 */
export interface SupabaseConfigState {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  lastSync?: string;
  error?: string;
}

let activeClient: SupabaseClient | null = null;
let activeClientKey = '';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const env = (import.meta as any).env || {};
  const envUrl = env.VITE_SUPABASE_URL || '';
  const envKey = env.VITE_SUPABASE_ANON_KEY || '';
  const storedUrl = safeGetItem('kutxi_supabase_url') || '';
  const storedKey = safeGetItem('kutxi_supabase_anon_key') || '';
  const url = (storedUrl || envUrl || '').trim();
  const anonKey = (storedKey || envKey || '').trim();
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !url.startsWith('http')) {
    activeClient = null;
    activeClientKey = '';
    return null;
  }
  const cacheKey = `${url}::${anonKey}`;
  if (activeClient && activeClientKey === cacheKey) {
    return activeClient;
  }
  try {
    activeClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    activeClientKey = cacheKey;
    return activeClient;
  } catch (e) {
    console.warn('[getSupabaseClient] Error creating client:', e);
    activeClient = null;
    return null;
  }
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  safeSetItem('kutxi_supabase_url', (url || '').trim());
  safeSetItem('kutxi_supabase_anon_key', (anonKey || '').trim());
  activeClient = null;
  activeClientKey = '';
}

export function clearSupabaseCredentials(): void {
  safeSetItem('kutxi_supabase_url', '');
  safeSetItem('kutxi_supabase_anon_key', '');
  activeClient = null;
  activeClientKey = '';
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Credenciais do Supabase ausentes ou formato de URL inválido. Insira a URL e a Anon Key nas Definições do Sistema.'
    };
  }
  const startTime = Date.now();
  try {
    const { error } = await client
      .from('kutxi_clients')
      .select('id')
      .limit(1);

    const latency = Date.now() - startTime;
    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "kutxi_clients" does not exist')) {
        return {
          success: true,
          message: `Conexão autenticada com sucesso (${latency}ms)! As tabelas ainda não foram criadas no Supabase. Execute o script de migração no painel SQL do Supabase.`,
          latency
        };
      }
      return {
        success: false,
        message: `Erro do Supabase: ${error.message} (Código: ${error.code || 'N/A'})`
      };
    }
    return {
      success: true,
      message: `Conexão com o Supabase Cloud ativa e funcional! Latência: ${latency}ms`,
      latency
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na requisição ao Supabase: ${err?.message || 'Verifique a rede ou a URL.'}`
    };
  }
}

export async function supabaseSyncWeddingConfig(clientId: string, config: WeddingConfig): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const sanitized = sanitizeConfigForStorage(config) || config;
    const { error } = await client
      .from('kutxi_wedding_configs')
      .upsert({
        id: clientId,
        client_id: clientId,
        config_json: sanitized,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    return !error;
  } catch (e) {
    return false;
  }
}

export async function supabaseFetchWeddingConfig(clientId: string): Promise<WeddingConfig | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('kutxi_wedding_configs')
      .select('config_json')
      .eq('id', clientId)
      .single();
    if (error || !data) return null;
    return data.config_json as WeddingConfig;
  } catch (e) {
    return null;
  }
}

export async function supabaseSyncGuests(clientId: string, guests: Guest[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !Array.isArray(guests)) return false;
  try {
    const rows = guests.map(g => ({
      id: g.id,
      client_id: clientId,
      name: g.name,
      email: g.email || '',
      phone: g.phone || '',
      group_name: g.group || 'Geral',
      table_number: g.tableNumber || '',
      rsvp_token: g.rsvpToken,
      status: g.status,
      max_plus_ones: g.maxPlusOnes || 0,
      plus_ones_confirmed: g.plusOnesConfirmed || 0,
      dietary: g.dietaryRequirements || '',
      notes: g.notes || '',
      invitation_views: g.invitationViews || 0,
      checked_in: Boolean(g.checkedIn),
      checked_in_at: g.checkedInAt || null,
      updated_at: new Date().toISOString()
    }));
    const { error } = await client
      .from('kutxi_guests')
      .upsert(rows, { onConflict: 'id' });
    return !error;
  } catch (e) {
    return false;
  }
}

export async function supabaseFetchGuests(clientId: string): Promise<Guest[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('kutxi_guests')
      .select('*')
      .eq('client_id', clientId)
      .order('name');
    if (error || !Array.isArray(data)) return null;
    return data.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      group: (row.group_name as any) || 'Geral',
      tableNumber: row.table_number || '',
      rsvpToken: row.rsvp_token,
      status: row.status as 'Pending' | 'Confirmed' | 'Declined',
      maxPlusOnes: row.max_plus_ones || 0,
      plusOnesConfirmed: row.plus_ones_confirmed || 0,
      dietaryRequirements: row.dietary || '',
      notes: row.notes || '',
      invitationViews: row.invitation_views || 0,
      checkedIn: Boolean(row.checked_in),
      checkedInAt: row.checked_in_at || undefined
    }));
  } catch (e) {
    return null;
  }
}

export async function supabaseUpdateGuest(guestId: string, partial: Partial<Guest>): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (partial.status !== undefined) updatePayload.status = partial.status;
    if (partial.plusOnesConfirmed !== undefined) updatePayload.plus_ones_confirmed = partial.plusOnesConfirmed;
    if (partial.dietaryRequirements !== undefined) updatePayload.dietary = partial.dietaryRequirements;
    if (partial.notes !== undefined) updatePayload.notes = partial.notes;
    if (partial.checkedIn !== undefined) updatePayload.checked_in = partial.checkedIn;
    if (partial.checkedInAt !== undefined) updatePayload.checked_in_at = partial.checkedInAt;
    if (partial.invitationViews !== undefined) updatePayload.invitation_views = partial.invitationViews;
    const { error } = await client
      .from('kutxi_guests')
      .update(updatePayload)
      .eq('id', guestId);
    return !error;
  } catch (e) {
    return false;
  }
}

export async function supabaseSyncClients(clients: ClientWeddingSaaS[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !Array.isArray(clients)) return false;
  try {
    const sanitized = sanitizeClientsList(clients);
    const rows = sanitized.map(c => ({
      id: c.id,
      client_name: c.clientName,
      subdomain: (c as any).subdomain || c.id,
      plan: c.plan,
      status: c.status,
      wedding_date: c.weddingDate,
      email: c.clientEmail || '',
      paid_amount: c.revenue || 0,
      config: c.config || null,
      updated_at: new Date().toISOString()
    }));
    const { error } = await client
      .from('kutxi_clients')
      .upsert(rows, { onConflict: 'id' });
    return !error;
  } catch (e) {
    return false;
  }
}

export async function supabaseFetchClients(): Promise<ClientWeddingSaaS[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('kutxi_clients')
      .select('*')
      .order('client_name');
    if (error || !Array.isArray(data)) return null;
    return data.map(row => ({
      id: row.id,
      clientName: row.client_name,
      clientEmail: row.email || '',
      plan: row.plan || 'Premium',
      status: row.status || 'Active',
      weddingDate: row.wedding_date || '',
      revenue: Number(row.paid_amount || 0),
      config: row.config || undefined
    }));
  } catch (e) {
    return null;
  }
}

export async function supabaseSyncAuditLogs(logs: SystemAuditLog[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !Array.isArray(logs)) return false;
  try {
    const rows = logs.slice(0, 50).map(l => ({
      id: l.id,
      timestamp: l.timestamp,
      actor: l.actor,
      action: l.action,
      details: l.details,
      ip: l.ip || '127.0.0.1'
    }));
    const { error } = await client
      .from('kutxi_audit_logs')
      .upsert(rows, { onConflict: 'id' });
    return !error;
  } catch (e) {
    return false;
  }
}

export async function supabaseFetchAuditLogs(): Promise<SystemAuditLog[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('kutxi_audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);
    if (error || !Array.isArray(data)) return null;
    return data.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      actor: row.actor,
      action: row.action,
      details: row.details,
      ip: row.ip
    }));
  } catch (e) {
    return null;
  }
}
