import fs from 'fs';
import path from 'path';
import { UserAccount, ClientWeddingSaaS, WeddingConfig, Guest, SystemAuditLog, ActivationRequest } from '../src/types';
import { 
  INITIAL_WEDDING_CONFIG, INITIAL_GUESTS, INITIAL_CLIENTS, INITIAL_USER_ACCOUNTS, 
  CONFIG_JOAO_ALICE, CONFIG_PEDRO_PUREZA, CONFIG_OSVALDO_NICIDIA,
  INITIAL_AUDIT_LOGS, DEFAULT_PLANS, createBlankWeddingConfig, SaaSPlanConfig 
} from '../src/data/defaultConfig';

export interface ServerDatabase {
  userAccounts: UserAccount[];
  clients: ClientWeddingSaaS[];
  weddingConfigs: Record<string, WeddingConfig>;
  guests: Record<string, Guest[]>;
  saasPlans: SaaSPlanConfig[];
  activationRequests: ActivationRequest[];
  auditLogs: SystemAuditLog[];
  lastUpdated: string;
}

// Determine best writable database path
function getDbFilePath(): string {
  try {
    const localDataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(localDataDir)) {
      fs.mkdirSync(localDataDir, { recursive: true });
    }
    const testFile = path.resolve(localDataDir, '.writable_test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return path.resolve(localDataDir, 'kutxi_db.json');
  } catch (e) {
    // In serverless / read-only filesystem (like Vercel lambdas), fallback to /tmp
    const tmpDir = path.resolve('/tmp');
    return path.resolve(tmpDir, 'kutxi_db.json');
  }
}

let cachedDb: ServerDatabase | null = null;
let dbFilePath = '';

function buildInitialDatabase(): ServerDatabase {
  const configs: Record<string, WeddingConfig> = {
    client_1: INITIAL_WEDDING_CONFIG,
    client_osvaldo_nicidia: CONFIG_OSVALDO_NICIDIA,
    client_pedro_pureza: CONFIG_PEDRO_PUREZA,
    client_joao_alice: CONFIG_JOAO_ALICE
  };

  const guestsMap: Record<string, Guest[]> = {
    client_1: INITIAL_GUESTS,
    client_osvaldo_nicidia: [],
    client_pedro_pureza: [],
    client_joao_alice: []
  };

  return {
    userAccounts: INITIAL_USER_ACCOUNTS,
    clients: INITIAL_CLIENTS,
    weddingConfigs: configs,
    guests: guestsMap,
    saasPlans: DEFAULT_PLANS,
    activationRequests: [],
    auditLogs: INITIAL_AUDIT_LOGS,
    lastUpdated: new Date().toISOString()
  };
}

export function getServerDb(): ServerDatabase {
  if (cachedDb) return cachedDb;

  if (!dbFilePath) {
    dbFilePath = getDbFilePath();
  }

  if (fs.existsSync(dbFilePath)) {
    try {
      const raw = fs.readFileSync(dbFilePath, 'utf-8');
      const parsed: ServerDatabase = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.userAccounts) && Array.isArray(parsed.clients)) {
        if (!Array.isArray(parsed.activationRequests)) {
          parsed.activationRequests = [];
        }
        if (!parsed.weddingConfigs) {
          parsed.weddingConfigs = {};
        }

        // Union merge INITIAL_CLIENTS so all profiles are guaranteed present across all deployments
        INITIAL_CLIENTS.forEach(ic => {
          const idx = parsed.clients.findIndex(c => c.id === ic.id);
          if (idx < 0) {
            parsed.clients.push(ic);
          } else {
            const icTs = getTs(ic);
            const exTs = getTs(parsed.clients[idx]);
            if (icTs > exTs) {
              parsed.clients[idx] = { ...parsed.clients[idx], ...ic, updatedAt: icTs };
            }
          }
          if (ic.config) {
            const curCfg = parsed.weddingConfigs[ic.id];
            const icCfgTs = getTs(ic.config);
            const curCfgTs = getTs(curCfg);
            if (!curCfg || !curCfg.brideGroom?.groomName || icCfgTs > curCfgTs) {
              parsed.weddingConfigs[ic.id] = ic.config;
            }
          }
        });

        // Union merge INITIAL_USER_ACCOUNTS
        INITIAL_USER_ACCOUNTS.forEach(ia => {
          const exists = parsed.userAccounts.some(a => a.username.toLowerCase() === ia.username.toLowerCase());
          if (!exists) {
            parsed.userAccounts.push(ia);
          }
        });

        cachedDb = parsed;
        return cachedDb;
      }
    } catch (e) {
      console.warn('[getServerDb] Error reading existing database file:', e);
    }
  }

  // Create initial database if file doesn't exist or is invalid
  const initial = buildInitialDatabase();
  saveServerDb(initial);
  cachedDb = initial;
  return cachedDb;
}

export function saveServerDb(db: ServerDatabase): boolean {
  try {
    if (!dbFilePath) {
      dbFilePath = getDbFilePath();
    }
    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf-8');
    cachedDb = db;
    return true;
  } catch (e) {
    // If saving to dbFilePath failed (e.g. read-only filesystem), fallback to /tmp
    try {
      const tmpPath = path.resolve('/tmp', 'kutxi_db.json');
      fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
      dbFilePath = tmpPath;
      cachedDb = db;
      return true;
    } catch (err2) {
      console.warn('[saveServerDb] Fallback write to /tmp failed:', err2);
      cachedDb = db;
      return false;
    }
  }
}

/**
 * Authenticate credentials against server database
 */
export function authenticateUser(usernameRaw: string, passwordRaw: string): {
  success: boolean;
  user?: UserAccount;
  client?: ClientWeddingSaaS;
  config?: WeddingConfig;
  guests?: Guest[];
  error?: string;
} {
  const username = (usernameRaw || '').trim().toLowerCase();
  const password = (passwordRaw || '').trim();

  if (!username || !password) {
    return { success: false, error: 'Por favor, insira o usuário e a palavra-passe.' };
  }

  const db = getServerDb();

  // Superadmin check
  if (
    (username === 'superadmin' && password === 'admin123') ||
    (username === 'ki-eventos' && password === 'kieventos123')
  ) {
    const superUser: UserAccount = {
      username,
      pass: password,
      clientId: 'system',
      clientName: 'Super Administrador',
      role: 'superadmin'
    };
    return {
      success: true,
      user: superUser,
      client: db.clients[0] || null,
      config: db.weddingConfigs['client_1'] || INITIAL_WEDDING_CONFIG,
      guests: db.guests['client_1'] || []
    };
  }

  // Find user account in server database
  const found = db.userAccounts.find(
    acc => acc.username.trim().toLowerCase() === username && acc.pass.trim() === password
  );

  if (!found) {
    return {
      success: false,
      error: 'Credenciais incorretas. Verifique o usuário e a palavra-passe.'
    };
  }

  // Retrieve client profile, config, and guests
  const client = db.clients.find(c => c.id === found.clientId) || null;
  const config = db.weddingConfigs[found.clientId] || (client?.config) || createBlankWeddingConfig(found.clientId);
  const guests = db.guests[found.clientId] || [];

  return {
    success: true,
    user: found,
    client: client || undefined,
    config,
    guests
  };
}

/**
 * Register a new couple into server database
 */
export function registerCouple(
  client: ClientWeddingSaaS,
  user1: { username: string; pass: string; role?: string },
  user2: { username: string; pass: string; role?: string }
): boolean {
  const db = getServerDb();

  // Update or insert client
  const existingClientIdx = db.clients.findIndex(c => c.id === client.id);
  if (existingClientIdx >= 0) {
    db.clients[existingClientIdx] = client;
  } else {
    db.clients.push(client);
  }

  // Update or insert accounts
  const accountsToAdd: UserAccount[] = [
    {
      username: user1.username.trim(),
      pass: user1.pass.trim(),
      clientId: client.id,
      clientName: client.clientName,
      role: (user1.role as any) || 'couple'
    },
    {
      username: user2.username.trim(),
      pass: user2.pass.trim(),
      clientId: client.id,
      clientName: client.clientName,
      role: (user2.role as any) || 'couple'
    }
  ];

  for (const newAcc of accountsToAdd) {
    const existingIdx = db.userAccounts.findIndex(
      a => a.username.toLowerCase() === newAcc.username.toLowerCase()
    );
    if (existingIdx >= 0) {
      db.userAccounts[existingIdx] = newAcc;
    } else {
      db.userAccounts.push(newAcc);
    }
  }

  // Save config
  if (client.config) {
    db.weddingConfigs[client.id] = client.config;
  }

  // Ensure guests entry
  if (!db.guests[client.id]) {
    db.guests[client.id] = [];
  }

  // Add audit log
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    timestamp: new Date().toISOString(),
    actor: client.clientName,
    action: 'Cadastro Efetuado',
    details: `Novo casal registrado no plano ${client.plan}. Contas criadas para ${user1.username} e ${user2.username}.`,
    ip: '127.0.0.1',
    type: 'auth'
  });

  return saveServerDb(db);
}

// Helper to safely extract millisecond timestamp
const getTs = (obj: any): number => {
  if (!obj) return 0;
  if (typeof obj.updatedAt === 'number' && !isNaN(obj.updatedAt)) return obj.updatedAt;
  if (typeof obj.updatedAt === 'string') {
    const parsed = Date.parse(obj.updatedAt);
    if (!isNaN(parsed)) return parsed;
  }
  if (obj.createdAt) {
    const parsed = Date.parse(obj.createdAt);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
};

/**
 * Intelligent bidirectional sync of client data with server
 * Employs Timestamp-Based Conflict Resolution (Last-Write-Wins based on explicit updatedAt).
 * Outdated client snapshots will never overwrite newer server updates.
 */
export function syncWithServer(payload: {
  clients?: ClientWeddingSaaS[];
  userAccounts?: UserAccount[];
  weddingConfigs?: Record<string, WeddingConfig>;
  guests?: Record<string, Guest[]>;
  saasPlans?: SaaSPlanConfig[];
  auditLogs?: SystemAuditLog[];
}): ServerDatabase {
  const db = getServerDb();

  // 1. Merge Accounts
  if (payload.userAccounts && Array.isArray(payload.userAccounts)) {
    for (const incoming of payload.userAccounts) {
      if (!incoming?.username || !incoming?.pass) continue;
      const idx = db.userAccounts.findIndex(
        a => a.username.toLowerCase() === incoming.username.toLowerCase()
      );
      if (idx >= 0) {
        // Keep updated role / password if supplied
        db.userAccounts[idx] = { ...db.userAccounts[idx], ...incoming };
      } else {
        db.userAccounts.push(incoming);
      }
    }
  }

  // 2. Merge Clients (Timestamp-based conflict resolution)
  if (payload.clients && Array.isArray(payload.clients)) {
    for (const incoming of payload.clients) {
      if (!incoming?.id) continue;
      const idx = db.clients.findIndex(c => c.id === incoming.id);
      const incomingTs = getTs(incoming);

      if (idx >= 0) {
        const existing = db.clients[idx];
        const existingTs = getTs(existing);

        // Only overwrite if incoming version has equal or newer timestamp
        if (incomingTs >= existingTs) {
          const mergedUpdatedAt = Math.max(incomingTs, Date.now());
          db.clients[idx] = { 
            ...existing, 
            ...incoming, 
            updatedAt: mergedUpdatedAt 
          };

          if (incoming.config) {
            const incomingConfigTs = getTs(incoming.config) || incomingTs;
            const existingConfigTs = getTs(db.weddingConfigs[incoming.id]);
            if (incomingConfigTs >= existingConfigTs) {
              db.weddingConfigs[incoming.id] = {
                ...incoming.config,
                updatedAt: Math.max(incomingConfigTs, mergedUpdatedAt)
              };
            }
          }
        }
        // If existingTs > incomingTs: retain newer server version, ignore outdated incoming
      } else {
        const newTs = incomingTs || Date.now();
        db.clients.push({
          ...incoming,
          updatedAt: newTs
        });
        if (incoming.config) {
          db.weddingConfigs[incoming.id] = {
            ...incoming.config,
            updatedAt: getTs(incoming.config) || newTs
          };
        }
      }
    }
  }

  // 3. Merge Wedding Configs (Timestamp-based conflict resolution)
  if (payload.weddingConfigs && typeof payload.weddingConfigs === 'object') {
    for (const [cid, incomingCfg] of Object.entries(payload.weddingConfigs)) {
      if (incomingCfg && cid) {
        const existingCfg = db.weddingConfigs[cid];
        const incomingTs = getTs(incomingCfg);
        const existingTs = getTs(existingCfg);

        // Only update if incoming is newer or equal
        if (!existingCfg || incomingTs >= existingTs) {
          const resolvedTs = Math.max(incomingTs, Date.now());
          db.weddingConfigs[cid] = {
            ...incomingCfg,
            updatedAt: resolvedTs
          };

          // Keep client object's config in sync if timestamp is higher
          const client = db.clients.find(c => c.id === cid || c.config?.id === cid);
          if (client && (incomingTs >= getTs(client))) {
            client.config = db.weddingConfigs[cid];
            client.updatedAt = resolvedTs;
            if (incomingCfg.brideGroom?.groomName && incomingCfg.brideGroom?.brideName) {
              client.clientName = `${incomingCfg.brideGroom.groomName} & ${incomingCfg.brideGroom.brideName}`;
            }
          }
        }
      }
    }
  }

  // 4. Merge Guests
  if (payload.guests && typeof payload.guests === 'object') {
    for (const [cid, guestList] of Object.entries(payload.guests)) {
      if (Array.isArray(guestList) && cid) {
        const existing = db.guests[cid] || [];
        const mergedMap = new Map<string, Guest>();
        existing.forEach(g => mergedMap.set(g.id, g));
        guestList.forEach(g => mergedMap.set(g.id, g));
        db.guests[cid] = Array.from(mergedMap.values());
      }
    }
  }

  // 5. Merge SaaS Plans
  if (payload.saasPlans && Array.isArray(payload.saasPlans) && payload.saasPlans.length > 0) {
    db.saasPlans = payload.saasPlans;
  }

  // 6. Merge Activation Requests
  if ((payload as any).activationRequests && Array.isArray((payload as any).activationRequests)) {
    if (!Array.isArray(db.activationRequests)) db.activationRequests = [];
    for (const req of (payload as any).activationRequests) {
      if (!req?.id) continue;
      const idx = db.activationRequests.findIndex(r => r.id === req.id);
      if (idx >= 0) {
        db.activationRequests[idx] = { ...db.activationRequests[idx], ...req };
      } else {
        db.activationRequests.push(req);
      }
    }
  }

  saveServerDb(db);
  return db;
}

/**
 * Activation Request operations
 */
export function createActivationRequest(request: ActivationRequest): boolean {
  const db = getServerDb();
  if (!Array.isArray(db.activationRequests)) {
    db.activationRequests = [];
  }
  const idx = db.activationRequests.findIndex(r => r.id === request.id);
  if (idx >= 0) {
    db.activationRequests[idx] = request;
  } else {
    db.activationRequests.unshift(request);
  }

  // Add system audit log
  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    timestamp: new Date().toISOString(),
    actor: request.clientName,
    action: 'Solicitação de Ativação',
    details: `Casal solicitou ativação do plano ${request.requestedPlan} via ${request.paymentMethod.toUpperCase()} (Ref: ${request.paymentReference || 'N/A'}).`,
    ip: '127.0.0.1',
    type: 'system'
  });

  return saveServerDb(db);
}

export function getActivationRequests(): ActivationRequest[] {
  const db = getServerDb();
  return Array.isArray(db.activationRequests) ? db.activationRequests : [];
}

export function approveActivationRequest(requestId: string): { success: boolean; client?: ClientWeddingSaaS; error?: string } {
  const db = getServerDb();
  if (!Array.isArray(db.activationRequests)) return { success: false, error: 'Lista vazia' };
  
  const req = db.activationRequests.find(r => r.id === requestId);
  if (!req) return { success: false, error: 'Solicitação não encontrada' };

  req.status = 'approved';
  req.resolvedAt = new Date().toISOString();

  // Find and update client
  const client = db.clients.find(c => c.id === req.clientId);
  if (client) {
    client.status = 'Active';
    client.accessRevoked = false;
    client.plan = req.requestedPlan;
    client.revenue = req.amount || (req.requestedPlan === 'Luxury' ? 110000 : req.requestedPlan === 'Premium' ? 65000 : 35000);
    client.features = {
      allowWhatsAppAutomation: req.requestedPlan === 'Luxury' || req.requestedPlan === 'Premium',
      allowCollectiveAlbum: true,
      allowGatekeeperPortal: req.requestedPlan === 'Luxury' || req.requestedPlan === 'Premium',
      maxGuests: req.requestedPlan === 'Luxury' ? 9999 : req.requestedPlan === 'Premium' ? 9999 : 150
    };

    db.auditLogs.unshift({
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      actor: 'Super Administrador',
      action: 'Pacote Aprovado & Ativado',
      details: `Solicitação aprovada para "${client.clientName}". Pacote ${req.requestedPlan} ativado com sucesso.`,
      ip: '127.0.0.1',
      type: 'security'
    });
  }

  saveServerDb(db);
  return { success: true, client };
}

export function rejectActivationRequest(requestId: string, reason?: string): { success: boolean; error?: string } {
  const db = getServerDb();
  if (!Array.isArray(db.activationRequests)) return { success: false, error: 'Lista vazia' };

  const req = db.activationRequests.find(r => r.id === requestId);
  if (!req) return { success: false, error: 'Solicitação não encontrada' };

  req.status = 'rejected';
  req.notes = reason || req.notes || 'Comprovativo não identificado ou valor divergente';
  req.resolvedAt = new Date().toISOString();

  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    timestamp: new Date().toISOString(),
    actor: 'Super Administrador',
    action: 'Solicitação Rejeitada',
    details: `Solicitação de "${req.clientName}" rejeitada: ${req.notes}`,
    ip: '127.0.0.1',
    type: 'security'
  });

  saveServerDb(db);
  return { success: true };
}
