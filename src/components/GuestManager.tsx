import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Search, Filter, Plus, Trash2, CheckCircle, 
  XCircle, Clock, Download, Upload, QrCode, Mail, 
  Tag, AlertCircle, MessageCircle, FileText, Send, Sparkles, Check, X
} from 'lucide-react';
import { Guest, GuestGroup, WeddingConfig } from '../types';
import { downloadWeddingPdf, sendInviteViaWhatsApp } from '../utils/pdfGenerator';
import { INITIAL_WEDDING_CONFIG } from '../data/defaultConfig';
import { generateQrDataUrl } from '../utils/qrCodeHelper';
import { dispatchRsvpWhatsApp, formatGuestMessage } from '../services/messagingService';

interface GuestManagerProps {
  guests: Guest[];
  onAddGuest: (guest: Guest) => void;
  onUpdateGuest: (updatedGuest: Guest) => void;
  onDeleteGuest: (id: string) => void;
  onBulkStatusUpdate: (ids: string[], status: 'Confirmed' | 'Pending' | 'Declined') => void;
  clientId?: string;
  config?: WeddingConfig;
}

export default function GuestManager({ 
  guests, 
  onAddGuest, 
  onUpdateGuest, 
  onDeleteGuest,
  onBulkStatusUpdate,
  clientId = 'client_1',
  config = INITIAL_WEDDING_CONFIG
}: GuestManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<Guest | null>(null);
  const [modalQrCodeUrl, setModalQrCodeUrl] = useState<string>('');
  const [guestToDeleteId, setGuestToDeleteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const pendingRequests = guests.filter(g => 
    g.status === 'Awaiting_Approval' || (!g.approvedByCouple && g.status === 'Pending' && g.requestedAt)
  );

  const handleApproveGuestRequest = (guest: Guest, sendWhatsApp = false) => {
    const updated: Guest = {
      ...guest,
      status: 'Confirmed',
      approvedByCouple: true,
      approvalDate: new Date().toISOString()
    };
    onUpdateGuest(updated);
    showToast(`Presença de ${guest.name} aprovada com sucesso! O Passe VIP Mobile foi gerado.`, 'success');
    if (sendWhatsApp) {
      sendInviteViaWhatsApp(config, updated);
    }
  };

  const handleDeclineGuestRequest = (guest: Guest) => {
    const updated: Guest = {
      ...guest,
      status: 'Declined',
      approvedByCouple: false
    };
    onUpdateGuest(updated);
    showToast(`Solicitação de ${guest.name} recusada.`, 'info');
  };

  useEffect(() => {
    if (showQrModal?.rsvpToken) {
      generateQrDataUrl(`rsvp:${showQrModal.rsvpToken}`, 160)
        .then(url => setModalQrCodeUrl(url))
        .catch(() => setModalQrCodeUrl(''));
    } else {
      setModalQrCodeUrl('');
    }
  }, [showQrModal]);

  const [newGuest, setNewGuest] = useState<Partial<Guest>>({
    name: '',
    email: '',
    phone: '',
    group: 'Friends',
    tableNumber: 'Mesa 1',
    maxPlusOnes: 1,
    status: 'Pending',
    dietaryRequirements: '',
    notes: ''
  });

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          guest.phone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = groupFilter === 'All' || guest.group === groupFilter;
    const matchesStatus = statusFilter === 'All' || guest.status === statusFilter;
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const groups: GuestGroup[] = ['Family', 'Friends', 'VIP', 'Bride Side', 'Groom Side', 'Children', 'Corporate'];

  const getPortugueseGroupLabel = (group: string) => {
    const mapping: Record<string, string> = {
      'Family': 'Família',
      'Friends': 'Amigos',
      'VIP': 'Convidado VIP',
      'Bride Side': 'Família da Noiva',
      'Groom Side': 'Família do Noivo',
      'Children': 'Crianças',
      'Corporate': 'Trabalho / Corp'
    };
    return mapping[group] || group;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGuests(filteredGuests.map(g => g.id));
    } else {
      setSelectedGuests([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedGuests(prev => [...prev, id]);
    } else {
      setSelectedGuests(prev => prev.filter(gid => gid !== id));
    }
  };

  const handleSubmitNewGuest = (e: FormEvent) => {
    e.preventDefault();
    if (!newGuest.name?.trim()) return;

    const cleanName = (newGuest.name || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-');
    const token = cleanName + '-' + Math.floor(1000 + Math.random() * 9000);

    const guestToAdd: Guest = {
      id: 'g_' + Date.now(),
      name: newGuest.name.trim(),
      email: newGuest.email?.trim() || '',
      phone: newGuest.phone?.trim() || '',
      group: (newGuest.group as GuestGroup) || 'Friends',
      tableNumber: newGuest.tableNumber?.trim() || 'Mesa 1',
      maxPlusOnes: Number(newGuest.maxPlusOnes) || 0,
      plusOnesConfirmed: 0,
      companionName: newGuest.companionName?.trim() || undefined,
      status: (newGuest.status as any) || 'Pending',
      dietaryRequirements: newGuest.dietaryRequirements?.trim() || '',
      rsvpToken: token,
      invitationViews: 0,
      checkedIn: false,
      notes: newGuest.notes?.trim() || '',
      notificationStatus: 'pending'
    };

    onAddGuest(guestToAdd);
    setShowAddModal(false);

    setNewGuest({
      name: '',
      email: '',
      phone: '',
      group: 'Friends',
      tableNumber: 'Mesa 1',
      maxPlusOnes: 1,
      status: 'Pending',
      dietaryRequirements: '',
      notes: ''
    });

    showToast(`Convidado "${guestToAdd.name}" adicionado. Disparo WhatsApp assíncrono iniciado.`, 'success');
  };

  const handleManualDispatchWhatsApp = async (guest: Guest) => {
    setIsSendingWhatsApp(guest.id);
    try {
      const res = await dispatchRsvpWhatsApp(guest, config);
      if (res.success) {
        onUpdateGuest({
          ...guest,
          notificationStatus: 'sent',
          lastNotificationAt: new Date().toISOString()
        });
        showToast(`Notificação disparada com sucesso para ${guest.name}!`, 'success');
        if (res.messageUrl) {
          window.open(res.messageUrl, '_blank');
        }
      } else {
        onUpdateGuest({
          ...guest,
          notificationStatus: 'failed'
        });
        showToast(`Erro no envio: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Falha: ${err.message}`, 'error');
    } finally {
      setIsSendingWhatsApp(null);
    }
  };

  return (
    <div className="space-y-6 relative" id="guest-management-section">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div 
          role="status" 
          aria-live="polite" 
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border flex items-center gap-2 text-xs font-bold transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : toastMessage.type === 'info'
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-slate-950 text-white border-emerald-500/50'
          }`}
        >
          {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* CARD: LINK DA PORTARIA & WHATSAPP DISPATCH SUMMARY */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-rose-400 bg-rose-950 border border-rose-900/60 px-2.5 py-0.5 rounded-md inline-block">
              Portaria & Mensageria WhatsApp
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-md font-semibold font-mono">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Webhook Ativo
            </span>
          </div>
          <h3 className="font-display font-bold text-white text-sm">Controle de Portaria & Disparo de RSVP</h3>
          <p className="text-xs text-slate-400 max-w-xl">
            Cada novo convidado recebe seu token individual via WhatsApp automaticamente. Use o link da portaria para os recepcionistas validarem o passe com QR Code.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={() => {
              const url = `${window.location.origin}/?portaria=${clientId}`;
              navigator.clipboard.writeText(url);
              showToast('Link da Portaria copiado para a área de transferência!');
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <QrCode className="w-3.5 h-3.5" />
            Copiar Link da Portaria
          </button>
        </div>
      </div>

      {/* SOLICITAÇÕES DE PRESENÇA PENDENTES DE APROVAÇÃO DOS NOIVOS */}
      {pendingRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-900/70 text-white p-5 rounded-2xl border-2 border-amber-500/50 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
              <h3 className="font-bold text-sm text-amber-200 uppercase tracking-wide flex items-center gap-2">
                <span>📬 Solicitações de Presença Aguardando Aprovação</span>
                <span className="bg-amber-500 text-stone-950 text-xs px-2 py-0.5 rounded-full font-mono font-extrabold">
                  {pendingRequests.length}
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-amber-200/80 font-light">
              O Passe VIP Mobile em PDF e o QR Code oficial só são gerados após a sua aprovação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingRequests.map(req => (
              <div 
                key={req.id} 
                className="bg-black/40 border border-amber-500/30 p-3.5 rounded-xl space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-white text-xs block leading-tight">{req.name}</strong>
                    <span className="text-[9px] bg-amber-900/60 text-amber-300 border border-amber-700/60 px-1.5 py-0.5 rounded font-mono shrink-0">
                      Novo Pedido
                    </span>
                  </div>

                  {req.companionName && (
                    <div className="text-[11px] text-amber-300/90 font-serif italic">
                      + Acompanhante: {req.companionName}
                    </div>
                  )}

                  <div className="text-[10px] text-stone-400 font-mono">
                    📱 {req.phone || 'Sem telefone'} {req.dietaryRequirements ? `· Restrição: ${req.dietaryRequirements}` : ''}
                  </div>

                  {req.notes && (
                    <p className="text-[11px] text-stone-300 italic bg-white/5 p-1.5 rounded-lg border border-white/5 line-clamp-2">
                      "{req.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleApproveGuestRequest(req, false)}
                    className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Aprovar</span>
                  </button>

                  <button
                    onClick={() => handleApproveGuestRequest(req, true)}
                    className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                    title="Aprova e dispara mensagem com passe no WhatsApp"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>Aprovar & Zap</span>
                  </button>

                  <button
                    onClick={() => handleDeclineGuestRequest(req)}
                    className="p-1.5 bg-stone-800 hover:bg-rose-900 text-stone-400 hover:text-white rounded-lg text-[10px] transition-all cursor-pointer"
                    title="Recusar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Pesquise por nome, telefone ou mesa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-rose-800"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Convidado
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros:</span>
            </div>
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-200"
            >
              <option value="All">Todos os Grupos</option>
              {groups.map(g => (
                <option key={g} value={g}>{getPortugueseGroupLabel(g)}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-200"
            >
              <option value="All">Todos os RSVPs</option>
              {pendingRequests.length > 0 && (
                <option value="Awaiting_Approval">⏳ Aguardando Aprovação ({pendingRequests.length})</option>
              )}
              <option value="Confirmed">Confirmados</option>
              <option value="Pending">Pendentes</option>
              <option value="Declined">Recusados</option>
            </select>
          </div>
          <div className="text-[11px] text-slate-400 font-semibold uppercase">
            Exibindo {filteredGuests.length} de {guests.length} convidados
          </div>
        </div>
      </div>

      {/* Bulk actions banner */}
      {selectedGuests.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400" />
            <span><strong className="text-rose-400">{selectedGuests.length}</strong> convidados selecionados</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onBulkStatusUpdate(selectedGuests, 'Confirmed');
                setSelectedGuests([]);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
            >
              Confirmar Presença
            </button>
            <button
              onClick={() => {
                onBulkStatusUpdate(selectedGuests, 'Declined');
                setSelectedGuests([]);
              }}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
            >
              Recusar
            </button>
            <button
              onClick={() => {
                if (confirm(`Remover definitivamente ${selectedGuests.length} convidado(s) selecionado(s)?`)) {
                  selectedGuests.forEach(id => onDeleteGuest(id));
                  setSelectedGuests([]);
                }
              }}
              className="bg-rose-900 hover:bg-rose-800 text-white px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
            >
              Remover
            </button>
          </div>
        </div>
      )}

      {/* Guests Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-4 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredGuests.length > 0 && selectedGuests.length === filteredGuests.length}
                    onChange={e => handleSelectAll(e.target.checked)}
                    className="rounded text-rose-800"
                  />
                </th>
                <th className="py-4 px-4">Convidado</th>
                <th className="py-4 px-4">Grupo / Mesa</th>
                <th className="py-4 px-4">Status RSVP</th>
                <th className="py-4 px-4">Disparo WhatsApp</th>
                <th className="py-4 px-4">Portaria</th>
                <th className="py-4 px-4 text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    Nenhum convidado cadastrado na lista. Clique em "Adicionar Convidado" para começar.
                  </td>
                </tr>
              ) : (
                filteredGuests.map(guest => (
                  <tr key={guest.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedGuests.includes(guest.id)}
                        onChange={e => handleSelectOne(guest.id, e.target.checked)}
                        className="rounded text-rose-800"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{guest.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {guest.phone || guest.email || 'Sem contato'}
                        </div>
                        {guest.dietaryRequirements && (
                          <span className="text-[9px] text-rose-800 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded inline-block mt-1">
                            Restrição: {guest.dietaryRequirements}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                      <div>{getPortugueseGroupLabel(guest.group)}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{guest.tableNumber}</div>
                    </td>
                    <td className="py-4 px-4">
                      {guest.status === 'Awaiting_Approval' ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            ⏳ Aguarda Aprovação
                          </span>
                          <button
                            onClick={() => handleApproveGuestRequest(guest, true)}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold cursor-pointer"
                          >
                            ✓ Aprovar & Zap
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          guest.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' :
                          guest.status === 'Declined' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                          'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}>
                          {guest.status === 'Confirmed' ? 'Confirmado' : guest.status === 'Declined' ? 'Recusado' : 'Pendente'}
                          {guest.status === 'Confirmed' && guest.plusOnesConfirmed > 0 && ` (+${guest.plusOnesConfirmed})`}
                        </span>
                      )}
                    </td>
                    {/* WhatsApp Status Column */}
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleManualDispatchWhatsApp(guest)}
                        disabled={isSendingWhatsApp === guest.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          guest.notificationStatus === 'sent'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : guest.notificationStatus === 'failed'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50'
                        }`}
                        title="Disparar token de RSVP via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isSendingWhatsApp === guest.id ? 'Enviando...' : guest.notificationStatus === 'sent' ? 'Enviado ✓' : 'Disparar WhatsApp'}</span>
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      {guest.checkedIn ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px]">
                          <CheckCircle className="w-3 h-3" /> Check-in Ok
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setShowQrModal(guest)}
                          title="Ver QR Code & Link"
                          className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setGuestToDeleteId(guest.id)}
                          title="Remover"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD GUEST */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-rose-800" />
                  Adicionar Convidado
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitNewGuest} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Mota"
                    value={newGuest.name}
                    onChange={e => setNewGuest(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-rose-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">WhatsApp / Telefone</label>
                    <input
                      type="tel"
                      placeholder="+244 923 000 000"
                      value={newGuest.phone}
                      onChange={e => setNewGuest(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-rose-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="nome@email.ao"
                      value={newGuest.email}
                      onChange={e => setNewGuest(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-rose-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Grupo</label>
                    <select
                      value={newGuest.group}
                      onChange={e => setNewGuest(prev => ({ ...prev, group: e.target.value as any }))}
                      className="w-full px-2 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                    >
                      {groups.map(g => (
                        <option key={g} value={g}>{getPortugueseGroupLabel(g)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Mesa</label>
                    <input
                      type="text"
                      placeholder="Mesa 1"
                      value={newGuest.tableNumber}
                      onChange={e => setNewGuest(prev => ({ ...prev, tableNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Acompanhantes</label>
                    <input
                      type="number"
                      min="0"
                      value={newGuest.maxPlusOnes}
                      onChange={e => setNewGuest(prev => ({ ...prev, maxPlusOnes: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {Number(newGuest.maxPlusOnes) > 0 && (
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Nome do Acompanhante (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Maria Mota"
                      value={newGuest.companionName || ''}
                      onChange={e => setNewGuest(prev => ({ ...prev, companionName: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-rose-800"
                    />
                  </div>
                )}

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300">
                  ⚡ O token RSVP será gerado e o envio pelo WhatsApp ocorrerá de forma <strong>assíncrona</strong> sem travar a interface.
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl font-bold cursor-pointer shadow-md"
                  >
                    Salvar & Disparar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: QR PASSE */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-sm text-center space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Passe Digital do Convidado</span>
                <button onClick={() => setShowQrModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="w-40 h-40 bg-white p-2 border border-slate-200 rounded-xl mx-auto flex items-center justify-center">
                <img
                  src={modalQrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=rsvp:${showQrModal.rsvpToken}`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">{showQrModal.name}</h4>
                <p className="text-xs text-rose-800 dark:text-rose-400 font-mono">Token: {showQrModal.rsvpToken}</p>
                <p className="text-[11px] text-slate-500 font-mono">Mesa: {showQrModal.tableNumber} · Vagas: 1 + {showQrModal.maxPlusOnes}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => sendInviteViaWhatsApp(config, showQrModal)}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => downloadWeddingPdf(config, showQrModal)}
                  className="flex-1 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title="Baixar passe em formato mobile vertical"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Baixar Passe Mobile (PDF)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION DELETE */}
      <AnimatePresence>
        {guestToDeleteId && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm text-center space-y-4 border border-slate-200 dark:border-slate-800">
              <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
              <h4 className="font-bold text-slate-900 dark:text-white text-base">Remover Convidado</h4>
              <p className="text-xs text-slate-500">Tem certeza que deseja excluir este convidado da lista?</p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setGuestToDeleteId(null)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onDeleteGuest(guestToDeleteId);
                    setGuestToDeleteId(null);
                  }}
                  className="flex-1 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
