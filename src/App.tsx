import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Users, QrCode, Sliders, Shield, CreditCard, 
  Sparkles, Check, ArrowRight, BookOpen, Music, 
  LogIn, LogOut, CheckCircle2, ChevronRight, Menu, X, Gift, Lock,
  Database, Sun, Moon, Wifi, WifiOff, Settings, AlertCircle,
  LayoutDashboard, BarChart3, Calendar, FileText, HelpCircle, Bell, MessageSquare, Search, ChevronDown, ShoppingBag,
  Cloud, RefreshCw
} from 'lucide-react';

// Types and defaultConfig
import { Guest, GuestStatus, WeddingConfig, ClientWeddingSaaS, SystemAuditLog, UserAccount } from './types';
import { 
  INITIAL_WEDDING_CONFIG, INITIAL_GUESTS, 
  INITIAL_CLIENTS, INITIAL_USER_ACCOUNTS,
  CONFIG_JOAO_ALICE, CONFIG_PEDRO_PUREZA, CONFIG_OSVALDO_NICIDIA,
  INITIAL_AUDIT_LOGS, createBlankWeddingConfig,
  DEFAULT_PLANS, SaaSPlanConfig
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
import FeatureGate from './components/FeatureGate';
import ActivationRequestModal from './components/ActivationRequestModal';
import { usePlanPermissions } from './hooks/usePlanPermissions';
import { safeSetItem, safeGetItem, sanitizeClientsList, freeUpLocalStorageSpace } from './utils/storage';
import { isSupabaseConfigured } from './services/supabase';
import { dbService } from './services/dbService';
import { dispatchRsvpWhatsApp } from './services/messagingService';
import { decodeWeddingPayload, encodeWeddingPayload, buildPortableInviteLink } from './utils/portableLink';

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
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem('kutxi_session_authenticated') === 'true') {
      return true;
    }
    if (localStorage.getItem('kutxi_remember_me') === 'true') {
      return localStorage.getItem('kutxi_is_authenticated') === 'true';
    }
    return false;
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
    const payload = params.get('d') || params.get('data');
    if (payload) {
      const decoded = decodeWeddingPayload(payload);
      if (decoded?.id || decoded?.clientId) {
        return decoded.clientId || decoded.id;
      }
    }
    const urlClientId = params.get('clientId');
    if (urlClientId) return urlClientId;
    const portaria = params.get('portaria');
    if (portaria && portaria !== 'true') return portaria;
    return localStorage.getItem('kutxi_active_client_id') || 'client_1';
  });

  const isInitialMount = useRef(true);

  // Active User: defaults to empty string (never pre-selects superadmin)
  const [activeUser, setActiveUser] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    if (sessionStorage.getItem('kutxi_session_authenticated') === 'true') {
      return sessionStorage.getItem('kutxi_session_user') || '';
    }
    if (localStorage.getItem('kutxi_remember_me') === 'true') {
      return localStorage.getItem('kutxi_active_user') || '';
    }
    return '';
  });

  const [activeUserRole, setActiveUserRole] = useState<'superadmin' | 'couple' | 'staff' | null>(() => {
    if (typeof window === 'undefined') return null;
    if (sessionStorage.getItem('kutxi_session_authenticated') === 'true') {
      return (sessionStorage.getItem('kutxi_session_role') as any) || null;
    }
    if (localStorage.getItem('kutxi_remember_me') === 'true') {
      return (localStorage.getItem('kutxi_active_role') as any) || null;
    }
    return null;
  });

  // User Accounts (guaranteed union with the 3 official wedding accounts)
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('kutxi_user_accounts');
      const list: UserAccount[] = saved ? JSON.parse(saved) : [];
      const accMap = new Map<string, UserAccount>();
      INITIAL_USER_ACCOUNTS.forEach(a => accMap.set(a.username.toLowerCase(), a));
      list.forEach(a => accMap.set(a.username.toLowerCase(), a));
      const merged = Array.from(accMap.values());
      return merged;
    } catch (e) {
      return INITIAL_USER_ACCOUNTS;
    }
  });

  const [invalidInviteNotice, setInvalidInviteNotice] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showActivationModal, setShowActivationModal] = useState(false);

  // Dynamic SaaS Plans synced with SuperAdmin pricing changes
  const [saasPlans, setSaasPlans] = useState<SaaSPlanConfig[]>(() => {
    try {
      const saved = localStorage.getItem('kutxi_saas_plans');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_PLANS;
  });

  useEffect(() => {
    const handlePlansUpdated = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setSaasPlans(e.detail);
      } else {
        const saved = localStorage.getItem('kutxi_saas_plans');
        if (saved) {
          try {
            setSaasPlans(JSON.parse(saved));
          } catch (err) {}
        }
      }
    };
    window.addEventListener('kutxi_saas_plans_updated', handlePlansUpdated);
    window.addEventListener('storage', handlePlansUpdated);
    return () => {
      window.removeEventListener('kutxi_saas_plans_updated', handlePlansUpdated);
      window.removeEventListener('storage', handlePlansUpdated);
    };
  }, []);

  // Animated feedback banner for login and logout
  const [authToast, setAuthToast] = useState<{
    type: 'login' | 'logout';
    title: string;
    description: string;
  } | null>(null);

  const showAuthToast = (type: 'login' | 'logout', title: string, description: string) => {
    setAuthToast({ type, title, description });
    setTimeout(() => {
      setAuthToast(null);
    }, 4000);
  };

  // Wedding Config (Isolated per wedding tenant)
  const [weddingConfig, setWeddingConfig] = useState<WeddingConfig>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      // Priority 1: Self-contained portable URL payload
      const payload = p.get('d') || p.get('data');
      if (payload) {
        const decoded = decodeWeddingPayload(payload);
        if (decoded) {
          const cid = decoded.clientId || decoded.id || 'client_joao_alice';
          safeSetItem(`kutxi_wedding_config_${cid}`, JSON.stringify(decoded));
          safeSetItem('kutxi_active_client_id', cid);
          return decoded;
        }
      }

      // Priority 2: Direct client lookup via slug, invite, w or clientId
      const inviteParam = p.get('invite') || p.get('convite');
      const shortW = p.get('w') || p.get('casamento') || p.get('c');
      const cidParam = p.get('clientId') || p.get('portaria');
      const targetSlugOrId = (inviteParam && inviteParam !== 'convite' && inviteParam !== 'true' ? inviteParam : '') ||
                             (shortW && shortW !== 'true' ? shortW : '') ||
                             (cidParam && cidParam !== 'system' && cidParam !== 'true' ? cidParam : '') ||
                             localStorage.getItem('kutxi_active_client_id') || 'client_joao_alice';

      // Check INITIAL_CLIENTS
      const predefined = INITIAL_CLIENTS.find(c => 
        (c.config?.slug && c.config.slug.toLowerCase() === targetSlugOrId.toLowerCase()) ||
        c.id.toLowerCase() === targetSlugOrId.toLowerCase() ||
        (c.config?.id && c.config.id.toLowerCase() === targetSlugOrId.toLowerCase())
      );
      if (predefined?.config) return predefined.config;

      const directSaved = localStorage.getItem(`kutxi_wedding_config_${targetSlugOrId}`);
      if (directSaved) return JSON.parse(directSaved);

      const savedClients = localStorage.getItem('kutxi_clients');
      if (savedClients) {
        const list = JSON.parse(savedClients);
        const match = list.find((c: any) => 
          c.id === targetSlugOrId || 
          c.config?.id === targetSlugOrId || 
          c.config?.clientId === targetSlugOrId ||
          c.config?.slug === targetSlugOrId
        );
        if (match?.config) return match.config;
      }

      return CONFIG_JOAO_ALICE;
    } catch (e) {}
    return CONFIG_JOAO_ALICE;
  });

  // Guest list (Starts clean from virgin state per tenant)
  const [guests, setGuests] = useState<Guest[]>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const cid = p.get('clientId') || p.get('w') || p.get('casamento') || p.get('c') || p.get('portaria') || 
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

  // Clients list (Union merge with official profiles so all deployments share the 3 profiles)
  const [clients, setClients] = useState<ClientWeddingSaaS[]>(() => {
    try {
      const saved = localStorage.getItem('kutxi_clients');
      const clientMap = new Map<string, ClientWeddingSaaS>();
      INITIAL_CLIENTS.forEach(c => clientMap.set(c.id, c));

      if (saved) {
        try {
          const list: ClientWeddingSaaS[] = sanitizeClientsList(JSON.parse(saved));
          list.forEach(c => {
            const existing = clientMap.get(c.id);
            if (existing) {
              clientMap.set(c.id, { ...existing, ...c, config: c.config || existing.config });
            } else {
              clientMap.set(c.id, c);
            }
          });
        } catch (err) {}
      }

      // If URL contains embedded payload, ensure the decoded wedding is seamlessly registered in clients
      if (typeof window !== 'undefined') {
        const p = new URLSearchParams(window.location.search);
        const payload = p.get('d') || p.get('data');
        if (payload) {
          const decoded = decodeWeddingPayload(payload);
          if (decoded) {
            const cid = decoded.clientId || decoded.id || 'client_joao_alice';
            const groom = decoded.brideGroom?.groomName || 'Noivo';
            const bride = decoded.brideGroom?.brideName || 'Noiva';
            const newClient: ClientWeddingSaaS = {
              id: cid,
              clientName: `${groom} & ${bride}`,
              clientEmail: decoded.contactInfo?.email || 'contato@kutxi.ao',
              weddingDate: decoded.date ? decoded.date.split('T')[0] : '2026-11-14',
              plan: 'Luxury',
              status: 'Active',
              guestCount: 0,
              rsvpsReceived: 0,
              revenue: 110000,
              createdAt: new Date().toISOString(),
              config: decoded
            };
            clientMap.set(cid, newClient);
          }
        }
      }

      const merged = Array.from(clientMap.values());
      safeSetItem('kutxi_clients', JSON.stringify(merged));
      return merged;
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

  // Permissions hook for the active wedding tenant based on ClientWeddingSaaS
  const activeClient = clients.find(c => c.id === activeClientId);
  const permissions = usePlanPermissions(activeClient, guests.length);

  // Save changes to LocalStorage on updates
  useEffect(() => {
    safeSetItem('kutxi_user_accounts', JSON.stringify(userAccounts));
  }, [userAccounts]);

  useEffect(() => {
    safeSetItem('kutxi_active_client_id', activeClientId);
  }, [activeClientId]);

  useEffect(() => {
    if (localStorage.getItem('kutxi_remember_me') === 'true') {
      if (activeUser) {
        safeSetItem('kutxi_active_user', activeUser);
      } else {
        localStorage.removeItem('kutxi_active_user');
      }
    } else if (sessionStorage.getItem('kutxi_session_authenticated') === 'true') {
      if (activeUser) {
        sessionStorage.setItem('kutxi_session_user', activeUser);
      }
    }
  }, [activeUser]);

  useEffect(() => {
    if (localStorage.getItem('kutxi_remember_me') === 'true') {
      if (activeUserRole) {
        safeSetItem('kutxi_active_role', activeUserRole);
      } else {
        localStorage.removeItem('kutxi_active_role');
      }
    } else if (sessionStorage.getItem('kutxi_session_authenticated') === 'true') {
      if (activeUserRole) {
        sessionStorage.setItem('kutxi_session_role', activeUserRole);
      }
    }
  }, [activeUserRole]);

  // --- REAL-TIME BI-DIRECTIONAL MULTI-DEVICE SYNCHRONIZATION ---
  const [isServerSyncing, setIsServerSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const performServerSync = async (forcePushLocal = false) => {
    setIsServerSyncing(true);
    try {
      // 1. Gather any accounts & clients present in this device's storage
      let localAccounts: UserAccount[] = userAccounts;
      try {
        const raw = localStorage.getItem('kutxi_user_accounts');
        if (raw) localAccounts = JSON.parse(raw);
      } catch (e) {}

      let localClients: ClientWeddingSaaS[] = clients;
      try {
        const raw = localStorage.getItem('kutxi_clients');
        if (raw) localClients = JSON.parse(raw);
      } catch (e) {}

      let localWeddingConfig = weddingConfig;
      if (activeClientId) {
        try {
          const raw = localStorage.getItem(`kutxi_wedding_config_${activeClientId}`);
          if (raw) localWeddingConfig = JSON.parse(raw);
        } catch (e) {}
      }

      // 2. Synchronize bidirectionally with the server (ADDITIVE UNION)
      const serverState = await dbService.serverSync.push({
        userAccounts: localAccounts,
        clients: localClients,
        saasPlans: saasPlans,
        weddingConfigs: activeClientId ? { [activeClientId]: localWeddingConfig } : undefined
      });

      if (serverState) {
        // Sync accounts: UNION MERGE
        if (Array.isArray(serverState.userAccounts) && serverState.userAccounts.length > 0) {
          setUserAccounts(prev => {
            const accMap = new Map<string, UserAccount>();
            prev.forEach(a => accMap.set(a.username.toLowerCase(), a));
            serverState.userAccounts.forEach((a: UserAccount) => accMap.set(a.username.toLowerCase(), a));
            const merged = Array.from(accMap.values());
            safeSetItem('kutxi_user_accounts', JSON.stringify(merged));
            return merged;
          });
        }

        // Sync clients: UNION MERGE (Never drop clients created on other browsers)
        if (Array.isArray(serverState.clients) && serverState.clients.length > 0) {
          setClients(prev => {
            const clientMap = new Map<string, ClientWeddingSaaS>();
            prev.forEach(c => clientMap.set(c.id, c));
            serverState.clients.forEach((c: ClientWeddingSaaS) => {
              const existing = clientMap.get(c.id);
              if (existing) {
                clientMap.set(c.id, { 
                  ...existing, 
                  ...c, 
                  config: c.config || existing.config 
                });
              } else {
                clientMap.set(c.id, c);
              }
            });
            const merged = sanitizeClientsList(Array.from(clientMap.values()));
            safeSetItem('kutxi_clients', JSON.stringify(merged));
            return merged;
          });
        }

        // Sync plans
        if (Array.isArray(serverState.saasPlans) && serverState.saasPlans.length > 0) {
          setSaasPlans(serverState.saasPlans);
          safeSetItem('kutxi_saas_plans', JSON.stringify(serverState.saasPlans));
        }

        // Sync current active wedding config from server if available
        if (activeClientId && serverState.weddingConfigs && serverState.weddingConfigs[activeClientId]) {
          const cloudConfig = serverState.weddingConfigs[activeClientId];
          if (cloudConfig.brideGroom?.groomName || cloudConfig.brideGroom?.brideName) {
            setWeddingConfig(cloudConfig);
            safeSetItem(`kutxi_wedding_config_${activeClientId}`, JSON.stringify(cloudConfig));
          }
        }

        // Sync current active guests from server if available
        if (activeClientId && serverState.guests && serverState.guests[activeClientId]) {
          const cloudGuests = serverState.guests[activeClientId];
          setGuests(cloudGuests);
          safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(cloudGuests));
        }

        setLastSyncTime(new Date().toLocaleTimeString('pt-AO'));
      }
    } catch (err) {
      console.warn('[performServerSync] notice:', err);
    } finally {
      setIsServerSyncing(false);
    }
  };

  useEffect(() => {
    // Initial sync immediately on mount (pushes any local accounts up to the server)
    performServerSync(true);

    // Periodic sync every 25 seconds
    const interval = setInterval(() => {
      performServerSync(false);
    }, 25000);

    const handleFocus = () => {
      performServerSync(false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeClientId]);

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

  // Synchronize browser URL bar dynamically using clean friendly slugs via history.replaceState
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (persona === 'public-invite') {
        let slug = weddingConfig.slug || (weddingConfig.clientId && weddingConfig.clientId !== 'system' ? weddingConfig.clientId.replace(/^client_/, '') : (activeClientId && activeClientId !== 'system' ? activeClientId.replace(/^client_/, '') : 'joao-alice'));
        if (slug === 'system') slug = 'joao-alice';
        const cleanUrl = new URL(window.location.origin);
        cleanUrl.searchParams.set('invite', slug);
        if (urlGuestToken && urlGuestToken !== 'convite') {
          cleanUrl.searchParams.set('token', urlGuestToken);
        }
        // Replace noisy browser URL with the short, friendly slug URL
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    } catch (e) {}
  }, [persona, activeClientId, weddingConfig.slug, urlGuestToken]);

  useEffect(() => {
    safeSetItem('kutxi_audit_logs', JSON.stringify(auditLogs.slice(0, 30)));
  }, [auditLogs]);

  // URL routing parse and client validation logic on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portaria = params.get('portaria');
    const inviteParam = params.get('invite') || params.get('convite');
    const token = params.get('token');
    const planos = params.get('planos');
    const shortW = params.get('w') || params.get('casamento') || params.get('c');
    const dPayload = params.get('d') || params.get('data');
    const urlClientId = params.get('clientId');

    if (planos) {
      setPersona('saas-landing');
      setIsInviteLocked(false);
      setTimeout(() => {
        document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return;
    }

    if (portaria) {
      setPersona('gatekeeper-portal');
      setIsPortariaLocked(true);
      const targetCid = portaria !== 'true' && portaria !== 'system' ? portaria : (activeClientId !== 'system' ? activeClientId : 'client_joao_alice');
      const cleanSlug = targetCid.replace(/^client_/, '');
      window.history.replaceState({}, '', `${window.location.origin}/?portaria=${cleanSlug}`);
      return;
    }

    // Checking if an invitation link was accessed
    if (inviteParam || shortW || dPayload || token || (urlClientId && urlClientId !== 'system')) {
      let resolvedConfig: WeddingConfig | null = null;
      let resolvedCid = '';

      // 1. Try decoding embedded portable payload if present
      if (dPayload) {
        const decoded = decodeWeddingPayload(dPayload);
        if (decoded) {
          resolvedConfig = decoded;
          resolvedCid = decoded.clientId || decoded.id || 'client_joao_alice';
        }
      }

      // 2. Validate token or slug against registered clients list
      const lookupToken = (inviteParam && inviteParam !== 'convite' && inviteParam !== 'true' ? inviteParam : '') ||
                          (shortW && shortW !== 'true' && shortW !== 'system' ? shortW : '') ||
                          (urlClientId && urlClientId !== 'system' ? urlClientId : '') ||
                          (token && token !== 'convite' ? token : '') ||
                          (resolvedConfig ? (resolvedConfig.slug || resolvedConfig.clientId) : '');

      let matchedClient: ClientWeddingSaaS | undefined = undefined;
      if (lookupToken) {
        matchedClient = clients.find(c => 
          (c.config?.slug && c.config.slug.toLowerCase() === lookupToken.toLowerCase()) ||
          c.id.toLowerCase() === lookupToken.toLowerCase() ||
          (c.config?.id && c.config.id.toLowerCase() === lookupToken.toLowerCase()) ||
          (lookupToken.includes('joao') && c.id === 'client_joao_alice') ||
          (lookupToken.includes('pedro') && c.id === 'client_pedro_pureza') ||
          (lookupToken.includes('osvaldo') && c.id === 'client_osvaldo_nicidia')
        ) || INITIAL_CLIENTS.find(c =>
          (c.config?.slug && c.config.slug.toLowerCase() === lookupToken.toLowerCase()) ||
          c.id.toLowerCase() === lookupToken.toLowerCase() ||
          (c.config?.id && c.config.id.toLowerCase() === lookupToken.toLowerCase())
        );
      }

      // If matched in clients, prefer official rich config
      if (matchedClient) {
        resolvedConfig = matchedClient.config || resolvedConfig;
        resolvedCid = matchedClient.id;
      }

      // 3. Validation Check: Only load invitation if token/hash is valid or resolved
      if (resolvedConfig || matchedClient || inviteParam === 'convite' || (!lookupToken && !dPayload)) {
        const finalConfig = resolvedConfig || matchedClient?.config || weddingConfig;
        const finalCid = resolvedCid || matchedClient?.id || 'client_joao_alice';
        const finalSlug = finalConfig.slug || (finalCid !== 'system' ? finalCid.replace(/^client_/, '') : 'joao-alice');

        setWeddingConfig(finalConfig);
        setActiveClientId(finalCid);
        safeSetItem(`kutxi_wedding_config_${finalCid}`, JSON.stringify(finalConfig));
        safeSetItem('kutxi_active_client_id', finalCid);
        setPersona('public-invite');
        setIsInviteLocked(true);

        const cleanToken = token && token !== 'convite' ? token : '';
        setUrlGuestToken(cleanToken);

        // Instant history.replaceState to maintain clean, short, friendly WhatsApp URL
        const cleanUrl = `${window.location.origin}/?invite=${finalSlug}${cleanToken ? `&token=${cleanToken}` : ''}`;
        window.history.replaceState({}, '', cleanUrl);

        addAuditLog('Convidado', 'Convite Carregado', `Convite oficial "${finalConfig.brideGroom?.groomName} & ${finalConfig.brideGroom?.brideName}" carregado via slug: ${finalSlug}`, 'rsvp');

        // Sync with server in background
        fetch(`/api/wedding-config/${finalCid}`).catch(() => {});
        fetch(`/api/guests/${finalCid}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && Array.isArray(data.guests)) {
              setGuests(data.guests);
            }
          }).catch(() => {});
      } else {
        // Token is NOT valid: show friendly notice and redirect to landing
        setInvalidInviteNotice(`O convite "${lookupToken}" não foi localizado ou o link é inválido.`);
        setPersona('saas-landing');
        setIsInviteLocked(false);
        window.history.replaceState({}, '', window.location.origin);
      }
    }
  }, [clients]);

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

      // Instantly sync with server database
      fetch(`/api/wedding-config/${activeClientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});

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
    let nextList: Guest[] = [];
    setGuests(prev => {
      const next = [guest, ...prev];
      nextList = next;
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });

    // Sync to server database
    if (activeClientId) {
      fetch(`/api/guests/${activeClientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests: nextList })
      }).catch(() => {});
    }

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
    let nextList: Guest[] = [];
    setGuests(prev => {
      const next = prev.map(g => g.id === updated.id ? updated : g);
      nextList = next;
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });

    if (activeClientId) {
      fetch(`/api/guests/${activeClientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests: nextList })
      }).catch(() => {});
    }

    addAuditLog('Gestão de Convidados', 'Convidado Atualizado', `Parâmetros do convidado "${updated.name}" modificados.`, 'rsvp');
  };

  const handleDeleteGuest = (id: string) => {
    const guest = guests.find(g => g.id === id);
    let nextList: Guest[] = [];
    setGuests(prev => {
      const next = prev.filter(g => g.id !== id);
      nextList = next;
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });

    if (activeClientId) {
      fetch(`/api/guests/${activeClientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests: nextList })
      }).catch(() => {});
    }

    if (guest) {
      addAuditLog('Gestão de Convidados', 'Convidado Excluído', `Convidado "${guest.name}" removido da lista.`, 'rsvp');
    }
  };

  const handleBulkStatusUpdate = (ids: string[], status: 'Confirmed' | 'Pending' | 'Declined') => {
    const pStatus = status === 'Confirmed' ? 'Confirmado' : status === 'Declined' ? 'Recusado' : 'Pendente';
    let nextList: Guest[] = [];
    setGuests(prev => {
      const next = prev.map(g => ids.includes(g.id) ? { ...g, status, confirmedAt: status === 'Confirmed' ? new Date().toISOString() : undefined } : g);
      nextList = next;
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });

    if (activeClientId) {
      fetch(`/api/guests/${activeClientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests: nextList })
      }).catch(() => {});
    }

    addAuditLog('Gestão de Convidados', 'Status em Lote', `Atualizado status de ${ids.length} convidados para "${pStatus}".`, 'rsvp');
  };

  const handleDoorCheckIn = (guestId: string, plusOnesCount: number) => {
    let nextList: Guest[] = [];
    setGuests(prev => {
      const next = prev.map(g => g.id === guestId ? {
        ...g,
        checkedIn: true,
        plusOnesConfirmed: plusOnesCount,
        checkedInAt: new Date().toISOString()
      } : g);
      nextList = next;
      return next;
    });

    if (activeClientId) {
      fetch(`/api/guests/${activeClientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests: nextList })
      }).catch(() => {});
    }
    
    const guest = guests.find(g => g.id === guestId);
    if (guest) {
      addAuditLog('Scanner de Portaria', 'Check-In Realizado', `Convidado "${guest.name}" entrou na recepção. Grupo: 1 + ${plusOnesCount} acompanhantes.`, 'auth');
    }
  };

  const handleAddClient = (client: ClientWeddingSaaS, accountsToAdd?: { username: string; pass: string }[]) => {
    setClients(prev => {
      const next = prev.some(c => c.id === client.id) ? prev.map(c => c.id === client.id ? client : c) : [...prev, client];
      safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(next)));
      return next;
    });

    let newAccountsList = userAccounts;
    let createdAccounts: UserAccount[] = [];
    if (accountsToAdd && accountsToAdd.length > 0) {
      createdAccounts = accountsToAdd.map(acc => ({
        username: acc.username,
        pass: acc.pass,
        clientId: client.id,
        clientName: client.clientName,
        role: 'couple' as const
      }));
      newAccountsList = [...userAccounts, ...createdAccounts];
      setUserAccounts(newAccountsList);
      safeSetItem('kutxi_user_accounts', JSON.stringify(newAccountsList));
    }

    // Instantly push to server database so client device can log in immediately from anywhere
    dbService.serverSync.push({
      clients: [client],
      userAccounts: createdAccounts,
      weddingConfigs: client.config ? { [client.id]: client.config } : undefined
    }).catch(err => {
      console.warn('Background server sync error on add client:', err);
    });

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

      {/* Animated Login / Logout Floating Feedback Toast */}
      <AnimatePresence>
        {authToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed top-5 right-5 z-50 max-w-sm w-full bg-white/95 dark:bg-[#18161B]/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200/90 dark:border-stone-800/90 p-4 overflow-hidden pointer-events-auto"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <motion.div 
                initial={{ scale: 0.6, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  authToast.type === 'login' 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                    : 'bg-[#8E2840]/15 text-[#8E2840] dark:text-rose-400 border border-[#8E2840]/30'
                }`}
              >
                {authToast.type === 'login' ? (
                  <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                ) : (
                  <LogOut className="w-4 h-4 stroke-[2.2]" />
                )}
              </motion.div>
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-xs font-bold text-stone-900 dark:text-white leading-tight">
                  {authToast.title}
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                  {authToast.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuthToast(null)}
                aria-label="Fechar notificação"
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors p-1 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Smooth animated progress line */}
            <motion.div 
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 4, ease: 'linear' }}
              className={`h-0.5 mt-3 -mx-4 -mb-4 ${
                authToast.type === 'login' ? 'bg-emerald-500' : 'bg-[#8E2840]'
              }`}
            />
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
                {/* Real-time Multi-device Cloud Sync Status */}
                <button
                  type="button"
                  onClick={() => performServerSync(true)}
                  disabled={isServerSyncing}
                  className="p-2 rounded-xl bg-stone-100/80 dark:bg-stone-850 border border-stone-200/70 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 transition-all cursor-pointer flex items-center gap-1.5"
                  title={lastSyncTime ? `Sincronização Ativa às ${lastSyncTime}. Clique para sincronizar agora.` : 'Sincronizar com o servidor'}
                  aria-label="Sincronizar com o servidor"
                >
                  <Cloud className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  <span className={`w-2 h-2 rounded-full ${isServerSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
                </button>

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
                        const previousName = isSuperAdmin ? 'Super Administrador' : (activeUser || 'Utilizador');
                        setIsAuthenticated(false);
                        setActiveUser('');
                        setActiveUserRole(null);

                        // Clear persistent storage credentials
                        try {
                          localStorage.removeItem('kutxi_remember_me');
                          localStorage.removeItem('kutxi_is_authenticated');
                          localStorage.removeItem('kutxi_active_user');
                          localStorage.removeItem('kutxi_active_role');
                        } catch (e) {}

                        // Clear session storage credentials
                        try {
                          sessionStorage.removeItem('kutxi_session_authenticated');
                          sessionStorage.removeItem('kutxi_session_user');
                          sessionStorage.removeItem('kutxi_session_role');
                          sessionStorage.removeItem('kutxi_session_client_id');
                        } catch (e) {}

                        setPersona('saas-landing');
                        addAuditLog('Segurança', 'Logout Realizado', 'Encerramento de sessão.', 'auth');
                        showAuthToast('logout', 'Sessão Encerrada com Sucesso', `Até breve, ${previousName}! Os seus dados foram salvos com segurança.`);
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
        {invalidInviteNotice && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-3 text-sm text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{invalidInviteNotice} Você foi redirecionado para a página inicial da plataforma.</span>
            </div>
            <button
              onClick={() => setInvalidInviteNotice(null)}
              className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-md text-amber-700 dark:text-amber-300 transition-colors"
              title="Fechar aviso"
              aria-label="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
                  {saasPlans.map((tier) => {
                    const isHighlight = tier.popular || tier.badge === 'Mais Escolhido' || tier.id === 'luxury';
                    const formattedPrice = tier.price === 0 ? '0 Kz' : `${Number(tier.price).toLocaleString('pt-AO')} Kz`;
                    const ctaText = tier.price === 0 
                      ? 'Começar Grátis (20 Convites)' 
                      : tier.id === 'basic' ? 'Escolher Essencial' 
                      : tier.id === 'premium' ? 'Escolher Premium' 
                      : 'Assinar Luxo VIP';

                    return (
                      <div
                        key={tier.id}
                        className={`bg-white dark:bg-stone-900/90 p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                          isHighlight 
                            ? 'border-[#B89758] dark:border-[#B89758]/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-[#B89758]/30 scale-[1.02]' 
                            : 'border-stone-200/80 dark:border-stone-800 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]'
                        }`}
                      >
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-stone-500 dark:text-stone-400 text-[10px] uppercase tracking-wider">{tier.name}</span>
                              {tier.badge && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#9E7A36] bg-[#FAF6EE] dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-[#E9DEC6] dark:border-amber-900/50">
                                  {tier.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-2xl font-bold font-serif text-stone-900 dark:text-white mt-1.5">{formattedPrice}</div>
                            <span className="text-[10px] text-stone-400">pagamento {tier.period || 'único'}</span>
                          </div>

                          {/* Exclusive perk highlight */}
                          {tier.perk && (
                            <div className="p-3 bg-[#FAF6EE] dark:bg-amber-950/30 rounded-xl border border-[#E9DEC6]/70 dark:border-amber-900/40 text-[11px] text-[#9E7A36] dark:text-amber-200 font-medium">
                              ✦ {tier.perk}
                            </div>
                          )}

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
                            isHighlight 
                              ? 'bg-[#8E2840] hover:bg-[#782236] text-white shadow-sm' 
                              : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200/80 text-stone-700 dark:text-stone-200'
                          }`}
                        >
                          {ctaText}
                        </button>
                      </div>
                    );
                  })}
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
          {persona === 'client-dashboard' && (() => {
            const currentClient = clients.find(c => c.id === activeClientId);
            const isSuspended = !isSuperAdmin && currentClient && (currentClient.status === 'Suspended' || currentClient.accessRevoked);

            if (isSuspended) {
              return (
                <motion.div
                  key="client-suspended-screen"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-stone-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-2xl text-center space-y-5"
                >
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
                    <Lock className="w-8 h-8 stroke-[2.2]" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-rose-800 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800 inline-block">
                      Acesso Restrito / Suspenso
                    </span>
                    <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-white">
                      Perfil de Casamento Temporariamente Suspenso
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed max-w-md mx-auto">
                      O painel do casamento de <strong>{currentClient?.clientName}</strong> está suspenso ou com acesso bloqueado aguardando ativação de pacote. Entre em contato com a equipe Ki-Eventos para reativação imediata.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50 dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 text-left text-xs space-y-2">
                    <div className="flex justify-between font-mono">
                      <span className="text-stone-400">ID da Conta:</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300">{currentClient?.id}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-stone-400">Status:</span>
                      <span className="font-bold text-rose-600">Suspenso / Bloqueado</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-stone-400">Email:</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300">{currentClient?.clientEmail}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <a
                      href={`https://api.whatsapp.com/send?phone=244923456789&text=${encodeURIComponent(`Olá Ki-Eventos! Sou do casamento "${currentClient?.clientName}" (ID: ${currentClient?.id}) e gostaria de reativar o meu acesso ao painel.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Falar no WhatsApp (+244 923 456 789)</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAuthenticated(false);
                        localStorage.removeItem('kutxi_is_authenticated');
                        setPersona('saas-landing');
                      }}
                      className="px-4 py-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Sair da Conta
                    </button>
                  </div>
                </motion.div>
              );
            }

            return (
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
                      Painel de Controle dos Noivos · {permissions.isTrial ? 'Plano Grátis (Degustação)' : `Plano ${permissions.currentPlan} ${permissions.currentPlan === 'Luxury' ? 'VIP' : ''}`}
                    </p>
                  </div>
                </div>

                {/* Submenu Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
                    { id: 'guests', label: 'Convidados & RSVP', icon: Users, badge: permissions.maxGuests < 9999 ? `${guests.length}/${permissions.maxGuests}` : undefined },
                    { id: 'editor', label: 'Personalizar Convite', icon: Sliders },
                    { id: 'gifts', label: 'Lista de Presentes', icon: Gift },
                    { id: 'album', label: 'Álbum Partilhado', icon: BookOpen, isLocked: !permissions.canUseCollectiveAlbum, requiredTag: 'Premium' },
                    { id: 'checkin', label: 'Portaria & QR', icon: QrCode, isLocked: !permissions.canUseGatekeeperPortal, requiredTag: 'VIP' },
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
                        {tab.isLocked && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            <span>{tab.requiredTag}</span>
                          </span>
                        )}
                        {tab.badge && !tab.isLocked && (
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold ${
                            permissions.isGuestLimitExceeded
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                          }`}>
                            {tab.badge}
                          </span>
                        )}
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
                  planName={permissions.isTrial ? 'Plano Grátis' : `Plano ${permissions.currentPlan}`}
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
                    client={currentClient}
                    onOpenActivationModal={() => setShowActivationModal(true)}
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
                  <FeatureGate
                    client={currentClient}
                    feature="collective_album"
                    currentGuestCount={guests.length}
                    onUpgradeRequested={() => setShowActivationModal(true)}
                  >
                    <SharedAlbumManager
                      config={weddingConfig}
                    />
                  </FeatureGate>
                </div>
              )}
              {clientTab === 'checkin' && (
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-xs border border-stone-200/80 dark:border-stone-800">
                  <FeatureGate
                    client={currentClient}
                    feature="gatekeeper_portal"
                    currentGuestCount={guests.length}
                    onUpgradeRequested={() => setShowActivationModal(true)}
                  >
                    <QRCheckIn
                      guests={guests}
                      onCheckIn={handleDoorCheckIn}
                      clientId={activeClientId}
                    />
                  </FeatureGate>
                </div>
              )}
            </motion.div>
          );
        })()}

          {/* GATEKEEPER PORTAL */}
          {persona === 'gatekeeper-portal' && (() => {
            const currentClient = clients.find(c => c.id === activeClientId);
            return (
              <motion.div
                key="gatekeeper-portal-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-screen bg-slate-900"
              >
                <FeatureGate
                  client={currentClient}
                  feature="gatekeeper_portal"
                  currentGuestCount={guests.length}
                  fallback={
                    <div className="max-w-xl mx-auto my-16 p-8 bg-slate-900 rounded-3xl border border-rose-900 text-center space-y-4 text-white">
                      <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
                        <Lock className="w-7 h-7" />
                      </div>
                      <h2 className="text-xl font-bold font-serif text-white">Portaria Não Habilitada</h2>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        O serviço de portaria com leitor de QR Code requer a assinatura do <strong>Plano Luxo VIP</strong>. Entre em contato com a organização do casamento.
                      </p>
                      <button
                        onClick={() => setPersona('saas-landing')}
                        className="px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Voltar à Página Principal
                      </button>
                    </div>
                  }
                >
                  <GatekeeperPortal
                    guests={guests}
                    onCheckIn={handleDoorCheckIn}
                    clientName={`${weddingConfig.brideGroom?.groomName || 'Noivo'} & ${weddingConfig.brideGroom?.brideName || 'Noiva'}`}
                    onExitPortal={() => setPersona('saas-landing')}
                    isLocked={isPortariaLocked}
                  />
                </FeatureGate>
              </motion.div>
            );
          })()}

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
        clients={clients}
        onLoginSuccess={(username, clientId, role, rememberMe) => {
          setIsAuthenticated(true);
          setActiveUser(username);
          setActiveUserRole((role as any) || (username === 'superadmin' ? 'superadmin' : 'couple'));
          setActiveClientId(clientId);

          if (rememberMe) {
            safeSetItem('kutxi_remember_me', 'true');
            safeSetItem('kutxi_is_authenticated', 'true');
            safeSetItem('kutxi_active_user', username);
            safeSetItem('kutxi_active_role', (role as string) || (username === 'superadmin' ? 'superadmin' : 'couple'));
            safeSetItem('kutxi_active_client_id', clientId);
          } else {
            // Strictly do NOT save auth data to localStorage if rememberMe was not checked
            try {
              localStorage.removeItem('kutxi_remember_me');
              localStorage.removeItem('kutxi_is_authenticated');
              localStorage.removeItem('kutxi_active_user');
              localStorage.removeItem('kutxi_active_role');
            } catch (e) {}

            try {
              sessionStorage.setItem('kutxi_session_authenticated', 'true');
              sessionStorage.setItem('kutxi_session_user', username);
              sessionStorage.setItem('kutxi_session_role', (role as string) || (username === 'superadmin' ? 'superadmin' : 'couple'));
              sessionStorage.setItem('kutxi_session_client_id', clientId);
            } catch (e) {}
          }
          
          if (username === 'superadmin' || role === 'superadmin') {
            setPersona('super-admin');
            showAuthToast('login', 'Acesso Super Administrador Concedido', 'Bem-vindo de volta ao painel de controle global do Kutxi.');
          } else {
            setPersona('client-dashboard');
            setClientTab('overview');
            showAuthToast('login', 'Bem-vindo(a) aos Seus Casamentos!', `Sessão iniciada como "${username}". Boas celebrações!`);
          }
          addAuditLog(username, 'Login Efetuado', `Acesso ao sistema com sucesso.`, 'auth');
        }}
        onRegisterSuccess={(newClient, user1, user2) => {
          handleAddClient(newClient, [user1, user2]);
          showAuthToast('login', 'Casamento Registrado com Sucesso!', `Bem-vindos, ${newClient.clientName}! O vosso painel exclusivo foi criado.`);
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

      {/* ACTIVATION REQUEST MODAL */}
      {showActivationModal && (
        <ActivationRequestModal
          isOpen={showActivationModal}
          onClose={() => setShowActivationModal(false)}
          client={clients.find(c => c.id === activeClientId) || clients[0]}
          onRequestSubmitted={(_req) => {
            showAuthToast('login', 'Solicitação de Ativação Enviada!', 'A sua solicitação foi encaminhada para validação pelo SuperAdmin. Em minutos o seu plano será ativado.');
            setShowActivationModal(false);
          }}
        />
      )}
    </div>
  );
}
