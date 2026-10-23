import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Users, QrCode, Sliders, Shield, CreditCard, 
  Sparkles, Check, ArrowRight, BookOpen, Music, 
  LogIn, LogOut, CheckCircle2, ChevronRight, Menu, X, Gift, Lock,
  Database, Sun, Moon, Wifi, WifiOff, Settings, AlertCircle,
  LayoutDashboard, BarChart3, Calendar, FileText, HelpCircle, Bell, MessageSquare, Search, ChevronDown, ShoppingBag
} from 'lucide-react';

// Types and defaultConfig
import { Guest, GuestStatus, WeddingConfig, ClientWeddingSaaS, SystemAuditLog, UserAccount } from './types';
import { 
  INITIAL_WEDDING_CONFIG, INITIAL_GUESTS, 
  INITIAL_CLIENTS, INITIAL_AUDIT_LOGS, createBlankWeddingConfig 
} from './data/defaultConfig';

// Dashboard & Visual modules
import SaaSOverview from './components/SaaSOverview';
import VisualEditor from './components/VisualEditor';
import GuestManager from './components/GuestManager';
import GiftRegistry from './components/GiftRegistry';
import QRCheckIn from './components/QRCheckIn';
import SharedAlbumManager from './components/SharedAlbumManager';
import SuperAdmin from './components/SuperAdmin';
import PublicInvite from './components/PublicInvite';
import GatekeeperPortal from './components/GatekeeperPortal';
import AuthModal from './components/AuthModal';
import SupabaseModal from './components/SupabaseModal';
import { safeSetItem, safeGetItem, sanitizeClientsList, freeUpLocalStorageSpace } from './utils/storage';
import { isSupabaseConfigured } from './services/supabase';
import { dbService } from './services/dbService';
import { dispatchRsvpWhatsApp } from './services/messagingService';

// Run cleanup immediately on script execution
freeUpLocalStorageSpace();

type AppPersona = 'saas-landing' | 'super-admin' | 'client-dashboard' | 'public-invite' | 'gatekeeper-portal';
type ClientTab = 'overview' | 'editor' | 'guests' | 'gifts' | 'album' | 'checkin';

export default function App() {
  // --- SYSTEM DARK MODE WITH AUTO PREFERENCES & MANUAL OVERRIDE ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('kutxi_dark_mode');
    if (saved !== null) return saved === 'true';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    safeSetItem('kutxi_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Listen to system preference changes if user hasn't locked manually
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('kutxi_dark_mode');
      if (saved === null) {
        setIsDarkMode(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // --- OFFLINE MODE WITH AUTOMATIC SYNCHRONIZATION ---
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [offlineSyncNotice, setOfflineSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineSyncNotice('Conexão restabelecida! Sincronizando dados pendentes com a nuvem...');
      // Automatic sync when connection returns
      if (isSupabaseConfigured()) {
        dbService.sync.pushAllToSupabase(clients, weddingConfig, guests, auditLogs)
          .then(() => setTimeout(() => setOfflineSyncNotice(null), 3500))
          .catch(() => setTimeout(() => setOfflineSyncNotice(null), 3500));
      } else {
        setTimeout(() => setOfflineSyncNotice(null), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineSyncNotice('Modo Offline Ativo. Todas as alterações serão salvas localmente e sincronizadas quando voltar online.');
      setTimeout(() => setOfflineSyncNotice(null), 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- AUTHENTICATION & MULTI-TENANT ACCOUNTS ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('kutxi_is_authenticated') === 'true';
  });
  const [isPortariaLocked, setIsPortariaLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('portaria'));
    }
    return false;
  });
  const [isInviteLocked, setIsInviteLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('invite') || params.get('convite') || params.get('token'));
    }
    return false;
  });
  const [persona, setPersona] = useState<AppPersona>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('portaria')) return 'gatekeeper-portal';
      if (params.get('invite') || params.get('convite') || params.get('token')) return 'public-invite';
    }
    return 'saas-landing';
  });
  const [clientTab, setClientTab] = useState<ClientTab>('overview');
  const [urlGuestToken, setUrlGuestToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('invite') || params.get('convite') || params.get('token') || '';
      return token === 'convite' || token === 'true' ? '' : token;
    }
    return '';
  });

  // Active Tenant ID
  const [activeClientId, setActiveClientId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlClientId = params.get('clientId');
    if (urlClientId) return urlClientId;
    const portaria = params.get('portaria');
    if (portaria && portaria !== 'true') return portaria;
    return localStorage.getItem('kutxi_active_client_id') || 'client_1';
  });

  const isInitialMount = useRef(true);

  // Active User: defaults to empty or superadmin
  const [activeUser, setActiveUser] = useState<string>(() => {
    return localStorage.getItem('kutxi_active_user') || 'superadmin';
  });

  const [activeUserRole, setActiveUserRole] = useState<'superadmin' | 'couple' | 'staff'>(() => {
    return (localStorage.getItem('kutxi_active_role') as any) || 'superadmin';
  });

  // Default User Accounts with requested superadmin (user: superadmin / pass: admin123)
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('kutxi_user_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to parse user accounts:", e);
    }
    return [
      { 
        username: 'superadmin', 
        pass: 'admin123', 
        clientId: 'system', 
        clientName: 'Super Administrador', 
        role: 'superadmin' 
      }
    ];
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Wedding Config (Starts virgin and clean for new clients, completely isolated)
  const [weddingConfig, setWeddingConfig] = useState<WeddingConfig>(() => {
    try {
      const cid = (new URLSearchParams(window.location.search).get('clientId')) || 
                   localStorage.getItem('kutxi_active_client_id') || 'client_1';
      const directSaved = localStorage.getItem(`kutxi_wedding_config_${cid}`);
      if (directSaved) return JSON.parse(directSaved);
      const savedClients = localStorage.getItem('kutxi_clients');
      if (savedClients) {
        const list = JSON.parse(savedClients);
        const match = list.find((c: any) => c.id === cid || c.config?.id === cid);
        if (match?.config) return match.config;
      }
      if (cid === 'client_1') {
        const savedGlobal = localStorage.getItem('kutxi_wedding_config');
        if (savedGlobal) return JSON.parse(savedGlobal);
        return INITIAL_WEDDING_CONFIG;
      }
      return createBlankWeddingConfig(cid);
    } catch (e) {}
    return createBlankWeddingConfig('client_1');
  });

  // Guest list (Starts clean from virgin state per tenant)
  const [guests, setGuests] = useState<Guest[]>(() => {
    try {
      const cid = (new URLSearchParams(window.location.search).get('clientId')) || 
                   localStorage.getItem('kutxi_active_client_id') || 'client_1';
      const saved = localStorage.getItem(`kutxi_guests_${cid}`);
      if (saved) return JSON.parse(saved);
      if (cid === 'client_1') {
        const savedGlobal = localStorage.getItem('kutxi_guests');
        if (savedGlobal) return JSON.parse(savedGlobal);
        return INITIAL_GUESTS;
      }
      return [];
    } catch (e) {}
    return [];
  });

  // Clients list (Virgin clean state)
  const [clients, setClients] = useState<ClientWeddingSaaS[]>(() => {
    try {
      const saved = localStorage.getItem('kutxi_clients');
      return saved ? sanitizeClientsList(JSON.parse(saved)) : INITIAL_CLIENTS;
    } catch (e) {
      return INITIAL_CLIENTS;
    }
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('kutxi_audit_logs');
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch (e) {
      return INITIAL_AUDIT_LOGS;
    }
  });

  // Save changes to LocalStorage on updates
  useEffect(() => {
    safeSetItem('kutxi_user_accounts', JSON.stringify(userAccounts));
  }, [userAccounts]);

  useEffect(() => {
    safeSetItem('kutxi_active_client_id', activeClientId);
  }, [activeClientId]);

  useEffect(() => {
    safeSetItem('kutxi_active_user', activeUser);
  }, [activeUser]);

  useEffect(() => {
    safeSetItem('kutxi_active_role', activeUserRole);
  }, [activeUserRole]);

  const loadedClientIdRef = useRef<string>(activeClientId);

  const switchActiveTenant = (newCid: string, initialConfig?: WeddingConfig, initialGuests?: Guest[]) => {
    let resolvedCid = newCid;
    const savedClients = localStorage.getItem('kutxi_clients');
    if (savedClients) {
      try {
        const list: ClientWeddingSaaS[] = JSON.parse(savedClients);
        const match = list.find(c => c.id === newCid || c.config?.id === newCid);
        if (match && match.id !== newCid) {
          resolvedCid = match.id;
        }
      } catch (e) {}
    }

    loadedClientIdRef.current = resolvedCid;
    setActiveClientId(resolvedCid);
    safeSetItem('kutxi_active_client_id', resolvedCid);

    // 1. Resolve Config
    let targetConfig = initialConfig;
    if (!targetConfig) {
      const direct = localStorage.getItem(`kutxi_wedding_config_${resolvedCid}`);
      if (direct) {
        try { targetConfig = JSON.parse(direct); } catch (e) {}
      }
    }
    if (!targetConfig && savedClients) {
      try {
        const list: ClientWeddingSaaS[] = JSON.parse(savedClients);
        const match = list.find(c => c.id === resolvedCid || c.config?.id === resolvedCid);
        if (match?.config) targetConfig = match.config;
      } catch (e) {}
    }
    if (!targetConfig) {
      if (resolvedCid === 'client_1') {
        const savedGlobal = localStorage.getItem('kutxi_wedding_config');
        targetConfig = savedGlobal ? JSON.parse(savedGlobal) : INITIAL_WEDDING_CONFIG;
      } else {
        targetConfig = createBlankWeddingConfig(resolvedCid);
      }
    }

    // 2. Resolve Guests
    let targetGuests = initialGuests;
    if (!targetGuests) {
      const savedG = localStorage.getItem(`kutxi_guests_${resolvedCid}`);
      if (savedG) {
        try { targetGuests = JSON.parse(savedG); } catch (e) {}
      }
    }
    if (!targetGuests) {
      if (resolvedCid === 'client_1') {
        const savedGlobalG = localStorage.getItem('kutxi_guests');
        targetGuests = savedGlobalG ? JSON.parse(savedGlobalG) : INITIAL_GUESTS;
      } else {
        targetGuests = [];
      }
    }

    const finalConfig = targetConfig || INITIAL_WEDDING_CONFIG;
    const finalGuests = targetGuests || [];

    setWeddingConfig(finalConfig);
    setGuests(finalGuests);
    safeSetItem(`kutxi_wedding_config_${resolvedCid}`, JSON.stringify(finalConfig));
    safeSetItem(`kutxi_guests_${resolvedCid}`, JSON.stringify(finalGuests));
    if (resolvedCid === 'client_1') {
      safeSetItem('kutxi_wedding_config', JSON.stringify(finalConfig));
      safeSetItem('kutxi_guests', JSON.stringify(finalGuests));
    }
  };

  // Synchronize dynamic client config and guest list when activeClientId changes
  useEffect(() => {
    if (loadedClientIdRef.current !== activeClientId) {
      switchActiveTenant(activeClientId);
    }
  }, [activeClientId]);

  // Auto save weddingConfig inside dynamic client's state and localStorage
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!activeClientId || activeClientId === 'system') return;
    if (loadedClientIdRef.current !== activeClientId) return;
    if (weddingConfig.clientId && weddingConfig.clientId !== activeClientId && activeClientId !== 'client_1') return;

    safeSetItem(`kutxi_wedding_config_${activeClientId}`, JSON.stringify(weddingConfig));
    if (activeClientId === 'client_1') {
      safeSetItem('kutxi_wedding_config', JSON.stringify(weddingConfig));
    }
    
    // Instant synchronization with clients state
    setClients(prev => {
      const updated = prev.map(c => {
        if (c.id === activeClientId || c.config?.id === activeClientId) {
          return {
            ...c,
            clientName: `${weddingConfig.brideGroom?.groomName || 'Noivo'} & ${weddingConfig.brideGroom?.brideName || 'Noiva'}`,
            weddingDate: weddingConfig.date ? weddingConfig.date.split('T')[0] : c.weddingDate,
            config: weddingConfig
          };
        }
        return c;
      });
      safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(updated)));
      return updated;
    });
  }, [weddingConfig, activeClientId]);

  // Save guests when guests state changes under their respective client ID
  useEffect(() => {
    if (isInitialMount.current) return;
    if (!activeClientId || activeClientId === 'system') return;
    if (loadedClientIdRef.current !== activeClientId) return;

    safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(guests));
    if (activeClientId === 'client_1') {
      safeSetItem('kutxi_guests', JSON.stringify(guests));
    }
  }, [guests, activeClientId]);

  useEffect(() => {
    safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(clients)));
  }, [clients]);

  useEffect(() => {
    safeSetItem('kutxi_audit_logs', JSON.stringify(auditLogs.slice(0, 30)));
  }, [auditLogs]);

  // URL routing parse logic on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portaria = params.get('portaria');
    const invite = params.get('invite') || params.get('convite') || params.get('token');
    const planos = params.get('planos');
    let urlClientId = params.get('clientId');

    if (portaria && portaria !== 'true') {
      urlClientId = portaria;
    }

    if (urlClientId) {
      safeSetItem('kutxi_active_client_id', urlClientId);
      setActiveClientId(urlClientId);
    }

    if (portaria) {
      setPersona('gatekeeper-portal');
      setIsPortariaLocked(true);
      addAuditLog('Portaria', 'Acesso via Link Direto', `Portaria acessada para o casamento ${urlClientId || 'padrão'}.`, 'auth');
    } else if (invite) {
      setPersona('public-invite');
      setIsInviteLocked(true);
      const cleanToken = invite === 'convite' || invite === 'true' ? '' : invite;
      setUrlGuestToken(cleanToken);
      addAuditLog('Convidado', 'Acesso ao Convite', `Convite acessado via token: ${cleanToken || 'geral'}`, 'rsvp');
    } else if (planos) {
      setPersona('saas-landing');
      setIsInviteLocked(false);
      setTimeout(() => {
        document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, []);

  // --- LOG WRITER UTILITY ---
  const addAuditLog = (actor: string, action: string, details: string, type: 'system' | 'auth' | 'rsvp' | 'messaging' | 'security' = 'system') => {
    const newLog: SystemAuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
      type,
      ip: '102.214.34.' + Math.floor(Math.random() * 250 + 1)
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // --- HANDLERS ---
  const handleUpdateWeddingConfig = (updated: WeddingConfig) => {
    setWeddingConfig(updated);
    if (activeClientId) {
      safeSetItem(`kutxi_wedding_config_${activeClientId}`, JSON.stringify(updated));
      safeSetItem('kutxi_wedding_config', JSON.stringify(updated));
      dbService.weddingConfig.save(activeClientId, updated).catch(() => {});

      // Instant synchronization across the app
      setClients(prev => {
        const next = prev.map(c => {
          if (c.id === activeClientId || c.config?.id === activeClientId || (activeClientId === 'client_1' && c.id === 'client_1')) {
            return {
              ...c,
              clientName: `${updated.brideGroom?.groomName || 'Noivo'} & ${updated.brideGroom?.brideName || 'Noiva'}`,
              weddingDate: updated.date ? updated.date.split('T')[0] : c.weddingDate,
              config: updated
            };
          }
          return c;
        });
        safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(next)));
        return next;
      });

      // Broadcast update across windows and previews
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kutxi_wedding_config_changed', {
          detail: { clientId: activeClientId, config: updated }
        }));
      }
    }
    addAuditLog(`${updated.brideGroom?.groomName || 'Noivo'} & ${updated.brideGroom?.brideName || 'Noiva'}`, 'Convite Atualizado', 'Informações e estilos do casamento sincronizados instantaneamente.', 'system');
  };

  /**
   * CRITICAL REQUIREMENT:
   * "Atualize a função 'handleAddGuest' para disparar automaticamente a notificação quando um novo convidado for inserido. e garanta que o log de erros registre cada falha de envio., garantindo que o disparo ocorra de forma assíncrona para não bloquear a interface."
   */
  const handleAddGuest = (guest: Guest) => {
    setGuests(prev => {
      const next = [guest, ...prev];
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });

    addAuditLog('Gestão de Convidados', 'Convidado Adicionado', `Convidado "${guest.name}" cadastrado. Token RSVP gerado: ${guest.rsvpToken}`, 'rsvp');

    // ASYNCHRONOUS DISPATCH VIA WHATSAPP / WEBHOOK: DOES NOT BLOCK UI!
    dispatchRsvpWhatsApp(guest, weddingConfig)
      .then(res => {
        if (res.success) {
          addAuditLog('Mensageria WhatsApp', 'Notificação Disparada', `Token de RSVP enviado com sucesso para ${guest.name} (${guest.phone || 'WhatsApp'}).`, 'messaging');
        } else {
          // Log error explicitly
          addAuditLog('Mensageria WhatsApp', 'Falha no Envio de Token', `Erro ao enviar RSVP para ${guest.name}: ${res.error}`, 'messaging');
        }
      })
      .catch(err => {
        addAuditLog('Mensageria WhatsApp', 'Erro Crítico no Disparo', `Exceção ao disparar para ${guest.name}: ${err?.message || 'Falha de rede'}`, 'messaging');
      });
  };

  const handleUpdateGuest = (updated: Guest) => {
    setGuests(prev => {
      const next = prev.map(g => g.id === updated.id ? updated : g);
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });
    addAuditLog('Gestão de Convidados', 'Convidado Atualizado', `Parâmetros do convidado "${updated.name}" modificados.`, 'rsvp');
  };

  const handleDeleteGuest = (id: string) => {
    const guest = guests.find(g => g.id === id);
    setGuests(prev => {
      const next = prev.filter(g => g.id !== id);
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });
    if (guest) {
      addAuditLog('Gestão de Convidados', 'Convidado Excluído', `Convidado "${guest.name}" removido da lista.`, 'rsvp');
    }
  };

  const handleBulkStatusUpdate = (ids: string[], status: 'Confirmed' | 'Pending' | 'Declined') => {
    const pStatus = status === 'Confirmed' ? 'Confirmado' : status === 'Declined' ? 'Recusado' : 'Pendente';
    setGuests(prev => {
      const next = prev.map(g => ids.includes(g.id) ? { ...g, status, confirmedAt: status === 'Confirmed' ? new Date().toISOString() : undefined } : g);
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });
    addAuditLog('Gestão de Convidados', 'Status em Lote', `Atualizado status de ${ids.length} convidados para "${pStatus}".`, 'rsvp');
  };

  const handleDoorCheckIn = (guestId: string, plusOnesCount: number) => {
    setGuests(prev => prev.map(g => g.id === guestId ? {
      ...g,
      checkedIn: true,
      plusOnesConfirmed: plusOnesCount,
      checkedInAt: new Date().toISOString()
    } : g));
    
    const guest = guests.find(g => g.id === guestId);
    if (guest) {
      addAuditLog('Scanner de Portaria', 'Check-In Realizado', `Convidado "${guest.name}" entrou na recepção. Grupo: 1 + ${plusOnesCount} acompanhantes.`, 'auth');
    }
  };

  const handleAddClient = (client: ClientWeddingSaaS, accountsToAdd?: { username: string; pass: string }[]) => {
    setClients(prev => [...prev, client]);
    if (accountsToAdd && accountsToAdd.length > 0) {
      setUserAccounts(prev => [
        ...prev,
        ...accountsToAdd.map(acc => ({
          username: acc.username,
          pass: acc.pass,
          clientId: client.id,
          clientName: client.clientName,
          role: 'couple' as const
        }))
      ]);
    }
    addAuditLog('Super Admin', 'Novo Casal Registrado', `Assinatura iniciada para "${client.clientName}" no plano ${client.plan}.`, 'system');
  };

  const handleUpdateClient = (updated: ClientWeddingSaaS, updatedAccounts?: { username: string; pass: string }[]) => {
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (updated.config) {
      handleUpdateWeddingConfig(updated.config);
    }
    addAuditLog('Super Admin', 'Licença Atualizada', `Casal "${updated.clientName}" atualizado. Status: ${updated.status}.`, 'security');
  };

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    setClients(prev => prev.filter(c => c.id !== clientId));
    setUserAccounts(prev => prev.filter(acc => acc.clientId !== clientId));
    addAuditLog('Super Admin', 'Casal Removido', `Assinatura e acessos de "${client.clientName}" excluídos.`, 'security');
  };

  const handleGuestRsvpFromInvite = (
    token: string, 
    status: GuestStatus, 
    companions: number, 
    dietary: string, 
    notes: string,
    extraGuest?: Partial<Guest>
  ) => {
    let targetGuestName = extraGuest?.name || token;
    setGuests(prev => {
      const idx = prev.findIndex(g => g.rsvpToken === token || g.name === extraGuest?.name);
      let next: Guest[];
      if (idx >= 0) {
        next = prev.map((g, i) => i === idx ? {
          ...g,
          status,
          plusOnesConfirmed: companions,
          companionName: extraGuest?.companionName || g.companionName,
          dietaryRequirements: dietary || g.dietaryRequirements,
          notes: notes || g.notes,
          approvedByCouple: extraGuest?.approvedByCouple !== undefined ? extraGuest.approvedByCouple : g.approvedByCouple,
          requestedAt: g.requestedAt || new Date().toISOString(),
          confirmedAt: new Date().toISOString()
        } : g);
      } else {
        const newG: Guest = {
          id: extraGuest?.id || ('g_' + Date.now()),
          name: extraGuest?.name || token,
          firstName: extraGuest?.firstName,
          lastName: extraGuest?.lastName,
          email: extraGuest?.email || '',
          phone: extraGuest?.phone || '',
          group: extraGuest?.group || 'Friends',
          tableNumber: extraGuest?.tableNumber || 'Mesa Convidados',
          maxPlusOnes: Math.max(companions, 1),
          plusOnesConfirmed: companions,
          companionName: extraGuest?.companionName,
          status,
          approvedByCouple: extraGuest?.approvedByCouple || false,
          requestedAt: new Date().toISOString(),
          dietaryRequirements: dietary,
          notes,
          rsvpToken: token,
          invitationViews: 1,
          checkedIn: false,
          confirmedAt: new Date().toISOString()
        };
        next = [newG, ...prev];
      }
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
      }
      return next;
    });

    addAuditLog(targetGuestName, 'RSVP Respondido', `Confirmação de presença via convite. Status: ${status}, vagas: ${companions}.`, 'rsvp');
  };

  const isSuperAdmin = isAuthenticated && (activeUser === 'superadmin' || activeUser === 'Ki-eventos' || activeUserRole === 'superadmin');

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#141316] text-stone-800 dark:text-stone-100 flex flex-col justify-between transition-colors duration-200">
      {/* Screen Reader Skip Link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:p-3 focus:bg-[#8E2840] focus:text-white focus:rounded-xl focus:shadow-xl font-bold text-xs"
      >
        Pular para o conteúdo principal
      </a>

      {/* Offline sync banner */}
      <AnimatePresence>
        {offlineSyncNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            role="status"
            aria-live="polite"
            className={`px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 border-b ${
              isOnline 
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' 
                : 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
            }`}
          >
            {isOnline ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
            <span>{offlineSyncNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER - Luminous Frosted Bar */}
      {!isPortariaLocked && !isInviteLocked && (
        <header className="bg-white/85 dark:bg-[#18161B]/90 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800/80 text-stone-800 dark:text-stone-100 sticky top-0 z-40 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              
              {/* Left branding */}
              <div 
                onClick={() => setPersona('saas-landing')}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#8E2840] text-white shadow-xs group-hover:scale-105 transition-transform">
                  <Heart className="w-4 h-4 text-white fill-white" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-sm tracking-widest text-stone-900 dark:text-white uppercase">Kutxi</span>
                  <span className="text-[10px] text-[#8E2840] dark:text-rose-400 font-medium tracking-wide">
                    Casamentos
                  </span>
                </div>
              </div>

              {/* Middle Navigation Tabs */}
              <nav className="hidden md:flex items-center gap-1" aria-label="Navegação Principal">
                {[
                  { id: 'saas-landing', label: 'Início', icon: Sparkles, public: true },
                  { id: 'client-dashboard', label: 'Painel dos Noivos', icon: Heart, public: false },
                  { id: 'super-admin', label: 'Super Administrador', icon: Shield, public: false },
                  { id: 'gatekeeper-portal', label: 'Portaria & Scanner', icon: QrCode, public: false },
                  { id: 'public-invite', label: 'Ver Convite', icon: BookOpen, public: true }
                ].filter(item => {
                  if (item.id === 'super-admin') {
                    return isSuperAdmin;
                  }
                  return true;
                }).map((item) => {
                  const Icon = item.icon;
                  const isActive = persona === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (!isAuthenticated && !item.public) {
                          setSelectedPackage(null);
                          setAuthTab('login');
                          setShowAuthModal(true);
                        } else {
                          setPersona(item.id as AppPersona);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-rose-50/90 dark:bg-rose-950/50 text-[#8E2840] dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60 shadow-2xs font-semibold' 
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100/80 dark:hover:bg-stone-850/60 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Right Controls: Dark Mode, Sleek Supabase Indicator & Profile */}
              <div className="flex items-center gap-2">
                {/* Dark Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  aria-label={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                  className="p-2 rounded-xl bg-stone-100/80 dark:bg-stone-850 border border-stone-200/70 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 transition-colors cursor-pointer"
                  title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-stone-600" />}
                </button>

                {/* SUPABASE INDICATOR ICON - APENAS SUPERADMIN */}
                {isAuthenticated && isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowSupabaseModal(true)}
                    className="p-2 rounded-xl bg-stone-100/80 dark:bg-stone-850 border border-stone-200/70 dark:border-stone-800 hover:bg-stone-200/60 transition-all cursor-pointer flex items-center gap-1.5"
                    title={isSupabaseConfigured() ? 'Supabase Nuvem Conectado' : 'Supabase (Modo Local Ativo)'}
                    aria-label="Status do banco de dados"
                  >
                    <Database className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                    <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-600'}`} />
                  </button>
                )}

                {isAuthenticated ? (
                  <div className="flex items-center gap-2 pl-1 border-l border-stone-200/70 dark:border-stone-800">
                    <div className="hidden sm:flex flex-col items-end text-right">
                      <span className="text-xs font-semibold text-stone-900 dark:text-white">
                        {isSuperAdmin ? 'Super Administrador' : activeUser}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {isSuperAdmin ? 'Acesso Total' : 'Noivos Kutxi'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setIsAuthenticated(false);
                        safeSetItem('kutxi_is_authenticated', 'false');
                        setActiveUser('superadmin');
                        setPersona('saas-landing');
                        addAuditLog('Segurança', 'Logout Realizado', 'Encerramento de sessão.', 'auth');
                      }}
                      className="p-2 bg-stone-100/80 hover:bg-rose-50 dark:bg-stone-850 dark:hover:bg-rose-950/40 border border-stone-200/70 dark:border-stone-800 text-stone-500 hover:text-[#8E2840] dark:text-stone-400 dark:hover:text-rose-300 rounded-xl transition-colors cursor-pointer"
                      title="Sair"
                      aria-label="Sair"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedPackage(null);
                      setAuthTab('login');
                      setShowAuthModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Entrar / Cadastrar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* MAIN CONTENT AREA */}
      <main id="main-content" className="flex-1">
        <AnimatePresence mode="wait">
          {/* SAAS LANDING VIEW */}
          {persona === 'saas-landing' && (
            <motion.div
              key="saas-landing-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-16 pb-24 relative overflow-hidden"
            >
              {/* Soft Ambient Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-rose-100/40 via-amber-50/30 to-transparent dark:from-rose-950/20 dark:via-transparent blur-3xl -z-10 pointer-events-none" />

              {/* Hero */}
              <section className="pt-12 md:pt-16 px-6 max-w-7xl mx-auto text-center space-y-5">
                <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#8E2840] dark:text-rose-300">
                  <Sparkles className="w-3.5 h-3.5 text-[#B89758]" />
                  <span>Plataforma Exclusiva de Casamentos & Portaria</span>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif tracking-tight text-stone-900 dark:text-white font-light leading-tight">
                  Gestão Elegante para <br />
                  <span className="italic font-normal text-[#8E2840] dark:text-rose-400">Casamentos Memoráveis</span>
                </h1>

                <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400 max-w-xl mx-auto leading-relaxed font-light">
                  Controle a lista de convidados, envie passes digitais personalizados com QR Code via WhatsApp e assegure uma portaria acolhedora e impecável.
                </p>

                {/* Quick Cockpit Navigation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 max-w-4xl mx-auto pt-6 text-left">
                  <div 
                    onClick={() => {
                      if (!isAuthenticated) {
                        setShowAuthModal(true);
                      } else {
                        setPersona('client-dashboard');
                        setClientTab('overview');
                      }
                    }}
                    className="bg-white dark:bg-stone-900/90 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-[#8E2840]/40 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-[#8E2840] dark:text-rose-300 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-[#8E2840]" />
                      </div>
                      <h3 className="font-semibold text-stone-900 dark:text-white text-sm">Painel dos Noivos</h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-light">
                        Organize mesas, personalize o convite oficial, configure o IBAN e acompanhe as confirmações de presença.
                      </p>
                    </div>
                    <span className="mt-5 text-xs font-semibold text-[#8E2840] dark:text-rose-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Aceder ao Painel <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div 
                    onClick={() => setPersona('gatekeeper-portal')}
                    className="bg-white dark:bg-stone-900/90 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-emerald-500/40 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                        <QrCode className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="font-semibold text-stone-900 dark:text-white text-sm">Portaria & Concierge</h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-light">
                        Scanner de QR Code em tempo real com câmera para recepcionistas validarem a entrada dos convidados.
                      </p>
                    </div>
                    <span className="mt-5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Abrir Portaria <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {isSuperAdmin && (
                    <div 
                      onClick={() => setPersona('super-admin')}
                      className="bg-white dark:bg-stone-900/90 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-stone-400 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-white flex items-center justify-center">
                          <Shield className="w-5 h-5 text-stone-700 dark:text-stone-300" />
                        </div>
                        <h3 className="font-semibold text-stone-900 dark:text-white text-sm">Super Administrador</h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-light">
                          Gestão de todos os casamentos, licenças, faturamento ARR em Kwanzas, Webhooks e logs do sistema.
                        </p>
                      </div>
                      <span className="mt-5 text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Consola Total <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* COMMERCIAL PLANS & EXCLUSIVE PERKS */}
              <section id="pricing-section" className="px-6 max-w-7xl mx-auto space-y-8 text-center pt-6 scroll-mt-20">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#B89758] font-bold">
                    <span>Planos Comerciais em Kwanzas (AOA)</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-serif text-stone-900 dark:text-white font-medium">
                    Planos com Funcionalidades Exclusivas
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto font-light">
                    Do convite gratuito com até 20 convites à celebração monumental com portaria inteligente
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto text-left text-xs">
                  {[
                    {
                      name: 'Plano Grátis (Degustação)',
                      price: '0 Kz',
                      period: 'degustação',
                      desc: 'Ideal para experimentar a plataforma e criar o seu convite.',
                      perk: 'Até 20 Convites Digitais',
                      features: [
                        'Até 20 convites digitais incluídos',
                        'Página do convite interativo ativa',
                        'Confirmação de presença (RSVP simples)',
                        'Acesso restrito a funções avançadas (sem scanner de portaria QR, sem trilha ilimitada, sem exportação completa)'
                      ],
                      cta: 'Começar Grátis (20 Convites)',
                      highlight: false
                    },
                    {
                      name: 'Plano Essencial',
                      price: '45.000 Kz',
                      period: 'único',
                      desc: 'Para celebrações intimistas e familiares.',
                      perk: 'Download do Convite em PDF',
                      features: ['Até 100 convidados', '1 GB de armazenamento', 'Download em PDF formato A5', 'Suporte por e-mail'],
                      cta: 'Escolher Essencial',
                      highlight: false
                    },
                    {
                      name: 'Plano Premium',
                      price: '135.000 Kz',
                      period: 'único',
                      desc: 'O mais querido para casamentos tradicionais.',
                      perk: 'Mural de Fotos & Trilha Spotify',
                      features: ['Até 300 convidados', '5 GB de fotos em alta resolução', 'Trilha sonora Spotify incorporada', 'Moderação de mensagens'],
                      cta: 'Escolher Premium',
                      highlight: false
                    },
                    {
                      name: 'Plano Luxo VIP',
                      price: '225.000 Kz',
                      period: 'único',
                      desc: 'A experiência completa e sem limites.',
                      perk: 'Convidados Ilimitados & Scanner QR',
                      features: ['Convidados ilimitados', 'Portaria inteligente com scanner', 'Disparo automático via Webhook', 'Suporte VIP WhatsApp'],
                      cta: 'Assinar Luxo VIP',
                      highlight: true
                    }
                  ].map((tier, idx) => (
                    <div
                      key={idx}
                      className={`bg-white dark:bg-stone-900/90 p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                        tier.highlight 
                          ? 'border-[#B89758] dark:border-[#B89758]/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-[#B89758]/30 scale-[1.02]' 
                          : 'border-stone-200/80 dark:border-stone-800 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]'
                      }`}
                    >
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-500 dark:text-stone-400 text-[10px] uppercase tracking-wider">{tier.name}</span>
                            {tier.highlight && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#9E7A36] bg-[#FAF6EE] dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-[#E9DEC6] dark:border-amber-900/50">
                                Mais Escolhido
                              </span>
                            )}
                          </div>
                          <div className="text-2xl font-bold font-serif text-stone-900 dark:text-white mt-1.5">{tier.price}</div>
                          <span className="text-[10px] text-stone-400">pagamento {tier.period}</span>
                        </div>

                        {/* Exclusive perk highlight */}
                        <div className="p-3 bg-[#FAF6EE] dark:bg-amber-950/30 rounded-xl border border-[#E9DEC6]/70 dark:border-amber-900/40 text-[11px] text-[#9E7A36] dark:text-amber-200 font-medium">
                          ✦ {tier.perk}
                        </div>

                        <ul className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 font-light">
                          {tier.features.map((f, fIdx) => (
                            <li key={fIdx} className="flex items-center gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPackage(tier.name);
                          setAuthTab('register');
                          setShowAuthModal(true);
                        }}
                        className={`w-full py-2.5 rounded-xl font-medium text-xs mt-6 transition-all cursor-pointer shadow-xs ${
                          tier.highlight 
                            ? 'bg-[#8E2840] hover:bg-[#782236] text-white shadow-sm' 
                            : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200/80 text-stone-700 dark:text-stone-200'
                        }`}
                      >
                        {tier.cta}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* SUPER ADMIN CONSOLE */}
          {persona === 'super-admin' && (
            isSuperAdmin ? (
              <motion.div
                key="super-admin-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 md:px-8 py-6 space-y-6 max-w-7xl mx-auto"
              >
                <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h1 className="text-xl md:text-2xl font-display font-bold text-slate-900 dark:text-white">
                      Consola do Super Administrador
                    </h1>
                    <p className="text-xs text-slate-400">
                      Gestão total de casais, validação de licenças, APIs de mensageria e monitoramento do sistema
                    </p>
                  </div>
                  <button
                    onClick={() => setPersona('saas-landing')}
                    className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Voltar ao Início
                  </button>
                </div>

                <SuperAdmin
                  clients={clients}
                  userAccounts={userAccounts}
                  auditLogs={auditLogs}
                  onAddClient={handleAddClient}
                  onUpdateClient={handleUpdateClient}
                  onDeleteClient={handleDeleteClient}
                />
              </motion.div>
            ) : (
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
                <Lock className="w-10 h-10 text-slate-400" />
                <h2 className="text-lg font-bold">Acesso Restrito ao Super Administrador</h2>
                <p className="text-xs text-slate-400">Faça login com as credenciais do superadmin para acessar.</p>
                <button
                  onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}
                  className="px-5 py-2 bg-rose-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Entrar como Superadmin
                </button>
              </div>
            )
          )}

          {/* CLIENT DASHBOARD */}
          {persona === 'client-dashboard' && (
            <motion.div
              key="client-dashboard-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
            >
              {/* Client Dashboard Navigation Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 dark:border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#8E2840]/10 dark:bg-rose-950/40 text-[#8E2840] dark:text-rose-400 flex items-center justify-center font-bold">
                    <Heart className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold font-serif text-stone-900 dark:text-white">
                      {weddingConfig.brideGroom?.groomName || 'Noivo'} & {weddingConfig.brideGroom?.brideName || 'Noiva'}
                    </h1>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Painel de Controle dos Noivos · {activeClientId === 'client_1' ? 'Plano Luxo VIP' : 'Plano Ativo'}
                    </p>
                  </div>
                </div>

                {/* Submenu Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
                    { id: 'guests', label: 'Convidados & RSVP', icon: Users },
                    { id: 'editor', label: 'Personalizar Convite', icon: Sliders },
                    { id: 'gifts', label: 'Lista de Presentes', icon: Gift },
                    { id: 'album', label: 'Álbum Partilhado', icon: BookOpen },
                    { id: 'checkin', label: 'Portaria & QR', icon: QrCode },
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = clientTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setClientTab(tab.id as ClientTab)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#8E2840] text-white shadow-xs'
                            : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white border border-stone-200/80 dark:border-stone-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Contents */}
              {clientTab === 'overview' && (
                <SaaSOverview
                  guests={guests}
                  config={weddingConfig}
                  planName={activeClientId === 'client_1' ? 'Plano Luxo VIP' : 'Plano Ativo'}
                  onUpdateConfig={handleUpdateWeddingConfig}
                  onNavigateTab={tab => setClientTab(tab as ClientTab)}
                  onOpenPublicInvite={() => setPersona('public-invite')}
                />
              )}
              {clientTab === 'editor' && (
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-xs border border-stone-200/80 dark:border-stone-800">
                  <VisualEditor
                    config={weddingConfig}
                    onSave={handleUpdateWeddingConfig}
                  />
                </div>
              )}
              {clientTab === 'guests' && (
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-xs border border-stone-200/80 dark:border-stone-800">
                  <GuestManager
                    guests={guests}
                    clientId={activeClientId}
                    config={weddingConfig}
                    onAddGuest={handleAddGuest}
                    onUpdateGuest={handleUpdateGuest}
                    onDeleteGuest={handleDeleteGuest}
                    onBulkStatusUpdate={handleBulkStatusUpdate}
                  />
                </div>
              )}
              {clientTab === 'gifts' && (
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-xs border border-stone-200/80 dark:border-stone-800">
                  <GiftRegistry
                    config={weddingConfig}
                    onUpdateConfig={handleUpdateWeddingConfig}
                  />
                </div>
              )}
              {clientTab === 'album' && (
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-xs border border-stone-200/80 dark:border-stone-800">
                  <SharedAlbumManager
                    config={weddingConfig}
                  />
                </div>
              )}
              {clientTab === 'checkin' && (
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-xs border border-stone-200/80 dark:border-stone-800">
                  <QRCheckIn
                    guests={guests}
                    onCheckIn={handleDoorCheckIn}
                    clientId={activeClientId}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* GATEKEEPER PORTAL */}
          {persona === 'gatekeeper-portal' && (
            <motion.div
              key="gatekeeper-portal-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen bg-slate-900"
            >
              <GatekeeperPortal
                guests={guests}
                onCheckIn={handleDoorCheckIn}
                clientName={`${weddingConfig.brideGroom?.groomName || 'Noivo'} & ${weddingConfig.brideGroom?.brideName || 'Noiva'}`}
                onExitPortal={() => setPersona('saas-landing')}
                isLocked={isPortariaLocked}
              />
            </motion.div>
          )}

          {/* PUBLIC INVITE VIEW */}
          {persona === 'public-invite' && (
            <motion.div
              key="public-invite-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen"
            >
              <PublicInvite
                config={weddingConfig}
                guestToken={urlGuestToken}
                allGuests={guests}
                onGuestRsvpSubmit={handleGuestRsvpFromInvite}
                onUpdateConfig={handleUpdateWeddingConfig}
                onNavigateToPlans={() => {
                  setIsInviteLocked(false);
                  setPersona('saas-landing');
                  setTimeout(() => {
                    document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      {!isPortariaLocked && !isInviteLocked && (
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-400">
          Kutxi Plataforma SaaS de Casamentos · Sincronização em Tempo Real · AOA (Kwanzas)
        </footer>
      )}

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab={authTab}
        selectedPackage={selectedPackage}
        userAccounts={userAccounts}
        onLoginSuccess={(username, clientId, role) => {
          setIsAuthenticated(true);
          safeSetItem('kutxi_is_authenticated', 'true');
          setActiveUser(username);
          setActiveUserRole((role as any) || (username === 'superadmin' ? 'superadmin' : 'couple'));
          setActiveClientId(clientId);
          
          if (username === 'superadmin' || role === 'superadmin') {
            setPersona('super-admin');
          } else {
            setPersona('client-dashboard');
            setClientTab('overview');
          }
          addAuditLog(username, 'Login Efetuado', `Acesso ao sistema com sucesso.`, 'auth');
        }}
        onRegisterSuccess={(newClient, user1, user2) => {
          handleAddClient(newClient, [user1, user2]);
        }}
      />

      {/* SUPABASE CLOUD MODAL - APENAS SUPERADMIN */}
      {isSuperAdmin && (
        <SupabaseModal
          isOpen={showSupabaseModal}
          onClose={() => setShowSupabaseModal(false)}
          clients={clients}
          weddingConfig={weddingConfig}
          guests={guests}
          auditLogs={auditLogs}
        />
      )}
    </div>
  );
}
