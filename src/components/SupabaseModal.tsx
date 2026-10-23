import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Database, Check, Copy, RefreshCw, X, ShieldCheck, 
  AlertCircle, Cloud, ArrowDownUp, Trash2, Key, Link as LinkIcon 
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials, 
  testSupabaseConnection, 
  isSupabaseConfigured 
} from '../services/supabase';
import { dbService } from '../services/dbService';
import { freeUpLocalStorageSpace } from '../utils/storage';
import { ClientWeddingSaaS, WeddingConfig, Guest, SystemAuditLog } from '../types';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients?: ClientWeddingSaaS[];
  weddingConfig?: WeddingConfig;
  guests?: Guest[];
  auditLogs?: SystemAuditLog[];
  onDataSynced?: () => void;
}

const SUPABASE_SCHEMA_SQL = `-- KUTXI SAAS — SCHEMA SUPABASE
CREATE TABLE IF NOT EXISTS public.kutxi_clients (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    subdomain TEXT,
    plan TEXT DEFAULT 'Premium',
    status TEXT DEFAULT 'Active',
    wedding_date TEXT,
    email TEXT,
    paid_amount NUMERIC DEFAULT 0,
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.kutxi_wedding_configs (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    config_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.kutxi_guests (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    group_name TEXT DEFAULT 'Geral',
    table_number TEXT,
    rsvp_token TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    max_plus_ones INT DEFAULT 0,
    plus_ones_confirmed INT DEFAULT 0,
    companions JSONB DEFAULT '[]'::jsonb,
    dietary TEXT,
    notes TEXT,
    invitation_views INT DEFAULT 0,
    checked_in BOOLEAN DEFAULT false,
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.kutxi_gift_registry (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'eletro',
    price NUMERIC DEFAULT 0,
    image_url TEXT,
    description TEXT,
    is_purchased BOOLEAN DEFAULT false,
    claimed_by TEXT,
    guest_message TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.kutxi_audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT
);

-- RLS POLICIES
ALTER TABLE public.kutxi_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kutxi_wedding_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kutxi_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kutxi_gift_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kutxi_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access kutxi_clients" ON public.kutxi_clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access kutxi_wedding_configs" ON public.kutxi_wedding_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access kutxi_guests" ON public.kutxi_guests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access kutxi_gift_registry" ON public.kutxi_gift_registry FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access kutxi_audit_logs" ON public.kutxi_audit_logs FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.kutxi_guests;`;

export default function SupabaseModal({
  isOpen,
  onClose,
  clients = [],
  weddingConfig,
  guests = [],
  auditLogs = [],
  onDataSynced
}: SupabaseModalProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'sync' | 'sql'>('config');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [quotaFreedMsg, setQuotaFreedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      setTestResult(null);
      setSyncResult(null);
      setQuotaFreedMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveSupabaseCredentials(url, anonKey);
    setTestResult({
      success: true,
      message: 'Credenciais salvas com sucesso! Clique em "Testar Conexão" para validar.'
    });
  };

  const handleTest = async () => {
    saveSupabaseCredentials(url, anonKey);
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setTestResult({
      success: false,
      message: 'Supabase desconectado. A aplicação operará no modo de armazenamento local seguro.'
    });
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const cfg = weddingConfig || (await dbService.weddingConfig.get('client_1'));
      const gst = guests.length > 0 ? guests : (await dbService.guests.getAll('client_1'));
      const res = await dbService.sync.pushAllToSupabase(clients, cfg, gst, auditLogs);
      setSyncResult(res);
      if (res.success && onDataSynced) {
        onDataSynced();
      }
    } catch (err: any) {
      setSyncResult({ success: false, message: `Erro: ${err?.message || 'Falha de comunicação'}` });
    } finally {
      setSyncing(false);
    }
  };

  const handleFreeStorage = () => {
    freeUpLocalStorageSpace();
    setQuotaFreedMsg('Caches limpos com sucesso. Quota de armazenamento protegida!');
    setTimeout(() => setQuotaFreedMsg(null), 4000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div 
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supabase-modal-title"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-2xl w-full overflow-hidden my-6 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-950 p-6 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="supabase-modal-title" className="font-display font-bold text-base md:text-lg">Definições do Banco de Dados Supabase</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isConfigured 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                }`}>
                  {isConfigured ? 'Conectado' : 'Modo Local'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Armazenamento em nuvem para casamentos, RSVP em tempo real e controle de portaria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar janela"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-6 shrink-0">
          {[
            { id: 'config', label: 'Conexão & Credenciais', icon: Key },
            { id: 'sync', label: 'Sincronização Cloud', icon: ArrowDownUp },
            { id: 'sql', label: 'Script SQL Migration', icon: Copy },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  active 
                    ? 'border-rose-900 dark:border-rose-500 text-rose-950 dark:text-rose-300 bg-white dark:bg-slate-900' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-rose-900 dark:text-rose-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          {activeTab === 'config' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Cloud className="w-4 h-4 text-rose-800 dark:text-rose-400" />
                  <span>Conecte o seu projeto Supabase</span>
                </div>
                <p className="leading-relaxed">
                  Insira o <strong>Project URL</strong> e a <strong>Anon / Public API Key</strong> do seu painel Supabase (em <em>Settings &gt; API</em>). 
                  Se não configurar o Supabase, o Kutxi opera perfeitamente com armazenamento local seguro e persistência IndexedDB.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Supabase Project URL (VITE_SUPABASE_URL)
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="url"
                      placeholder="https://xyzcompany.supabase.co"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-800 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Supabase Anon / Public Key (VITE_SUPABASE_ANON_KEY)
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={anonKey}
                      onChange={e => setAnonKey(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-800 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>

              {testResult && (
                <div className={`p-4 rounded-2xl text-xs flex gap-3 ${
                  testResult.success 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                    : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}>
                  {testResult.success ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <strong className="block font-semibold">
                      {testResult.success ? 'Conexão Bem-Sucedida' : 'Falha na Validação'}
                    </strong>
                    <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || !url}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-900 hover:bg-rose-950 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Testando Conexão...' : 'Testar Conexão'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar Credenciais
                </button>
                {isConfigured && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold rounded-xl transition-all ml-auto cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Desconectar
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 rounded-2xl text-xs text-emerald-950 dark:text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Sincronização Automática & Cache Resiliente</span>
                </div>
                <p className="leading-relaxed">
                  Os dados são mantidos em sincronia com o Supabase quando online e em cache local seguro quando offline.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Casais SaaS</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{clients.length}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Convidados</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{guests.length}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Configuração</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{weddingConfig ? 'Ativa' : 'Padrão'}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Logs de Auditoria</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{auditLogs.length}</div>
                </div>
              </div>

              {syncResult && (
                <div className={`p-4 rounded-2xl text-xs flex gap-3 ${
                  syncResult.success 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                    : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}>
                  {syncResult.success ? (
                    <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <strong className="block font-semibold">
                      {syncResult.success ? 'Sincronização Concluída' : 'Erro na Sincronização'}
                    </strong>
                    <p className="mt-0.5 leading-relaxed">{syncResult.message}</p>
                  </div>
                </div>
              )}

              {quotaFreedMsg && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>{quotaFreedMsg}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-900 hover:bg-rose-950 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <ArrowDownUp className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando com Supabase...' : 'Sincronizar com Supabase'}
                </button>
                <button
                  type="button"
                  onClick={handleFreeStorage}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                  Limpar Caches Locais
                </button>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Script SQL para o Supabase SQL Editor
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Copie e execute este script no painel do Supabase para criar as tabelas com RLS e tempo real.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-900 hover:bg-rose-950 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copiado!' : 'Copiar SQL'}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed border border-slate-800">
                  {SUPABASE_SCHEMA_SQL}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Informação integrada nas definições do sistema</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
