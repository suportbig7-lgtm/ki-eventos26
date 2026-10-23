import { Guest, WeddingConfig, ClientWeddingSaaS, SystemAuditLog } from '../types';
import { INITIAL_WEDDING_CONFIG, INITIAL_GUESTS, INITIAL_CLIENTS, INITIAL_AUDIT_LOGS, createBlankWeddingConfig } from '../data/defaultConfig';
import { safeSetItem, safeGetItem, sanitizeClientsList, sanitizeConfigForStorage } from '../utils/storage';
import { 
  isSupabaseConfigured, 
  supabaseSyncWeddingConfig, 
  supabaseFetchWeddingConfig,
  supabaseSyncGuests, 
  supabaseFetchGuests, 
  supabaseUpdateGuest,
  supabaseSyncClients, 
  supabaseFetchClients, 
  supabaseSyncAuditLogs, 
  supabaseFetchAuditLogs,
  getSupabaseClient
} from './supabase';

export type DatabaseDriver = 'supabase' | 'local';

export const normalizeText = (text: string): string => {
  return (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

export const extractCleanToken = (raw: string): string => {
  let text = (raw || '').trim();
  if (text.includes('invite=')) {
    const match = text.match(/[?&]invite=([^&#\s]+)/i);
    if (match && match[1]) {
      text = decodeURIComponent(match[1]);
    }
  }
  if (text.toLowerCase().startsWith('rsvp:')) {
    text = text.substring(5);
  }
  return text.trim();
};

export const dbService = {
  weddingConfig: {
    async get(clientId: string): Promise<WeddingConfig> {
      try {
        const key = `kutxi_wedding_config_${clientId}`;
        const saved = safeGetItem(key) || 
                      (clientId === 'client_1' ? safeGetItem('kutxi_wedding_config') : null);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (isSupabaseConfigured()) {
            supabaseFetchWeddingConfig(clientId).then(cloudConfig => {
              if (cloudConfig) {
                safeSetItem(key, JSON.stringify(cloudConfig));
              }
            }).catch(() => {});
          }
          return parsed;
        }

        const savedClients = safeGetItem('kutxi_clients');
        if (savedClients) {
          const list: ClientWeddingSaaS[] = JSON.parse(savedClients);
          const found = list.find(c => c.id === clientId || c.config?.id === clientId);
          if (found?.config) return found.config;
        }
      } catch (e) {
        console.warn('[dbService.weddingConfig.get] Error:', e);
      }

      if (isSupabaseConfigured()) {
        try {
          const cloudConfig = await supabaseFetchWeddingConfig(clientId);
          if (cloudConfig) {
            safeSetItem(`kutxi_wedding_config_${clientId}`, JSON.stringify(cloudConfig));
            return cloudConfig;
          }
        } catch (e) {
          console.warn('[dbService.weddingConfig.get] Supabase fetch error:', e);
        }
      }
      if (clientId === 'client_1') {
        return INITIAL_WEDDING_CONFIG;
      }
      return createBlankWeddingConfig(clientId);
    },

    async save(clientId: string, config: WeddingConfig): Promise<void> {
      try {
        const sanitized = sanitizeConfigForStorage(config) || config;
        safeSetItem(`kutxi_wedding_config_${clientId}`, JSON.stringify(sanitized));
        if (clientId === 'client_1') {
          safeSetItem('kutxi_wedding_config', JSON.stringify(sanitized));
        }

        // Instant event notification for active windows
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kutxi_wedding_config_changed', {
            detail: { clientId, config: sanitized }
          }));
        }

        // Keep clients record synced
        const savedClients = safeGetItem('kutxi_clients');
        if (savedClients) {
          try {
            const list: ClientWeddingSaaS[] = JSON.parse(savedClients);
            const updated = list.map(c => {
              if (c.id === clientId || c.config?.id === clientId) {
                return {
                  ...c,
                  clientName: `${config.brideGroom?.groomName || 'Noivo'} & ${config.brideGroom?.brideName || 'Noiva'}`,
                  weddingDate: config.date ? config.date.split('T')[0] : c.weddingDate,
                  config: sanitized
                };
              }
              return c;
            });
            safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(updated)));
          } catch (e) {}
        }

        if (isSupabaseConfigured()) {
          supabaseSyncWeddingConfig(clientId, sanitized).catch(err => {
            console.warn('[dbService.weddingConfig.save] Supabase sync error:', err);
          });
        }
      } catch (e) {
        console.warn('[dbService.weddingConfig.save] Error:', e);
      }
    }
  },

  guests: {
    async getAll(clientId: string): Promise<Guest[]> {
      try {
        const saved = safeGetItem(`kutxi_guests_${clientId}`) || 
                      (clientId === 'client_1' ? safeGetItem('kutxi_guests') : null);
        if (saved) {
          const list = JSON.parse(saved);
          if (Array.isArray(list)) {
            if (isSupabaseConfigured()) {
              supabaseFetchGuests(clientId).then(cloudGuests => {
                if (cloudGuests && cloudGuests.length > 0) {
                  safeSetItem(`kutxi_guests_${clientId}`, JSON.stringify(cloudGuests));
                }
              }).catch(() => {});
            }
            return list;
          }
        }
      } catch (e) {
        console.warn('[dbService.guests.getAll] Cache error:', e);
      }

      if (isSupabaseConfigured()) {
        try {
          const cloudGuests = await supabaseFetchGuests(clientId);
          if (cloudGuests) {
            safeSetItem(`kutxi_guests_${clientId}`, JSON.stringify(cloudGuests));
            return cloudGuests;
          }
        } catch (e) {}
      }
      return [];
    },

    async saveAll(clientId: string, guests: Guest[]): Promise<void> {
      try {
        safeSetItem(`kutxi_guests_${clientId}`, JSON.stringify(guests));
        if (clientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(guests));
        }
        if (isSupabaseConfigured()) {
          supabaseSyncGuests(clientId, guests).catch(err => {
            console.warn('[dbService.guests.saveAll] Supabase sync error:', err);
          });
        }
      } catch (e) {
        console.warn('[dbService.guests.saveAll] Error:', e);
      }
    },

    async add(clientId: string, guest: Guest): Promise<Guest[]> {
      const current = await this.getAll(clientId);
      const updated = [guest, ...current];
      await this.saveAll(clientId, updated);
      return updated;
    },

    async update(clientId: string, updatedGuest: Guest): Promise<Guest[]> {
      const current = await this.getAll(clientId);
      const updated = current.map(g => g.id === updatedGuest.id ? updatedGuest : g);
      await this.saveAll(clientId, updated);
      if (isSupabaseConfigured()) {
        supabaseUpdateGuest(updatedGuest.id, updatedGuest).catch(() => {});
      }
      return updated;
    },

    async delete(clientId: string, guestId: string): Promise<Guest[]> {
      const current = await this.getAll(clientId);
      const updated = current.filter(g => g.id !== guestId);
      await this.saveAll(clientId, updated);
      return updated;
    }
  },

  clients: {
    async getAll(): Promise<ClientWeddingSaaS[]> {
      try {
        const saved = safeGetItem('kutxi_clients');
        if (saved) {
          const list = JSON.parse(saved);
          if (Array.isArray(list)) return list;
        }
      } catch (e) {}

      if (isSupabaseConfigured()) {
        try {
          const cloudClients = await supabaseFetchClients();
          if (cloudClients) {
            safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(cloudClients)));
            return cloudClients;
          }
        } catch (e) {}
      }
      return INITIAL_CLIENTS;
    },

    async save(client: ClientWeddingSaaS): Promise<void> {
      const current = await this.getAll();
      const exists = current.some(c => c.id === client.id);
      const updated = exists ? current.map(c => c.id === client.id ? client : c) : [client, ...current];
      safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(updated)));
      if (isSupabaseConfigured()) {
        supabaseSyncClients(updated).catch(() => {});
      }
    }
  },

  audit: {
    async getLogs(): Promise<SystemAuditLog[]> {
      try {
        const saved = safeGetItem('kutxi_audit_logs');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return INITIAL_AUDIT_LOGS;
    },

    async log(actor: string, action: string, details: string, type: 'system' | 'auth' | 'rsvp' | 'messaging' | 'security' = 'system'): Promise<void> {
      try {
        const current = await this.getLogs();
        const newEntry: SystemAuditLog = {
          id: 'log_' + Date.now(),
          timestamp: new Date().toISOString(),
          actor,
          action,
          details,
          type,
          ip: '102.214.34.' + Math.floor(Math.random() * 250 + 1)
        };
        const updated = [newEntry, ...current].slice(0, 30);
        safeSetItem('kutxi_audit_logs', JSON.stringify(updated));
        if (isSupabaseConfigured()) {
          supabaseSyncAuditLogs(updated).catch(() => {});
        }
      } catch (e) {}
    }
  },

  sync: {
    async pushAllToSupabase(clients: ClientWeddingSaaS[], currentConfig: WeddingConfig, currentGuests: Guest[], logs: SystemAuditLog[]): Promise<{ success: boolean; message: string }> {
      if (!isSupabaseConfigured()) {
        return { success: false, message: 'Supabase não está configurado. Insira a URL e a Anon Key nas definições.' };
      }
      try {
        await supabaseSyncClients(clients);
        await supabaseSyncWeddingConfig(currentConfig.clientId || 'client_1', currentConfig);
        await supabaseSyncGuests(currentConfig.clientId || 'client_1', currentGuests);
        await supabaseSyncAuditLogs(logs);
        return {
          success: true,
          message: 'Todos os clientes, convidados, configurações e logs foram sincronizados com o Supabase com sucesso!'
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Falha na sincronização: ${err?.message || 'Erro desconhecido'}`
        };
      }
    }
  }
};
