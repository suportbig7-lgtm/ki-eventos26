import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, CreditCard, ShieldCheck, Settings, Activity, 
  Users, CheckCircle2, TrendingUp, Sparkles, AlertTriangle, 
  DollarSign, Terminal, ArrowUpRight, Search, Plus, Filter, Tag,
  Edit, Trash2, Key, Copy, Check, Eye, Calendar, Mail, Smartphone, 
  RefreshCw, LayoutDashboard, Sliders, Lock, ExternalLink, QrCode, FileText,
  Database, Cloud, MessageCircle, AlertCircle, ShieldAlert, CheckCircle,
  Ban, Shield, Power, ToggleLeft, ToggleRight, X
} from 'lucide-react';
import { ClientWeddingSaaS, ClientFeatures, SystemAuditLog, WeddingConfig, Guest, MessagingWebhookConfig, MessagingLog } from '../types';
import { INITIAL_WEDDING_CONFIG } from '../data/defaultConfig';
import ClientReadOnlyModal from './ClientReadOnlyModal';
import SupabaseModal from './SupabaseModal';
import { safeSetItem, resetAllDataToVirgin } from '../utils/storage';
import { isSupabaseConfigured } from '../services/supabase';
import { 
  getMessagingConfig, 
  saveMessagingConfig, 
  getMessagingLogs, 
  clearMessagingLogs,
  testTwilioConnection,
  testTwilioSend,
  checkTwilioServerStatus
} from '../services/messagingService';

export interface SaaSPlanConfig {
  id: string;
  name: string;
  price: number;
  period: string;
  guestLimit: number | 'Ilimitado';
  storageGB: number;
  badge?: string;
  popular?: boolean;
  exclusivePerks: string[];
  features: string[];
  support: string;
}

const DEFAULT_PLANS: SaaSPlanConfig[] = [
  {
    id: 'free',
    name: 'Plano Grátis',
    price: 0,
    period: 'vitalício',
    guestLimit: 25,
    storageGB: 0.5,
    exclusivePerks: ['Ideal para testar ou mini-wedding no civil', 'Passe com QR Code básico'],
    features: ['Até 25 convidados na lista', 'Formulário de RSVP simples', 'Envio manual de links padrão', 'Tema clássico pré-configurado'],
    support: 'Comunidade Online'
  },
  {
    id: 'basic',
    name: 'Plano Ouro / Essencial',
    price: 35000,
    period: 'único',
    guestLimit: 150,
    storageGB: 2,
    exclusivePerks: ['Passe VIP Mobile em PDF', 'Lista Multicaixa Express & IBAN', 'Mural de Recados'],
    features: ['Até 150 convidados na lista', '2 GB de mídias e fotos', 'Lista de presentes MCX e IBAN', 'Passe VIP Mobile em PDF no smartphone', 'Mural de recados dos noivos', 'Suporte comercial'],
    support: 'E-mail Comercial (48h)'
  },
  {
    id: 'premium',
    name: 'Plano Diamante / Luxo',
    price: 65000,
    period: 'único',
    guestLimit: 'Ilimitado',
    storageGB: 10,
    popular: true,
    badge: 'Mais Recomendado',
    exclusivePerks: ['Convidados Ilimitados', 'Automação WhatsApp Integrada', 'Álbum Coletivo Colaborativo', 'Check-in de Portaria com QR Code'],
    features: ['Convidados ilimitados na lista', '10 GB de fotos em alta resolução', 'Álbum coletivo colaborativo dos convidados', 'Check-in e portaria digital com leitor de QR Code', 'Disparo de WhatsApp com link de confirmação', 'Mural de votos permanente', 'Suporte prioritário WhatsApp'],
    support: 'Suporte Prioritário WhatsApp (24h)'
  },
  {
    id: 'luxury',
    name: 'Plano Luanda VIP',
    price: 110000,
    period: 'único',
    guestLimit: 'Ilimitado',
    storageGB: 25,
    badge: 'Experiência Suprema',
    exclusivePerks: ['Multi-Eventos (Alambamento, Civil, Igreja, Festa)', 'Scanner de Portaria com Múltiplos Recepcionistas', 'Domínio Próprio / Slug Exclusivo', 'Assessoria VIP Dedicada'],
    features: ['Multi-eventos sincronizados', '25 GB de armazenamento em nuvem', 'Múltiplos recepcionistas na portaria em tempo real', 'Domínio personalizado ou slug nobre', 'Lista de presentes com proof upload', 'Hot-line VIP WhatsApp 24/7'],
    support: 'Assessoria VIP WhatsApp 24/7'
  }
];

interface SuperAdminProps {
  clients: ClientWeddingSaaS[];
  userAccounts: { username: string; pass: string; clientId: string; clientName: string; role?: string }[];
  auditLogs: SystemAuditLog[];
  onAddClient: (client: ClientWeddingSaaS, accountsToAdd?: { username: string; pass: string }[]) => void;
  onUpdateClient: (updatedClient: ClientWeddingSaaS, updatedAccounts?: { username: string; pass: string }[]) => void;
  onDeleteClient: (clientId: string) => void;
}

export default function SuperAdmin({ 
  clients, 
  userAccounts, 
  auditLogs, 
  onAddClient, 
  onUpdateClient, 
  onDeleteClient 
}: SuperAdminProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'plans' | 'messaging' | 'settings' | 'logs'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('All');

  // Read-Only Client Modal
  const [readOnlyClient, setReadOnlyClient] = useState<ClientWeddingSaaS | null>(null);
  const [isReadOnlyModalOpen, setIsReadOnlyModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // CRUD Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWeddingSaaS | null>(null);

  // Plans state
  const [plans, setPlans] = useState<SaaSPlanConfig[]>(() => {
    const saved = localStorage.getItem('kutxi_saas_plans');
    return saved ? JSON.parse(saved) : DEFAULT_PLANS;
  });
  const [editingPlan, setEditingPlan] = useState<SaaSPlanConfig | null>(null);

  // Messaging Webhook & Twilio Config state
  const [msgConfig, setMsgConfig] = useState<MessagingWebhookConfig>(getMessagingConfig());
  const [messagingLogs, setMessagingLogs] = useState<MessagingLog[]>(getMessagingLogs());
  const [msgSavedToast, setMsgSavedToast] = useState(false);
  const [testingTwilio, setTestingTwilio] = useState(false);
  const [twilioTestResult, setTwilioTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState('+244');
  const [testMessageText, setTestMessageText] = useState('Olá! Este é um teste oficial de disparo de WhatsApp via Twilio da plataforma Kutxi. 💍');
  const [sendingTwilioTest, setSendingTwilioTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [showTwilioSecret, setShowTwilioSecret] = useState(false);

  const [serverTwilioStatus, setServerTwilioStatus] = useState<{ configured: boolean; accountSid: string | null; whatsappFrom: string } | null>(null);

  useEffect(() => {
    checkTwilioServerStatus().then(status => setServerTwilioStatus(status));
  }, []);

  // Virgin reset confirmation modal
  const [showVirginResetModal, setShowVirginResetModal] = useState(false);

  useEffect(() => {
    safeSetItem('kutxi_saas_plans', JSON.stringify(plans));
  }, [plans]);

  // Form fields for Client CRUD
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'Basic' | 'Premium' | 'Luxury'>('Premium');
  const [selectedStatus, setSelectedStatus] = useState<'Active' | 'Trial' | 'Expired' | 'Suspended'>('Active');

  const [user1Username, setUser1Username] = useState('');
  const [user1Pass, setUser1Pass] = useState('');
  const [user2Username, setUser2Username] = useState('');
  const [user2Pass, setUser2Pass] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Metrics
  const totalClientsCount = clients.length;
  const activeCount = clients.filter(c => c.status === 'Active').length;
  const trialCount = clients.filter(c => c.status === 'Trial').length;
  const suspendedCount = clients.filter(c => c.status === 'Suspended').length;

  const totalRevenueKwanzas = clients.reduce((acc, c) => {
    if (c.status !== 'Active') return acc;
    if (c.plan === 'Luxury') return acc + 110000;
    if (c.plan === 'Premium') return acc + 65000;
    if (c.plan === 'Basic') return acc + 35000;
    return acc;
  }, 0);

  // Package Validation Modal state (Validação fora pagamento)
  const [validatingClient, setValidatingClient] = useState<ClientWeddingSaaS | null>(null);
  const [valPlanTier, setValPlanTier] = useState<'Basic' | 'Premium' | 'Luxury'>('Premium');
  const [valReason, setValReason] = useState<string>('Comprovativo Multicaixa Express (MCX)');

  // Granular Feature Flags Modal state (Dar e tirar acessos a certas funcionalidades)
  const [featuresClient, setFeaturesClient] = useState<ClientWeddingSaaS | null>(null);
  const [tempFeatures, setTempFeatures] = useState<ClientFeatures>({
    allowWhatsAppAutomation: true,
    allowCollectiveAlbum: true,
    allowGatekeeperPortal: true,
    maxGuests: 9999
  });

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.clientEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'All' || c.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleOpenAddModal = () => {
    setEditingClient(null);
    setBrideName('');
    setGroomName('');
    setClientEmail('');
    setWeddingDate('2026-10-25');
    setSelectedPlan('Premium');
    setSelectedStatus('Active');

    const rand1 = Math.floor(100 + Math.random() * 900);
    const rand2 = Math.floor(100 + Math.random() * 900);
    setUser1Username('noiva.novo');
    setUser1Pass(`vows.${rand1}`);
    setUser2Username('noivo.novo');
    setUser2Pass(`vows.${rand2}`);

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: ClientWeddingSaaS, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingClient(client);

    const bride = client.config?.brideGroom?.brideName || client.clientName.split('&')[0]?.trim() || 'Noiva';
    const groom = client.config?.brideGroom?.groomName || client.clientName.split('&')[1]?.trim() || 'Noivo';

    setBrideName(bride);
    setGroomName(groom);
    setClientEmail(client.clientEmail);
    setWeddingDate(client.weddingDate);
    setSelectedPlan(client.plan as any);
    setSelectedStatus(client.status as any);

    const matchingAccounts = userAccounts.filter(acc => acc.clientId === client.id);
    if (matchingAccounts.length > 0) {
      setUser1Username(matchingAccounts[0].username);
      setUser1Pass(matchingAccounts[0].pass);
      if (matchingAccounts[1]) {
        setUser2Username(matchingAccounts[1].username);
        setUser2Pass(matchingAccounts[1].pass);
      } else {
        setUser2Username('');
        setUser2Pass('');
      }
    } else {
      const rand1 = Math.floor(100 + Math.random() * 900);
      const rand2 = Math.floor(100 + Math.random() * 900);
      setUser1Username(`noiva.${bride.toLowerCase().replace(/\s+/g, '')}`);
      setUser1Pass(`vows.${rand1}`);
      setUser2Username(`noivo.${groom.toLowerCase().replace(/\s+/g, '')}`);
      setUser2Pass(`vows.${rand2}`);
    }
    setIsModalOpen(true);
  };

  // Toggle client status (Dar e retirar acessos gerais)
  const handleToggleAccess = (client: ClientWeddingSaaS, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = client.status === 'Active' ? 'Suspended' : 'Active';
    const updated: ClientWeddingSaaS = {
      ...client,
      status: newStatus,
      accessRevoked: newStatus === 'Suspended'
    };
    onUpdateClient(updated);
  };

  // Validar Adesão ao Pacote Fora de Pagamento Online
  const handleOpenValidateModal = (client: ClientWeddingSaaS, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setValidatingClient(client);
    setValPlanTier(client.plan === 'Luxury' ? 'Luxury' : client.plan === 'Premium' ? 'Premium' : 'Basic');
    setValReason('Comprovativo Multicaixa Express (MCX)');
  };

  const handleConfirmValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatingClient) return;

    const amount = valPlanTier === 'Luxury' ? 110000 : valPlanTier === 'Premium' ? 65000 : 35000;
    const updated: ClientWeddingSaaS = {
      ...validatingClient,
      plan: valPlanTier,
      status: 'Active',
      isComplimentary: true,
      revenue: amount,
      features: {
        ...validatingClient.features,
        allowWhatsAppAutomation: valPlanTier !== 'Basic',
        allowCollectiveAlbum: true,
        allowGatekeeperPortal: valPlanTier !== 'Basic',
        maxGuests: valPlanTier === 'Basic' ? 150 : 9999
      }
    };

    onUpdateClient(updated);
    setValidatingClient(null);
  };

  // Dar e Tirar Acessos a Certas Funcionalidades Granulares
  const handleOpenFeaturesModal = (client: ClientWeddingSaaS, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFeaturesClient(client);
    setTempFeatures({
      allowWhatsAppAutomation: client.features?.allowWhatsAppAutomation ?? (client.plan !== 'Basic'),
      allowCollectiveAlbum: client.features?.allowCollectiveAlbum ?? true,
      allowGatekeeperPortal: client.features?.allowGatekeeperPortal ?? (client.plan === 'Luxury' || client.plan === 'Premium'),
      maxGuests: client.features?.maxGuests ?? (client.plan === 'Basic' ? 150 : 9999)
    });
  };

  const handleSaveFeatures = (e: React.FormEvent) => {
    e.preventDefault();
    if (!featuresClient) return;

    const updated: ClientWeddingSaaS = {
      ...featuresClient,
      features: { ...tempFeatures }
    };

    onUpdateClient(updated);
    setFeaturesClient(null);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brideName || !groomName || !clientEmail || !weddingDate) return;

    const fullName = `${brideName.trim()} & ${groomName.trim()}`;
    const accountsToAdd = [
      { username: user1Username.trim(), pass: user1Pass.trim() },
      { username: user2Username.trim(), pass: user2Pass.trim() }
    ];

    if (editingClient) {
      const updatedClient: ClientWeddingSaaS = {
        ...editingClient,
        clientName: fullName,
        clientEmail: clientEmail.trim(),
        weddingDate,
        plan: selectedPlan,
        status: selectedStatus,
        accessRevoked: selectedStatus === 'Suspended',
        config: {
          ...editingClient.config,
          brideGroom: {
            ...editingClient.config.brideGroom,
            brideName: brideName.trim(),
            groomName: groomName.trim(),
          },
          date: weddingDate + 'T16:00:00'
        }
      };
      onUpdateClient(updatedClient, accountsToAdd);
    } else {
      const newClientId = 'client_' + Date.now();
      const newClient: ClientWeddingSaaS = {
        id: newClientId,
        clientName: fullName,
        clientEmail: clientEmail.trim(),
        weddingDate,
        plan: selectedPlan,
        status: selectedStatus,
        guestCount: 0,
        rsvpsReceived: 0,
        revenue: selectedPlan === 'Luxury' ? 225000 : selectedPlan === 'Premium' ? 135000 : 45000,
        createdAt: new Date().toISOString().split('T')[0],
        config: {
          ...INITIAL_WEDDING_CONFIG,
          id: newClientId,
          clientId: newClientId,
          brideGroom: {
            ...INITIAL_WEDDING_CONFIG.brideGroom,
            brideName: brideName.trim(),
            groomName: groomName.trim(),
          },
          date: weddingDate + 'T16:00:00',
          customFooter: `Com amor, sempre. — ${fullName}`
        }
      };
      onAddClient(newClient, accountsToAdd);
    }
    setIsModalOpen(false);
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    saveMessagingConfig(msgConfig);
    setMsgSavedToast(true);
    setTimeout(() => setMsgSavedToast(false), 3000);
  };

  const handleExecuteVirginReset = () => {
    resetAllDataToVirgin();
    setShowVirginResetModal(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100" id="super-admin-root-view">
      {/* Super Admin Top Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
            { id: 'clients', label: `Casais & Licenças (${clients.length})`, icon: Users },
            { id: 'plans', label: 'Planos & Tarifas', icon: CreditCard },
            { id: 'messaging', label: 'WhatsApp & Webhook', icon: MessageCircle },
            { id: 'settings', label: 'Definições do Sistema', icon: Settings },
            { id: 'logs', label: 'Logs de Auditoria', icon: Terminal }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-rose-900 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'clients' && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Casal</span>
            </button>
          )}
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      <AnimatePresence mode="wait">
        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-rose-950 to-slate-900 text-white p-6 rounded-2xl border border-rose-900/50 shadow-md">
                <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider block">Faturamento ARR (AOA)</span>
                <div className="text-2xl lg:text-3xl font-display font-bold text-white mt-1">
                  {totalRevenueKwanzas.toLocaleString('pt-AO')} Kz
                </div>
                <div className="mt-3 text-xs text-rose-200/80">{activeCount} casamentos ativos e pagos</div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Casais Cadastrados</span>
                <div className="text-2xl lg:text-3xl font-display font-bold text-slate-900 dark:text-white mt-1">
                  {totalClientsCount}
                </div>
                <div className="mt-3 text-xs text-slate-500 flex gap-2">
                  <span className="text-emerald-600 font-bold">{activeCount} Ativos</span>
                  <span>·</span>
                  <span className="text-amber-600 font-bold">{trialCount} Pendentes</span>
                  {suspendedCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-rose-600 font-bold">{suspendedCount} Suspensos</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Automação WhatsApp</span>
                <div className="text-2xl lg:text-3xl font-display font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {msgConfig.autoSendOnGuestCreated ? 'Ativada' : 'Manual'}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {msgConfig.webhookUrl ? 'Webhook conectado' : 'Envio direto preparado'}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Banco de Dados</span>
                <div className="text-2xl lg:text-3xl font-display font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                  <span className="text-xl">{isSupabaseConfigured() ? 'Supabase Cloud' : 'Local + IDB'}</span>
                </div>
                <div className="mt-3 text-xs text-slate-500">Persistência segura sem perda de dados</div>
              </div>
            </div>

            {/* Quick Actions & Recent Clients */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Casais Cadastrados Recentes</h3>
                <button
                  onClick={() => setActiveTab('clients')}
                  className="text-xs font-bold text-rose-800 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Ver Todos ({clients.length})
                </button>
              </div>

              {clients.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhum casal cadastrado ainda. O sistema está no estado virgem pronto para receber casamentos.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {clients.slice(0, 5).map((c, idx) => (
                    <div
                      key={`${c.id || 'client'}-${idx}`}
                      onClick={() => { setReadOnlyClient(c); setIsReadOnlyModalOpen(true); }}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900 flex items-center justify-center font-bold text-rose-800 dark:text-rose-300 text-xs">
                          {c.clientName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-rose-800 dark:group-hover:text-rose-400">
                            {c.clientName}
                          </div>
                          <div className="text-[10px] text-slate-400">{c.clientEmail} · {c.weddingDate}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.status === 'Suspended' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.status === 'Active' ? 'Ativo' : c.status === 'Suspended' ? 'Suspenso' : 'Pendente'}
                        </span>
                        <button
                          onClick={(e) => handleToggleAccess(c, e)}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                            c.status === 'Active' 
                              ? 'text-rose-600 hover:bg-rose-50' 
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={c.status === 'Active' ? 'Retirar acesso / Suspender' : 'Dar acesso / Ativar'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 2: CASAIS & LICENÇAS (GERENCIAR CONVIDADOS, DAR E RETIRAR ACESSOS) */}
        {activeTab === 'clients' && (
          <motion.div
            key="clients-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar casal ou e-mail..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-transparent border-0 focus:outline-none text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Filtro:</span>
                {['All', 'Basic', 'Premium', 'Luxury'].map(plan => (
                  <button
                    key={plan}
                    onClick={() => setPlanFilter(plan)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      planFilter === plan ? 'bg-rose-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {plan === 'All' ? 'Todos' : plan}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Casal / Cliente</th>
                    <th className="p-3.5">Data do Evento</th>
                    <th className="p-3.5">Plano</th>
                    <th className="p-3.5">Status da Licença</th>
                    <th className="p-3.5">Credenciais</th>
                    <th className="p-3.5 text-right">Controle de Acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Nenhum casal encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client, idx) => {
                      const matchingAccounts = userAccounts.filter(acc => acc.clientId === client.id);
                      return (
                        <tr 
                          key={`${client.id || 'client'}-${idx}`}
                          onClick={() => { setReadOnlyClient(client); setIsReadOnlyModalOpen(true); }}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-rose-800 dark:group-hover:text-rose-400">
                              {client.clientName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{client.clientEmail}</div>
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300">
                            {new Date(client.weddingDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                            {client.plan}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                              client.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              client.status === 'Suspended' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {client.status === 'Active' ? '✓ Ativo / Liberado' : 
                               client.status === 'Suspended' ? '🚫 Acesso Suspenso' : '⏱ Aguardando'}
                            </span>
                          </td>
                          <td className="p-3.5" onClick={e => e.stopPropagation()}>
                            {matchingAccounts.length > 0 ? (
                              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{matchingAccounts[0].username}</span>
                                <button
                                  onClick={() => handleCopy(`User: ${matchingAccounts[0].username} | Pass: ${matchingAccounts[0].pass}`)}
                                  className="text-slate-400 hover:text-rose-700 p-0.5"
                                  title="Copiar credenciais"
                                >
                                  {copiedText?.includes(matchingAccounts[0].username) ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Validar Pacote Fora de Pagamento */}
                              <button
                                onClick={(e) => handleOpenValidateModal(client, e)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-all flex items-center gap-1 cursor-pointer"
                                title="Validar adesão a pacotes fora de pagamento online (Cortesia, Multicaixa, Depósito Bancário)"
                              >
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                <span>Validar Pacote</span>
                              </button>

                              {/* Dar e Tirar Acessos a Certas Funcionalidades */}
                              <button
                                onClick={(e) => handleOpenFeaturesModal(client, e)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                                title="Gerir acessos a funcionalidades específicas (Álbum, WhatsApp, Scanner, Limite de Convidados)"
                              >
                                <Sliders className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                <span>Acessos</span>
                              </button>

                              {/* Dar e retirar acessos gerais */}
                              <button
                                onClick={(e) => handleToggleAccess(client, e)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                                  client.status === 'Active'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                }`}
                                title={client.status === 'Active' ? 'Suspender Acesso Geral' : 'Liberar Acesso Geral'}
                              >
                                {client.status === 'Active' ? 'Suspender' : 'Ativar'}
                              </button>
                              <button
                                onClick={() => { setReadOnlyClient(client); setIsReadOnlyModalOpen(true); }}
                                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
                                title="Ver Ficha em Modo Leitura"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleOpenEditModal(client, e)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Remover definitivamente "${client.clientName}"?`)) {
                                    onDeleteClient(client.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB 3: OFERTA DE PREÇOS DOS PLANOS PAGOS COM DESTAQUE EXCLUSIVO */}
        {activeTab === 'plans' && (
          <motion.div
            key="plans-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Planos Comerciais em Kwanzas (AOA)</h3>
                <p className="text-xs text-slate-400">Edite preços, capacidades de convidados e recursos exclusivos de cada pacote</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Restaurar preços e pacotes padrão do mercado angolano?')) {
                    setPlans(DEFAULT_PLANS);
                    safeSetItem('kutxi_saas_plans', JSON.stringify(DEFAULT_PLANS));
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Valores Padrão</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map(plan => (
                <div 
                  key={plan.id}
                  className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    plan.popular 
                      ? 'border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20 shadow-md' 
                      : 'border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">{plan.name}</span>
                        <strong className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
                          {plan.price.toLocaleString('pt-AO')} Kz
                        </strong>
                        <span className="text-[9px] text-slate-400 font-mono"> / {plan.period}</span>
                      </div>
                      {plan.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 uppercase">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    {/* Exclusive perks highlight */}
                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                        ★ Exclusivo Desta Modalidade
                      </span>
                      {plan.exclusivePerks.map((perk, pIdx) => (
                        <div key={pIdx} className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <div><strong>Capacidade:</strong> {plan.guestLimit} convidados</div>
                      <div><strong>Armazenamento:</strong> {plan.storageGB} GB</div>
                      <div><strong>Suporte:</strong> {plan.support}</div>
                    </div>

                    <ul className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">100% em Kwanzas</span>
                    <button
                      type="button"
                      onClick={() => setEditingPlan(plan)}
                      className="px-3 py-1.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar Pacote</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB 4: WHATSAPP & WEBHOOK CONFIGURATION & ERROR LOGS */}
        {activeTab === 'messaging' && (
          <motion.div
            key="messaging-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* TWILIO WHATSAPP INTEGRATION CARD */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        Integração Oficial Twilio WhatsApp
                      </h3>
                      {serverTwilioStatus?.configured ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Configurado no Servidor
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Aguardando Variáveis (.env)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Disparo automático e assíncrono de convites e tokens RSVP. Credenciais protegidas exclusivamente no servidor.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setTestingTwilio(true);
                      setTwilioTestResult(null);
                      const res = await testTwilioConnection();
                      setTwilioTestResult(res);
                      const status = await checkTwilioServerStatus();
                      setServerTwilioStatus(status);
                      setTestingTwilio(false);
                    }}
                    disabled={testingTwilio}
                    className="px-4 py-2 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingTwilio ? 'animate-spin' : ''}`} />
                    <span>{testingTwilio ? 'Validando...' : 'Testar Conexão Twilio'}</span>
                  </button>
                </div>
              </div>

              {/* Twilio Test Connection Feedback */}
              {twilioTestResult && (
                <div className={`p-3.5 rounded-xl text-xs flex gap-2.5 ${
                  twilioTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}>
                  {twilioTestResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block font-semibold">
                      {twilioTestResult.success ? 'Twilio Autenticado com Sucesso!' : 'Falha na Validação Twilio'}
                    </strong>
                    <p className="mt-0.5 leading-relaxed">{twilioTestResult.message}</p>
                  </div>
                </div>
              )}

              {/* Twilio Server Security & Environment Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                    Twilio Account SID (Servidor)
                  </span>
                  <div className="font-mono text-[12px] font-bold text-slate-800 dark:text-slate-200">
                    {serverTwilioStatus?.accountSid || (serverTwilioStatus?.configured ? 'Configurado no Servidor' : 'Não definido no .env')}
                  </div>
                  <span className="text-[10px] text-slate-400">Variável: TWILIO_ACCOUNT_SID</span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                    Auth Token / API Secret
                  </span>
                  <div className="font-mono text-[12px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>{serverTwilioStatus?.configured ? 'Protegido no Servidor' : 'Ausente no .env'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Variável: TWILIO_AUTH_TOKEN</span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                    Remetente WhatsApp (From)
                  </span>
                  <div className="font-mono text-[12px] font-bold text-slate-800 dark:text-slate-200">
                    {serverTwilioStatus?.whatsappFrom || '+14155238886'}
                  </div>
                  <span className="text-[10px] text-slate-400">Sandbox padrão ou número aprovado</span>
                </div>
              </div>

              {/* Twilio Sandbox & Live Test Dispatcher */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    Disparo de Teste Real via Twilio WhatsApp
                  </span>
                  <span className="text-[10px] text-slate-400">Ambiente de Testes / Sandbox</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <input
                      type="tel"
                      placeholder="Telefone (ex: +244923000000)"
                      value={testPhoneNumber}
                      onChange={e => setTestPhoneNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Mensagem de teste..."
                      value={testMessageText}
                      onChange={e => setTestMessageText(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      disabled={sendingTwilioTest || !testPhoneNumber || testPhoneNumber.length < 8}
                      onClick={async () => {
                        setSendingTwilioTest(true);
                        setTestSendResult(null);
                        const res = await testTwilioSend(testPhoneNumber, testMessageText);
                        setTestSendResult(res);
                        setSendingTwilioTest(false);
                        setMessagingLogs(getMessagingLogs());
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      {sendingTwilioTest ? 'Disparando...' : 'Enviar Teste'}
                    </button>
                  </div>
                </div>

                {testSendResult && (
                  <div className={`p-2.5 rounded-xl text-[11px] ${
                    testSendResult.success
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200'
                  }`}>
                    {testSendResult.success ? (
                      <span>✓ {testSendResult.message || 'Mensagem enviada com sucesso!'}</span>
                    ) : (
                      <span>✕ {testSendResult.error}</span>
                    )}
                  </div>
                )}

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900 rounded-xl text-[10px] text-amber-900 dark:text-amber-200 leading-relaxed">
                  💡 <strong>Instrução Sandbox Twilio:</strong> Se estiver usando o Sandbox de testes da Twilio (+1 415 523 8886), envie uma mensagem no WhatsApp com o código de adesão fornecido no console da Twilio (ex: <code>join &lt;código&gt;</code>) a partir do seu celular antes de disparar. Contas com número WhatsApp aprovado na Twilio enviam para qualquer número sem restrição.
                </div>
              </div>

              {/* Provider Selection & Auto-Send Switch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <strong className="block text-slate-800 dark:text-slate-200">Provedor de Mensageria Ativo</strong>
                    <span className="text-[10px] text-slate-400">Escolha o serviço primário</span>
                  </div>
                  <select
                    value={msgConfig.provider}
                    onChange={e => setMsgConfig({ ...msgConfig, provider: e.target.value as any })}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  >
                    <option value="twilio">Twilio WhatsApp API (Ativo)</option>
                    <option value="webhook">Webhook Customizado</option>
                  </select>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <strong className="block text-slate-800 dark:text-slate-200">Disparo Assíncrono ao Criar Convidado</strong>
                    <span className="text-[10px] text-slate-400">Envia convite sem travar a interface</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMsgConfig({ ...msgConfig, autoSendOnGuestCreated: !msgConfig.autoSendOnGuestCreated })}
                    className="cursor-pointer"
                  >
                    {msgConfig.autoSendOnGuestCreated ? (
                      <ToggleRight className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Custom Webhook Settings (Optional) */}
              {msgConfig.provider === 'webhook' && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Endpoint Webhook Alternativo</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="url"
                      placeholder="https://api.seuservidor.com/webhook"
                      value={msgConfig.webhookUrl}
                      onChange={e => setMsgConfig({ ...msgConfig, webhookUrl: e.target.value })}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                    />
                    <input
                      type="password"
                      placeholder="Bearer token da API"
                      value={msgConfig.apiToken}
                      onChange={e => setMsgConfig({ ...msgConfig, apiToken: e.target.value })}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    saveMessagingConfig(msgConfig);
                    setMsgSavedToast(true);
                    setTimeout(() => setMsgSavedToast(false), 3000);
                  }}
                  className="px-5 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Configurações de Mensageria</span>
                </button>
              </div>
            </div>

            {/* Delivery & Error Logs */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Log de Envios & Falhas de Mensageria</h3>
                  <p className="text-xs text-slate-400">Registro detalhado de cada tentativa, erro e status de disparo</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMessagingLogs(getMessagingLogs())}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-xs cursor-pointer"
                    title="Atualizar logs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { clearMessagingLogs(); setMessagingLogs([]); }}
                    className="px-2.5 py-1 text-slate-400 hover:text-rose-600 text-[10px] font-bold"
                  >
                    Limpar Logs
                  </button>
                </div>
              </div>

              {messagingLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhum registro de mensageria ainda. Ao adicionar convidados com telefone, os logs aparecerão aqui.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {messagingLogs.map(log => (
                    <div 
                      key={log.id}
                      className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        log.status === 'success' 
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                          : log.status === 'failed'
                          ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{log.recipientName}</span>
                          <span className="font-mono text-[10px] text-slate-500">({log.recipientPhone})</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            log.status === 'success' ? 'bg-emerald-200 text-emerald-900' :
                            log.status === 'failed' ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {log.status === 'success' ? 'Entregue' : log.status === 'failed' ? 'Falhou' : 'Pronto'}
                          </span>
                        </div>
                        {log.errorDetails && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                            Erro: {log.errorDetails}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono self-start sm:self-center">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 5: DEFINIÇÕES DO SISTEMA (SUPABASE & ESTADO VIRGEM) */}
        {activeTab === 'settings' && (
          <motion.div
            key="settings-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Supabase Information in System Settings */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Banco de Dados Supabase (Cloud)</h3>
                    <p className="text-xs text-slate-400">Armazenamento em nuvem multi-tenant e tempo real</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSupabaseModalOpen(true)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configurar Supabase</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Status da Conexão</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
                    <strong className="text-slate-900 dark:text-white">{isSupabaseConfigured() ? 'Conectado à Nuvem' : 'Armazenamento Local'}</strong>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Modo de Operação</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-1">
                    Híbrido Resiliente (Local + Cloud)
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Persistência</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-1">
                    IndexedDB + Web Storage
                  </div>
                </div>
              </div>
            </div>

            {/* Virgin State Clean Slate Button (As requested by user) */}
            <div className="bg-rose-50 dark:bg-rose-950/40 p-6 rounded-2xl border border-rose-200 dark:border-rose-900 space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-rose-950 dark:text-rose-200">Limpar Dados & Deixar Estado Virgem (Reset)</h4>
                  <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
                    Como solicitado: limpa todos os dados carregados de teste e deixa o programa <strong>virgem pronto a ser utilizado do zero</strong> para novos casais receberem seus logins limpos.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowVirginResetModal(true)}
                  className="px-5 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Todos os Dados e Deixar Virgem</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 6: AUDITORIA DE LOGS */}
        {activeTab === 'logs' && (
          <motion.div
            key="logs-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-semibold uppercase">Logs do Sistema & Eventos de Segurança</span>
              <span className="text-xs text-emerald-600 font-bold">Monitoramento Ativo</span>
            </div>

            <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 font-mono text-[11px] leading-relaxed shadow-inner max-h-96 overflow-y-auto space-y-3 border border-slate-800">
              {auditLogs.map(log => (
                <div key={log.id} className="border-b border-slate-800 pb-2 last:border-0">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span>IP: {log.ip}</span>
                  </div>
                  <div className="mt-0.5">
                    <span className="text-rose-400 font-semibold">{log.actor}</span>: 
                    <span className="text-white font-bold ml-1">{log.action}</span>
                    <span className="text-slate-300 ml-1.5">{log.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* READ ONLY MODAL */}
      <ClientReadOnlyModal
        client={readOnlyClient}
        isOpen={isReadOnlyModalOpen}
        onClose={() => setIsReadOnlyModalOpen(false)}
        userAccounts={userAccounts}
      />

      {/* SUPABASE MODAL */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        clients={clients}
        auditLogs={auditLogs}
      />

      {/* CRUD MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden my-8"
            >
              <div className="bg-slate-950 p-5 text-white flex justify-between items-center border-b border-slate-800">
                <h3 className="font-bold text-sm">
                  {editingClient ? `Editar Casal: ${editingClient.clientName}` : 'Adicionar Novo Casal'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveClient} className="p-6 space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase font-bold text-[10px]">Nome da Noiva</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sofia"
                      value={brideName}
                      onChange={e => setBrideName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase font-bold text-[10px]">Nome do Noivo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Gabriel"
                      value={groomName}
                      onChange={e => setGroomName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase font-bold text-[10px]">E-mail</label>
                    <input
                      type="email"
                      required
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase font-bold text-[10px]">Data do Casamento</label>
                    <input
                      type="date"
                      required
                      value={weddingDate}
                      onChange={e => setWeddingDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase font-bold text-[10px]">Plano Contratado</label>
                    <select
                      value={selectedPlan}
                      onChange={e => setSelectedPlan(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="Basic">Essencial (45.000 Kz)</option>
                      <option value="Premium">Premium (135.000 Kz)</option>
                      <option value="Luxury">Luxo VIP (225.000 Kz)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase font-bold text-[10px]">Status da Licença</label>
                    <select
                      value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    >
                      <option value="Active">Ativo (Acesso Liberado)</option>
                      <option value="Trial">Pendente Pagamento</option>
                      <option value="Suspended">Suspenso (Acesso Bloqueado)</option>
                    </select>
                  </div>
                </div>

                {/* Credentials */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-400">Contas de Acesso</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-[9px] text-slate-400 block">User 1</span>
                      <input
                        type="text"
                        value={user1Username}
                        onChange={e => setUser1Username(e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">Senha 1</span>
                      <input
                        type="text"
                        value={user1Pass}
                        onChange={e => setUser1Pass(e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded text-amber-600 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl font-bold shadow-md"
                  >
                    Salvar Casal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION VIRGIN RESET MODAL */}
      <AnimatePresence>
        {showVirginResetModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm text-center space-y-4 border border-rose-300 dark:border-rose-900 shadow-2xl">
              <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto animate-bounce" />
              <h4 className="font-bold text-slate-900 dark:text-white text-base">Limpar Dados & Deixar Virgem?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Esta ação apagará todas as listas de convidados de teste e casamentos carregados, deixando o sistema 100% virgem e pronto a ser utilizado do zero. O superadministrador continuará ativo.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowVirginResetModal(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExecuteVirginReset}
                  className="flex-1 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Confirmar Limpeza
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: VALIDAR ADESÃO AO PACOTE FORA DE PAGAMENTO */}
      <AnimatePresence>
        {validatingClient && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-amber-300 dark:border-amber-700 shadow-2xl space-y-4 text-xs text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Validar Adesão Manual</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Fora de Pagamento Online</span>
                  </div>
                </div>
                <button
                  onClick={() => setValidatingClient(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                Casal Selecionado: <strong>{validatingClient.clientName}</strong> ({validatingClient.clientEmail})
              </div>

              <form onSubmit={handleConfirmValidation} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                    Pacote a Validar & Ativar
                  </label>
                  <select
                    value={valPlanTier}
                    onChange={e => setValPlanTier(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs focus:outline-none"
                  >
                    <option value="Basic">Plano Ouro / Essencial (35.000 Kz · até 150 convidados)</option>
                    <option value="Premium">Plano Diamante / Luxo (65.000 Kz · Ilimitado + WhatsApp)</option>
                    <option value="Luxury">Plano Luanda VIP (110.000 Kz · Supremo + Multi-Eventos)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                    Forma de Pagamento / Motivo da Liberação
                  </label>
                  <select
                    value={valReason}
                    onChange={e => setValReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Comprovativo Multicaixa Express (MCX)">Comprovativo Multicaixa Express (MCX)</option>
                    <option value="Transferência Bancária BAI / BFA">Transferência Bancária BAI / BFA</option>
                    <option value="Cortesia / Parceria Estratégica">Cortesia / Parceria Estratégica</option>
                    <option value="Aprovação Manual da Direção">Aprovação Manual da Direção</option>
                  </select>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>A licença será ativada instantaneamente com todos os recursos do plano liberados no painel do casal.</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setValidatingClient(null)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprovar & Ativar</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: GERIR ACESSOS E RECURSOS GRANULARES */}
      <AnimatePresence>
        {featuresClient && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center font-bold">
                    <Sliders className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Gerir Acessos & Recursos</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{featuresClient.clientName}</span>
                  </div>
                </div>
                <button
                  onClick={() => setFeaturesClient(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveFeatures} className="space-y-4">
                <div className="space-y-2.5">
                  <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider block">
                    Permissões de Recursos no Painel
                  </label>

                  {/* Toggle: Álbum Coletivo */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <strong className="text-slate-900 dark:text-white block text-xs">Álbum Coletivo Colaborativo</strong>
                      <span className="text-[10px] text-slate-400">Permite aos convidados enviarem fotos da festa</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTempFeatures((prev: ClientFeatures) => ({ ...prev, allowCollectiveAlbum: !prev.allowCollectiveAlbum }))}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        tempFeatures.allowCollectiveAlbum ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span className={`block w-4 h-4 bg-white rounded-full transition-transform absolute top-1 ${
                        tempFeatures.allowCollectiveAlbum ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  {/* Toggle: WhatsApp Automation */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <strong className="text-slate-900 dark:text-white block text-xs">Disparos Automáticos WhatsApp</strong>
                      <span className="text-[10px] text-slate-400">Disparo de passes e tokens via webhook/Twilio</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTempFeatures((prev: ClientFeatures) => ({ ...prev, allowWhatsAppAutomation: !prev.allowWhatsAppAutomation }))}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        tempFeatures.allowWhatsAppAutomation ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span className={`block w-4 h-4 bg-white rounded-full transition-transform absolute top-1 ${
                        tempFeatures.allowWhatsAppAutomation ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  {/* Toggle: Portaria & Scanner */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <strong className="text-slate-900 dark:text-white block text-xs">Portaria Digital & Scanner QR</strong>
                      <span className="text-[10px] text-slate-400">Validação com leitor de câmera no portão</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTempFeatures((prev: ClientFeatures) => ({ ...prev, allowGatekeeperPortal: !prev.allowGatekeeperPortal }))}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        tempFeatures.allowGatekeeperPortal ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span className={`block w-4 h-4 bg-white rounded-full transition-transform absolute top-1 ${
                        tempFeatures.allowGatekeeperPortal ? 'right-1' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  {/* Guest Limit */}
                  <div className="space-y-1 pt-1">
                    <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                      Limite Máximo de Convidados
                    </label>
                    <select
                      value={tempFeatures.maxGuests || 9999}
                      onChange={e => setTempFeatures((prev: ClientFeatures) => ({ ...prev, maxGuests: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    >
                      <option value="25">25 Convidados (Plano Grátis)</option>
                      <option value="150">150 Convidados (Plano Ouro)</option>
                      <option value="300">300 Convidados</option>
                      <option value="9999">Convidados Ilimitados (Plano Diamante / VIP)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFeaturesClient(null)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Salvar Permissões</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: EDITAR PACOTE / PLANO COMERCIAL */}
      <AnimatePresence>
        {editingPlan && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs text-slate-800 dark:text-slate-100 my-8"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Editar Pacote / Plano Comercial</h4>
                    <span className="text-[10px] text-slate-400">{editingPlan.name} ({editingPlan.id})</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form 
                onSubmit={e => {
                  e.preventDefault();
                  if (!editingPlan) return;
                  setPlans(prev => prev.map(p => p.id === editingPlan.id ? editingPlan : p));
                  safeSetItem('kutxi_saas_plans', JSON.stringify(plans.map(p => p.id === editingPlan.id ? editingPlan : p)));
                  setEditingPlan(null);
                }} 
                className="space-y-3.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                      Nome do Plano *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingPlan.name}
                      onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                      Preço em Kwanzas (Kz) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={5000}
                      value={editingPlan.price}
                      onChange={e => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                      Limite de Convidados
                    </label>
                    <input
                      type="text"
                      value={editingPlan.guestLimit}
                      onChange={e => {
                        const val = e.target.value;
                        setEditingPlan({ 
                          ...editingPlan, 
                          guestLimit: val.toLowerCase().includes('ilim') ? 'Ilimitado' : (Number(val) || 25) 
                        });
                      }}
                      placeholder="Ex: 150 ou Ilimitado"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                      Armazenamento (GB)
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      min={0.5}
                      value={editingPlan.storageGB}
                      onChange={e => setEditingPlan({ ...editingPlan, storageGB: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                      Período
                    </label>
                    <input
                      type="text"
                      value={editingPlan.period}
                      onChange={e => setEditingPlan({ ...editingPlan, period: e.target.value })}
                      placeholder="único / vitalício"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                      Selo / Badge Destaque (Opcional)
                    </label>
                    <input
                      type="text"
                      value={editingPlan.badge || ''}
                      onChange={e => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                      placeholder="Ex: Mais Recomendado"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                      Nível de Suporte
                    </label>
                    <input
                      type="text"
                      value={editingPlan.support}
                      onChange={e => setEditingPlan({ ...editingPlan, support: e.target.value })}
                      placeholder="Ex: WhatsApp 24/7"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                    Destaques Exclusivos (1 por linha)
                  </label>
                  <textarea
                    rows={2}
                    value={editingPlan.exclusivePerks.join('\n')}
                    onChange={e => setEditingPlan({
                      ...editingPlan,
                      exclusivePerks: e.target.value.split('\n').filter(s => s.trim().length > 0)
                    })}
                    placeholder="Recursos exclusivos desta modalidade..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                    Funcionalidades Inclusas (1 por linha)
                  </label>
                  <textarea
                    rows={3}
                    value={editingPlan.features.join('\n')}
                    onChange={e => setEditingPlan({
                      ...editingPlan,
                      features: e.target.value.split('\n').filter(s => s.trim().length > 0)
                    })}
                    placeholder="Lista de todas as funcionalidades..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Alterações do Plano</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
