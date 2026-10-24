import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Calendar, MapPin, Church, Building2, 
  Sparkles, Check, Phone, CreditCard, X, ArrowRight,
  ShieldCheck, AlertCircle
} from 'lucide-react';
import { WeddingConfig } from '../types';

interface EventOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WeddingConfig;
  onSave: (updatedConfig: WeddingConfig) => void;
  onOpenUpgradeModal?: () => void;
}

export default function EventOnboardingModal({
  isOpen,
  onClose,
  config,
  onSave,
  onOpenUpgradeModal
}: EventOnboardingModalProps) {
  const [brideName, setBrideName] = useState(config.brideGroom?.brideName || '');
  const [groomName, setGroomName] = useState(config.brideGroom?.groomName || '');
  const [weddingDate, setWeddingDate] = useState(
    config.date ? config.date.split('T')[0] : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  // Cerimónia Religiosa / Igreja
  const [churchName, setChurchName] = useState(config.venue?.churchName || config.venue?.ceremonyName || '');
  const [churchAddress, setChurchAddress] = useState(config.venue?.churchAddress || config.venue?.ceremonyAddress || '');
  const [churchTime, setChurchTime] = useState(config.venue?.ceremonyTime || '16:00');

  // Cerimónia Civil
  const [civilName, setCivilName] = useState(config.venue?.civilName || '');
  const [civilAddress, setCivilAddress] = useState(config.venue?.civilAddress || '');
  const [civilTime, setCivilTime] = useState(config.venue?.civilTime || '10:30');

  // Copo de Água / Recepção
  const [receptionName, setReceptionName] = useState(config.venue?.receptionName || '');
  const [receptionAddress, setReceptionAddress] = useState(config.venue?.receptionAddress || '');
  const [receptionTime, setReceptionTime] = useState(config.venue?.receptionTime || '18:30');

  // Contato e Presentes
  const [contactPhone, setContactPhone] = useState(config.contactInfo?.phone || '+244 ');
  const [multicaixaPhone, setMulticaixaPhone] = useState(config.giftRegistry?.multicaixaPhone || '');
  const [bankIban, setBankIban] = useState(config.giftRegistry?.iban || '');
  const [bankRecipient, setBankRecipient] = useState(config.giftRegistry?.bankRecipient || '');

  const [activeTab, setActiveTab] = useState<'couple' | 'church' | 'reception' | 'gifts'>('couple');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!groomName.trim() || !brideName.trim()) {
      setErrorMsg('Por favor, informe os nomes do noivo e da noiva.');
      setActiveTab('couple');
      return;
    }

    setIsSubmitting(true);

    const bName = brideName.trim();
    const gName = groomName.trim();

    const updated: WeddingConfig = {
      ...config,
      isNewProfile: false,
      onboardingCompleted: true,
      date: `${weddingDate}T${churchTime ? churchTime.replace(/[^0-9:]/g, '').substring(0, 5) || '16:00' : '16:00'}:00`,
      brideGroom: {
        ...config.brideGroom,
        brideName: bName,
        brideFullName: `${bName}`,
        groomName: gName,
        groomFullName: `${gName}`,
      },
      venue: {
        ...config.venue,
        // Igreja / Religiosa
        ceremonyName: churchName.trim() || 'Igreja / Cerimónia Religiosa',
        ceremonyAddress: churchAddress.trim() || 'Luanda, Angola',
        ceremonyTime: churchTime.trim() || '16:00',
        churchName: churchName.trim() || 'Igreja / Cerimónia Religiosa',
        churchAddress: churchAddress.trim() || 'Luanda, Angola',
        churchTime: churchTime.trim() || '16:00',
        
        // Civil
        civilName: civilName.trim() || 'Conservatória do Registo Civil',
        civilAddress: civilAddress.trim() || 'Luanda, Angola',
        civilTime: civilTime.trim() || '10:30',

        // Recepção / Copo de Água
        receptionName: receptionName.trim() || 'Salão de Recepção / Copo de Água',
        receptionAddress: receptionAddress.trim() || 'Luanda, Angola',
        receptionTime: receptionTime.trim() || '18:30',
      },
      contactInfo: {
        ...config.contactInfo,
        phone: contactPhone.trim(),
        email: config.contactInfo?.email || '',
      },
      giftRegistry: {
        ...config.giftRegistry,
        multicaixaPhone: multicaixaPhone.trim(),
        iban: bankIban.trim(),
        bankRecipient: bankRecipient.trim() || `${gName} & ${bName}`,
        accountHolder: bankRecipient.trim() || `${gName} & ${bName}`
      },
      customFooter: `Com amor eterno, — ${gName} & ${bName}`
    };

    setTimeout(() => {
      onSave(updated);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 font-sans"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-950/60 shadow-2xl max-w-2xl w-full overflow-hidden text-slate-800 dark:text-slate-100 relative my-6"
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 text-white p-6 sm:p-7 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Configuração Inicial do Casamento
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
            Dados Oficiais do Casamento 💍
          </h2>
          <p className="text-xs text-rose-200/80 mt-1 max-w-lg leading-relaxed">
            Preencha os dados da cerimónia e recepção. O seu site, passes VIP em PDF no telemóvel e convite público serão gerados automaticamente.
          </p>
        </div>

        {/* Free Plan Notification & Upgrade Prompt */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-200">
                Plano Grátis Ativo (Limite: 25 Convidados)
              </span>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Adira a um dos planos pagos em Kwanzas (AOA) para desbloquear convidados ilimitados, passes em PDF e portaria QR.
              </p>
            </div>
          </div>
          {onOpenUpgradeModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUpgradeModal();
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold shrink-0 transition-colors shadow-xs cursor-pointer text-center"
            >
              Ver Planos Pagos
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('couple')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'couple' 
                  ? 'bg-rose-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Noivos & Data</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('church')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'church' 
                  ? 'bg-rose-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Church className="w-3.5 h-3.5" />
              <span>Igreja & Civil</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reception')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reception' 
                  ? 'bg-rose-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Copo de Água</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gifts')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'gifts' 
                  ? 'bg-rose-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Multicaixa & IBAN</span>
            </button>
          </div>

          {/* TAB 1: NOIVOS & DATA */}
          {activeTab === 'couple' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nome do Noivo <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Gabriel Pureza"
                    value={groomName}
                    onChange={e => setGroomName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nome da Noiva <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sofia Kiala"
                    value={brideName}
                    onChange={e => setBrideName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Data Principal do Casamento <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={weddingDate}
                    onChange={e => setWeddingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Telefone / WhatsApp dos Noivos
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: +244 923 456 789"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('church')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Próximo: Igreja & Civil</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IGREJA & CIVIL */}
          {activeTab === 'church' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400 block">
                  1. Cerimónia Religiosa (Igreja)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nome da Igreja</label>
                    <input
                      type="text"
                      placeholder="Ex: Igreja Nossa Senhora do Carmo"
                      value={churchName}
                      onChange={e => setChurchName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Horário</label>
                    <input
                      type="text"
                      placeholder="Ex: 16:00h"
                      value={churchTime}
                      onChange={e => setChurchTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Endereço da Igreja</label>
                  <input
                    type="text"
                    placeholder="Ex: Largo do Carmo, Ingombota, Luanda, Angola"
                    value={churchAddress}
                    onChange={e => setChurchAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                  2. Cerimónia Civil (Registo)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Conservatória / Local</label>
                    <input
                      type="text"
                      placeholder="Ex: Conservatória do Registo Civil de Luanda"
                      value={civilName}
                      onChange={e => setCivilName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Horário</label>
                    <input
                      type="text"
                      placeholder="Ex: 10:30h"
                      value={civilTime}
                      onChange={e => setCivilTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Endereço da Cerimónia Civil</label>
                  <input
                    type="text"
                    placeholder="Ex: Rua Rainha Ginga, Ingombota, Luanda"
                    value={civilAddress}
                    onChange={e => setCivilAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('couple')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reception')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Próximo: Copo de Água</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: COPO DE ÁGUA */}
          {activeTab === 'reception' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400 block">
                  Recepção, Banquete Nupcial & Festa
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Nome do Salão ou Espaço</label>
                    <input
                      type="text"
                      placeholder="Ex: Espaço Jardins da Welwitschia"
                      value={receptionName}
                      onChange={e => setReceptionName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Horário</label>
                    <input
                      type="text"
                      placeholder="Ex: A partir das 18:30h"
                      value={receptionTime}
                      onChange={e => setReceptionTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Endereço da Recepção</label>
                  <input
                    type="text"
                    placeholder="Ex: Via AL 15, Condomínio Welwitschia, Talatona, Luanda"
                    value={receptionAddress}
                    onChange={e => setReceptionAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('church')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('gifts')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Próximo: Presentes & Multicaixa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PRESENTES & MULTICAIXA */}
          {activeTab === 'gifts' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  Configuração de Presentes (Multicaixa Express & Bancos em Angola)
                </span>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Telefone para Multicaixa Express
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 923 456 789"
                    value={multicaixaPhone}
                    onChange={e => setMulticaixaPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Os convidados poderão enviar cotas e presentes diretamente pelo MCX.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">IBAN Angolano (BAI / BFA / etc.)</label>
                    <input
                      type="text"
                      placeholder="Ex: AO06.0040.0000.1234.5678.9012.3"
                      value={bankIban}
                      onChange={e => setBankIban(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Titular da Conta</label>
                    <input
                      type="text"
                      placeholder="Ex: Sofia Kiala & Gabriel Pureza"
                      value={bankRecipient}
                      onChange={e => setBankRecipient(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('reception')}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Salvando...' : 'Concluir & Ativar Perfil'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Action Footer if on first tab */}
          {activeTab === 'couple' && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Poderá editar estas informações mais tarde a qualquer momento.
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Dados Agora</span>
              </button>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
