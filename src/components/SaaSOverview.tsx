import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, CheckCircle, Clock, Eye, 
  MapPin, Calendar, Compass, 
  TrendingUp, Sparkles, Check, Trash2, Edit, Plus, 
  AlertTriangle, Upload, 
  CheckSquare, Square, Printer, MessageCircle, Share2, Gift, Camera, 
  Heart, BookOpen, QrCode, ChevronRight, X,
  ShoppingBag, Coins, Trophy, Target, ArrowUpRight, Search, ChevronDown, SlidersHorizontal, Download
} from 'lucide-react';
import { Guest, WeddingConfig, TodoItem, ClientWeddingSaaS } from '../types';
import { getSafeImageUrl, handleImageError } from '../utils/imageFallback';
import { downloadQrCodeImage } from '../utils/qrCodeHelper';
import { downloadPhysicalCardQrPdf } from '../utils/pdfGenerator';
import { buildPortableInviteLink } from '../utils/portableLink';
import EventOnboardingModal from './EventOnboardingModal';
import UpgradePlanModal from './UpgradePlanModal';
import ActivationRequestModal from './ActivationRequestModal';
import { usePlanPermissions } from '../hooks/usePlanPermissions';

interface SaaSOverviewProps {
  guests: Guest[];
  config: WeddingConfig;
  planName: string;
  client?: ClientWeddingSaaS;
  onUpdateConfig?: (config: WeddingConfig) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenPublicInvite?: () => void;
}

export default function SaaSOverview({ 
  guests, 
  config, 
  planName, 
  client,
  onUpdateConfig, 
  onNavigateTab, 
  onOpenPublicInvite 
}: SaaSOverviewProps) {
  const permissions = usePlanPermissions(client, guests.length);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  // Auto-open Event Onboarding modal if profile is fresh or unconfigured
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(() => {
    return Boolean(config.isNewProfile || !config.onboardingCompleted);
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [showActivationModal, setShowActivationModal] = useState<boolean>(false);
  const [activationSubmittedToast, setActivationSubmittedToast] = useState(false);

  // Stats
  const totalGuests = guests.length;
  const confirmedGuests = guests.filter(g => g.status === 'Confirmed');
  const pendingGuests = guests.filter(g => g.status === 'Pending');
  const declinedGuests = guests.filter(g => g.status === 'Declined');
  const totalSeatsConfirmed = confirmedGuests.reduce((acc, g) => acc + 1 + g.plusOnesConfirmed, 0);
  const totalSeatsPending = pendingGuests.reduce((acc, g) => acc + 1 + g.maxPlusOnes, 0);
  const checkedInCount = guests.filter(g => g.checkedIn).length;
  const totalViews = guests.reduce((acc, g) => acc + g.invitationViews, 0);

  // Registry
  const registryItems = config.giftRegistry?.registryItems || [];
  const claimedGifts = registryItems.filter(i => Boolean(i.claimedBy));
  const claimedGiftTotal = claimedGifts.reduce((acc, i) => acc + (i.price || 0), 0);

  // Countdown calculation
  useEffect(() => {
    const weddingDate = new Date(config.date).getTime();
    const now = new Date().getTime();
    const difference = weddingDate - now;
    const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
    setDaysLeft(days > 0 ? days : 0);
  }, [config.date]);

  // Profile Form state
  const [profileGroom, setProfileGroom] = useState(config.brideGroom?.groomName || '');
  const [profileBride, setProfileBride] = useState(config.brideGroom?.brideName || '');
  const [profileDate, setProfileDate] = useState(config.date ? config.date.split('T')[0] : '2026-10-25');
  const [profileCeremony, setProfileCeremony] = useState(config.venue?.ceremonyName || '');
  const [profileAddress, setProfileAddress] = useState(config.venue?.ceremonyAddress || '');
  const [profileSuccessNotice, setProfileSuccessNotice] = useState(false);

  useEffect(() => {
    setProfileGroom(config.brideGroom?.groomName || '');
    setProfileBride(config.brideGroom?.brideName || '');
    setProfileDate(config.date ? config.date.split('T')[0] : '2026-10-25');
    setProfileCeremony(config.venue?.ceremonyName || '');
    setProfileAddress(config.venue?.ceremonyAddress || '');
  }, [config]);

  // To-do list (Tarefas dos Noivos)
  const todoList: TodoItem[] = config.todoList || [];
  const completedTasks = todoList.filter(t => t.completed).length;
  const taskCompletionPercentage = todoList.length > 0 ? Math.round((completedTasks / todoList.length) * 100) : 0;

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskUrgency, setNewTaskUrgency] = useState<'alta' | 'media' | 'baixa'>('media');
  const [editingTask, setEditingTask] = useState<TodoItem | null>(null);

  const handleToggleTask = (id: string) => {
    const updated = todoList.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, todoList: updated });
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskLabel.trim()) return;
    const newTask: TodoItem = {
      id: 'task_' + Date.now(),
      label: newTaskLabel.trim(),
      completed: false,
      urgency: newTaskUrgency
    };
    const updated = [newTask, ...todoList];
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, todoList: updated });
    }
    setNewTaskLabel('');
    setShowAddTaskModal(false);
  };

  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = todoList.filter(t => t.id !== taskId);
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, todoList: updated });
    }
  };

  const handleSaveEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.label.trim()) return;
    const updated = todoList.map(t => t.id === editingTask.id ? editingTask : t);
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, todoList: updated });
    }
    setEditingTask(null);
  };

  // Mural Comments Moderation (Aguardando Validação no Perfil dos Noivos)
  const muralComments = config.muralComments || [];
  const pendingMuralComments = muralComments.filter(m => m.status === 'pending');
  const approvedMuralComments = muralComments.filter(m => m.status === 'approved' || !m.status);

  const handleApproveMuralComment = (id: string) => {
    const updated = muralComments.map(m => m.id === id ? { ...m, status: 'approved' as const } : m);
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, muralComments: updated });
    }
  };

  const handleRejectMuralComment = (id: string) => {
    const updated = muralComments.filter(m => m.id !== id);
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, muralComments: updated });
    }
  };

  const handleSaveProfile = () => {
    if (!onUpdateConfig) return;
    const groom = profileGroom.trim() || 'Noivo';
    const bride = profileBride.trim() || 'Noiva';
    const updated: WeddingConfig = {
      ...config,
      date: `${profileDate}T16:00:00`,
      brideGroom: {
        ...config.brideGroom,
        groomName: groom,
        brideName: bride,
        groomFullName: `${groom} dos Santos`,
        brideFullName: `${bride} de Oliveira`,
      },
      venue: {
        ...config.venue,
        ceremonyName: profileCeremony.trim() || 'Espaço de Eventos',
        ceremonyAddress: profileAddress.trim() || 'Luanda, Angola',
        churchName: profileCeremony.trim() || config.venue?.churchName || 'Igreja Nossa Senhora do Carmo',
        churchAddress: profileAddress.trim() || config.venue?.churchAddress || 'Luanda, Angola',
      },
      customFooter: `Com amor, sempre. — ${groom} & ${bride}`,
      giftRegistry: {
        ...config.giftRegistry,
        accountHolder: `${groom} & ${bride}`,
        bankRecipient: `${groom} & ${bride}`
      }
    };
    onUpdateConfig(updated);
    setShowProfileModal(false);
    setProfileSuccessNotice(true);
    setTimeout(() => setProfileSuccessNotice(false), 3000);
  };

  const coupleDisplayName = `${config.brideGroom?.groomName || 'Noivo'} & ${config.brideGroom?.brideName || 'Noiva'}`;

  return (
    <div className="space-y-6 text-stone-800 dark:text-stone-100" id="saas-overview-root">
      {/* SUCCESS NOTICE */}
      {profileSuccessNotice && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs font-medium flex items-center justify-between shadow-2xs">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Perfil e dados do casamento atualizados e sincronizados instantaneamente com o link do convite!
          </span>
        </div>
      )}

      {/* HERO BANNER WITH COUPLE AND COUNTDOWN - Luminous, Light Luxury Design */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFFDFB] via-[#FAF6F2] to-[#FFF8F7] dark:from-stone-900 dark:via-stone-850 dark:to-stone-900 p-6 md:p-8 text-stone-900 dark:text-stone-100 shadow-[0_10px_30px_-5px_rgba(142,40,64,0.06)] border border-[#E8DFD8] dark:border-stone-800">
        {/* Subtle Ambient Light Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-100/40 via-rose-100/30 to-transparent dark:from-rose-950/20 dark:to-transparent rounded-full blur-3xl -z-0 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-rose-100/30 via-amber-50/20 to-transparent dark:from-amber-950/10 dark:to-transparent rounded-full blur-2xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Couple Photo Container */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-[#E5D7CB] dark:border-stone-700 shadow-md bg-stone-100 dark:bg-stone-800">
                {config.brideGroom?.couplePhoto ? (
                  <img
                    src={config.brideGroom.couplePhoto}
                    alt={coupleDisplayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 dark:text-stone-500">
                    <Heart className="w-8 h-8 text-[#8E2840] fill-current/20" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shadow-sm hover:text-[#8E2840] transition-colors cursor-pointer"
                title="Editar Foto & Nomes"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Couple Info */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6EE] dark:bg-amber-950/40 text-[#9E7A36] dark:text-amber-300 border border-[#E9DEC6]/70 dark:border-amber-900/40 text-[11px] font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{planName}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-stone-900 dark:text-white">
                {coupleDisplayName}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-stone-500 dark:text-stone-400 font-light">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#8E2840]" />
                  {new Date(config.date).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#9E7A36]" />
                  {config.venue?.ceremonyName || 'Espaço de Eventos'}
                </span>
              </div>
            </div>
          </div>

          {/* Countdown & Quick Action Badges */}
          <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700 shadow-2xs">
              <Clock className="w-4 h-4 text-[#8E2840]" />
              <div className="text-right">
                <span className="text-base font-bold text-stone-900 dark:text-white font-mono">
                  {daysLeft}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400 font-light ml-1">
                  dias restantes
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end">
              <button
                type="button"
                onClick={() => {
                  const link = buildPortableInviteLink(config);
                  navigator.clipboard.writeText(link);
                  setCopiedInviteLink(true);
                  setTimeout(() => setCopiedInviteLink(false), 3000);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-stone-700 hover:border-[#8E2840]/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Copiar link com dados do casamento embutidos"
              >
                <Share2 className="w-3.5 h-3.5 text-[#8E2840]" />
                <span>{copiedInviteLink ? 'Link Copiado!' : 'Copiar Link Convite'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const link = buildPortableInviteLink(config);
                  const groom = config.brideGroom?.groomName?.trim() || 'Noivo';
                  const bride = config.brideGroom?.brideName?.trim() || 'Noiva';
                  const msg = `💍 *Convite Oficial de Casamento* 💍\n\nOlá! Com imensa alegria convidamos você para celebrar o nosso casamento:\n✨ *${groom} & ${bride}*\n\nAcesse o link abaixo para visualizar todos os detalhes e confirmar a sua presença:\n🔗 ${link}`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Partilhar convite no WhatsApp com dados embutidos"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const link = buildPortableInviteLink(config);
                  downloadPhysicalCardQrPdf(config, link);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-stone-700 hover:border-[#9E7A36]/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Baixar Cartão A6 com QR Code autossuficiente"
              >
                <Printer className="w-3.5 h-3.5 text-[#9E7A36]" />
                <span>Cartão A6 QR</span>
              </button>

              <button
                type="button"
                onClick={() => setShowActivationModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Solicitar Ativação</span>
              </button>

              {onOpenPublicInvite && (
                <button
                  type="button"
                  onClick={onOpenPublicInvite}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#8E2840] hover:bg-[#782236] text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ver Convite Público</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PROMINENT ACTIVATION BANNER FOR TRIAL / NON-LUXURY */}
        {(permissions.isTrial || permissions.isGuestLimitExceeded || !permissions.canUseGatekeeperPortal) && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-stone-900 border border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900 dark:text-white">
                  {permissions.isGuestLimitExceeded 
                    ? `Limite de Convidados Atingido (${guests.length}/${permissions.maxGuests})` 
                    : permissions.isTrial 
                    ? 'Versão de Degustação Ativa (Plano Grátis)' 
                    : 'Ative o Pacote Luanda VIP ou Recursos Avançados'}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  {permissions.isGuestLimitExceeded
                    ? `O seu plano atual atingiu o teto de ${permissions.maxGuests} convidados. Solicite a ativação para convidar sem limites.`
                    : 'Desbloqueie convidados ilimitados, álbum coletivo dos convidados e leitor de QR Code para porteiros em tempo real.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowActivationModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Ativar Pacote Agora</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 4 KEY KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Convidados */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Total de Convidados</span>
            <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-serif text-stone-900 dark:text-white">{totalGuests}</span>
            <span className="text-xs text-stone-400 font-light ml-1">convites</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">
            +{guests.reduce((acc, g) => acc + g.plusOnesConfirmed, 0)} acompanhantes confirmados
          </div>
        </div>

        {/* Card 2: Confirmados */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Confirmados (RSVP)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-serif text-emerald-700 dark:text-emerald-400">{confirmedGuests.length}</span>
            <span className="text-xs text-emerald-600/70 font-light ml-1">presenças</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {totalGuests > 0 ? Math.round((confirmedGuests.length / totalGuests) * 100) : 0}% taxa de confirmação
          </div>
        </div>

        {/* Card 3: Pendentes */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Pendentes</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-serif text-amber-700 dark:text-amber-400">{pendingGuests.length}</span>
            <span className="text-xs text-amber-600/70 font-light ml-1">aguardando</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            {declinedGuests.length} ausências informadas
          </div>
        </div>

        {/* Card 4: Check-in Portaria */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8E2840] dark:text-rose-400">Portaria & QR</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-[#8E2840] dark:text-rose-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-serif text-stone-900 dark:text-white">{checkedInCount}</span>
            <span className="text-xs text-stone-400 font-light ml-1">/ {totalSeatsConfirmed} presentes</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">
            {totalSeatsConfirmed > 0 ? Math.round((checkedInCount / totalSeatsConfirmed) * 100) : 0}% check-in realizado
          </div>
        </div>
      </div>

      {/* QUICK SUBMODULE SHORTCUTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Module 1: Convidados & Mesas */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('guests')}
          className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 hover:border-[#8E2840]/40 transition-all cursor-pointer shadow-2xs hover:shadow-sm group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-stone-900 dark:text-white text-base">
              Convidados & Mesas
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-light leading-relaxed">
              Organização de convites, mesas, lista de acompanhantes e exportação completa em Excel e PDF.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-[#8E2840] dark:text-rose-400 group-hover:translate-x-1 transition-transform">
            <span>Acessar Lista de Convidados</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Module 2: Personalizar Convite */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('editor')}
          className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 hover:border-[#8E2840]/40 transition-all cursor-pointer shadow-2xs hover:shadow-sm group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-[#9E7A36]" />
            </div>
            <h3 className="font-serif font-bold text-stone-900 dark:text-white text-base">
              Personalizar Convite & Tema
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-light leading-relaxed">
              Editor em tempo real: paleta de cores, tipografia, fotos da história do casal e cronograma.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-[#8E2840] dark:text-rose-400 group-hover:translate-x-1 transition-transform">
            <span>Abrir Editor Visual</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Module 3: Lista de Presentes & IBAN */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('gifts')}
          className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 hover:border-[#8E2840]/40 transition-all cursor-pointer shadow-2xs hover:shadow-sm group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Gift className="w-5 h-5 text-[#8E2840]" />
            </div>
            <h3 className="font-serif font-bold text-stone-900 dark:text-white text-base">
              Lista de Presentes & Quotas
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-light leading-relaxed">
              Presentes virtuais em Kwanzas (AOA), cotas para lua de mel e IBAN verificado com cópia instantânea.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-[#8E2840] dark:text-rose-400 group-hover:translate-x-1 transition-transform">
            <span>Gerenciar Presentes ({registryItems.length})</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Module 4: Álbum Partilhado */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('album')}
          className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 hover:border-[#8E2840]/40 transition-all cursor-pointer shadow-2xs hover:shadow-sm group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-serif font-bold text-stone-900 dark:text-white text-base">
              Álbum Partilhado & Mural
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-light leading-relaxed">
              QR Code para mesas onde convidados sobem fotos da festa em tempo real com moderação dos noivos.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-[#8E2840] dark:text-rose-400 group-hover:translate-x-1 transition-transform">
            <span>Ver Álbum em Tempo Real</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Module 5: Portaria Inteligente */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('checkin')}
          className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 hover:border-[#8E2840]/40 transition-all cursor-pointer shadow-2xs hover:shadow-sm group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <QrCode className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            </div>
            <h3 className="font-serif font-bold text-stone-900 dark:text-white text-base">
              Portaria & Validador QR
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-light leading-relaxed">
              Controle de acesso seguro com leitor de QR Code, modo offline e validação de acompanhantes.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-[#8E2840] dark:text-rose-400 group-hover:translate-x-1 transition-transform">
            <span>Abrir Validador da Recepção</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>

      {/* TO-DO CHECKLIST & TASK MANAGER */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-xs border border-stone-200/80 dark:border-stone-800 space-y-4 text-stone-800 dark:text-stone-100">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 font-sans">Lista de Tarefas do Casamento</h3>
              <span className="text-xs text-[#8E2840] dark:text-rose-400 font-medium">
                · {completedTasks} de {todoList.length} concluídas ({taskCompletionPercentage}%)
              </span>
            </div>
            <p className="text-xs text-slate-400 font-light">Acompanhe, crie novas tarefas e organize os preparativos do grande dia</p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddTaskModal(true)}
            className="px-4 py-2 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/25 cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Nova Tarefa</span>
          </button>
        </div>

        {todoList.length === 0 ? (
          <div className="text-center py-8 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 text-xs text-stone-400 font-light">
            Nenhuma tarefa cadastrada. Clique em "Criar Nova Tarefa" para começar seu checklist!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {todoList.map(task => (
              <div
                key={task.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all group ${
                  task.completed 
                    ? 'bg-stone-50/70 dark:bg-stone-800/40 border-stone-200/60 dark:border-stone-800 opacity-60' 
                    : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-rose-400/50 shadow-2xs'
                }`}
              >
                <div 
                  onClick={() => handleToggleTask(task.id)}
                  className="flex items-center gap-2.5 cursor-pointer flex-1 mr-2"
                >
                  {task.completed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-300 dark:text-stone-600 shrink-0" />
                  )}
                  <span className={task.completed ? 'line-through text-stone-400' : 'font-medium text-stone-800 dark:text-stone-200'}>
                    {task.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                    task.urgency === 'alta' 
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-[#8E2840] dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40' 
                      : task.urgency === 'media'
                      ? 'bg-[#FAF6EE] dark:bg-amber-950/40 text-[#9E7A36] dark:text-amber-300 border border-[#E9DEC6]/70 dark:border-amber-900/40'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                  }`}>
                    {task.urgency}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                    className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-lg cursor-pointer"
                    title="Editar Tarefa"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteTask(task.id, e)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    title="Apagar Tarefa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODERAÇÃO & VALIDAÇÃO DO MURAL DE MENSAGENS DOS NOIVOS */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-xs border border-stone-200/80 dark:border-stone-800 space-y-4 text-stone-800 dark:text-stone-100">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 font-sans">Mural dos Noivos: Validação de Recados</h3>
              {pendingMuralComments.length > 0 && (
                <span className="text-xs text-amber-600 font-medium animate-pulse">
                  · {pendingMuralComments.length} pendente(s)
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 font-light">
              Mensagens deixadas após contribuição na lista de presentes aguardam sua aprovação antes de serem visíveis no convite
            </p>
          </div>
          <span className="text-xs font-light text-stone-500">
            {approvedMuralComments.length} publicadas no mural
          </span>
        </div>

        {/* PENDING MESSAGES AWAITING APPROVAL */}
        {pendingMuralComments.length > 0 ? (
          <div className="space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E7A36] dark:text-amber-400 block">
              Aguardando sua Validação ({pendingMuralComments.length})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingMuralComments.map(comment => (
                <div 
                  key={comment.id}
                  className="p-4 bg-[#FAF6EE] dark:bg-amber-950/20 rounded-2xl border border-[#E9DEC6] dark:border-amber-900/40 space-y-3 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="font-semibold text-stone-900 dark:text-white block">{comment.author}</strong>
                      <span className="text-[10px] text-stone-400 font-light">{comment.date}</span>
                    </div>
                    {comment.giftName && (
                      <span className="px-2.5 py-0.5 bg-white dark:bg-amber-950/60 text-[#9E7A36] dark:text-amber-200 rounded-full text-[9px] font-medium border border-[#E9DEC6] dark:border-amber-900/50">
                        🎁 {comment.giftName} {comment.amountContributed ? `(${comment.amountContributed.toLocaleString('pt-AO')} Kz)` : ''}
                      </span>
                    )}
                  </div>

                  <p className="text-stone-700 dark:text-stone-200 italic font-serif bg-white/80 dark:bg-stone-900/80 p-3 rounded-xl border border-amber-200/50 dark:border-amber-900/40">
                    "{comment.message}"
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApproveMuralComment(comment.id)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Validar & Publicar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectMuralComment(comment.id)}
                      className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-rose-50 hover:text-[#8E2840] text-stone-600 dark:text-stone-300 rounded-xl text-xs font-medium cursor-pointer transition-all"
                      title="Rejeitar ou Apagar Mensagem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-stone-50 dark:bg-stone-850/50 rounded-xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between text-xs">
            <span className="text-stone-500 dark:text-stone-400 font-light">
              ✓ Nenhuma mensagem aguardando validação no momento.
            </span>
            <span className="text-stone-400 text-[11px] font-mono">
              Total aprovadas: {approvedMuralComments.length}
            </span>
          </div>
        )}
      </div>

      {/* QUICK PROFILE EDIT MODAL */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-serif font-bold text-slate-900 dark:text-white text-base">Editar Perfil dos Noivos</h3>
                <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">Nome do Noivo (Ele)</label>
                    <input
                      type="text"
                      value={profileGroom}
                      onChange={e => setProfileGroom(e.target.value)}
                      placeholder="Ex: Gabriel"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">Nome da Noiva (Ela)</label>
                    <input
                      type="text"
                      value={profileBride}
                      onChange={e => setProfileBride(e.target.value)}
                      placeholder="Ex: Sofia"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Data do Casamento</label>
                  <input
                    type="date"
                    value={profileDate}
                    onChange={e => setProfileDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Local da Cerimônia</label>
                  <input
                    type="text"
                    value={profileCeremony}
                    onChange={e => setProfileCeremony(e.target.value)}
                    placeholder="Ex: Espaço Jardins da Welwitschia"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Endereço</label>
                  <input
                    type="text"
                    value={profileAddress}
                    onChange={e => setProfileAddress(e.target.value)}
                    placeholder="Ex: Via AL 15, Talatona, Luanda"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-900 dark:text-amber-200">
                  ⚡ As alterações salvas são refletidas instantaneamente em todo o site dos convidados, no bilhete digital e no link gerado.
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="flex-1 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl font-bold shadow-md cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CRIAR NOVA TAREFA */}
      <AnimatePresence>
        {showAddTaskModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-serif font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Plus className="w-4 h-4 text-rose-600" />
                  <span>Criar Nova Tarefa</span>
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowAddTaskModal(false)} 
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddTask} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block uppercase text-[10px]">
                    Descrição da Tarefa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Contratar fotógrafo e cinegrafista"
                    value={newTaskLabel}
                    onChange={e => setNewTaskLabel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-rose-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block uppercase text-[10px]">
                    Nível de Urgência
                  </label>
                  <select
                    value={newTaskUrgency}
                    onChange={e => setNewTaskUrgency(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="alta">🔴 Alta Prioridade</option>
                    <option value="media">🟡 Média Prioridade</option>
                    <option value="baixa">🟢 Baixa Prioridade</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTaskModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Tarefa</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDITAR TAREFA */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-serif font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Edit className="w-4 h-4 text-rose-600" />
                  <span>Editar Tarefa</span>
                </h3>
                <button 
                  type="button" 
                  onClick={() => setEditingTask(null)} 
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditTask} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block uppercase text-[10px]">
                    Descrição da Tarefa *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTask.label}
                    onChange={e => setEditingTask({ ...editingTask, label: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-rose-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block uppercase text-[10px]">
                    Nível de Urgência
                  </label>
                  <select
                    value={editingTask.urgency}
                    onChange={e => setEditingTask({ ...editingTask, urgency: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="alta">🔴 Alta Prioridade</option>
                    <option value="media">🟡 Média Prioridade</option>
                    <option value="baixa">🟢 Baixa Prioridade</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    id="edit-task-completed"
                    checked={editingTask.completed}
                    onChange={e => setEditingTask({ ...editingTask, completed: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-800 focus:ring-rose-800"
                  />
                  <label htmlFor="edit-task-completed" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Marcar como concluída
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EVENT ONBOARDING MODAL */}
      <EventOnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        config={config}
        onSave={(updatedConfig) => {
          if (onUpdateConfig) {
            onUpdateConfig(updatedConfig);
          }
          setProfileSuccessNotice(true);
          setTimeout(() => setProfileSuccessNotice(false), 3000);
        }}
        onOpenUpgradeModal={() => setShowUpgradeModal(true)}
      />

      {/* UPGRADE PLAN MODAL */}
      <UpgradePlanModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        config={config}
        currentPlan={planName}
      />

      {/* ACTIVATION REQUEST MODAL */}
      <ActivationRequestModal
        isOpen={showActivationModal}
        onClose={() => setShowActivationModal(false)}
        client={{
          id: config.clientId || config.id || 'client_1',
          clientName: coupleDisplayName,
          clientEmail: config.contactInfo?.email || 'casal@kutxi.ao',
          weddingDate: config.date ? config.date.split('T')[0] : '2026-10-25',
          plan: 'Basic',
          status: 'Trial',
          revenue: 0,
          config
        }}
        onRequestSubmitted={() => {
          setActivationSubmittedToast(true);
          setTimeout(() => setActivationSubmittedToast(false), 4000);
        }}
      />
    </div>
  );
}
