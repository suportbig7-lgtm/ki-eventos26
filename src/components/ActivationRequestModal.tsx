import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, ShieldCheck, Sparkles, CreditCard, 
  Smartphone, Building2, Copy, CheckCircle2, ArrowRight,
  Upload, AlertCircle, Heart, Star
} from 'lucide-react';
import { ClientWeddingSaaS, ActivationRequest } from '../types';
import { dbService } from '../services/dbService';

interface ActivationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientWeddingSaaS;
  onRequestSubmitted: (request: ActivationRequest) => void;
}

export default function ActivationRequestModal({
  isOpen,
  onClose,
  client,
  onRequestSubmitted
}: ActivationRequestModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'Basic' | 'Premium' | 'Luxury'>('Premium');
  const [paymentMethod, setPaymentMethod] = useState<'mcx' | 'iban' | 'cash'>('mcx');
  const [paymentRef, setPaymentRef] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const planPrices = {
    Basic: { name: 'Plano Essencial', price: 35000, label: '35.000 Kz' },
    Premium: { name: 'Plano Premium (Recomendado)', price: 65000, label: '65.000 Kz' },
    Luxury: { name: 'Plano Luxo VIP', price: 110000, label: '110.000 Kz' }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!paymentRef.trim() && paymentMethod !== 'cash') {
      alert('Por favor, insira a referência ou código da operação do pagamento.');
      return;
    }

    setIsSubmitting(true);
    const newReq: ActivationRequest = {
      id: 'act_' + Date.now(),
      clientId: client.id,
      clientName: client.clientName,
      clientEmail: client.clientEmail,
      clientPhone: phone.trim() || undefined,
      requestedPlan: selectedPlan,
      amount: planPrices[selectedPlan].price,
      paymentMethod,
      paymentReference: paymentRef.trim() || 'A combinar',
      notes: notes.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await dbService.activation.submit(newReq);
      onRequestSubmitted(newReq);
      setSubmittedSuccess(true);
    } catch (err) {
      console.warn('Error submitting activation request:', err);
      onRequestSubmitted(newReq);
      setSubmittedSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 overflow-y-auto flex items-center justify-center p-4 font-sans"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        className="bg-white dark:bg-stone-900 rounded-3xl max-w-xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden relative"
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#8E2840] to-[#5C1B2B] p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
              Ativação de Pacote Oficial
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold">
            Solicitar Ativação de Pacote
          </h2>
          <p className="text-xs text-rose-100/90 mt-1">
            {client.clientName} · Libere recursos premium, convidados ilimitados e automação WhatsApp.
          </p>
        </div>

        {submittedSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-700">
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </div>
            <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white">
              Solicitação Enviada com Sucesso!
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 max-w-md mx-auto leading-relaxed">
              Recebemos os seus dados e o comprovativo de pagamento do <strong>{planPrices[selectedPlan].name}</strong>. A equipe Ki-Eventos foi notificada e ativará o seu casamento imediatamente no painel de controle.
            </p>
            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Concluir & Voltar ao Painel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
            {/* 1. SELEÇÃO DO PACOTE */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 block">
                1. Escolha o Pacote Desejado:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Essencial */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('Basic')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    selectedPlan === 'Basic'
                      ? 'border-[#8E2840] bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-[#8E2840]/30'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold text-stone-900 dark:text-white text-xs">Essencial</div>
                  <div className="text-base font-bold text-[#8E2840] dark:text-rose-400 mt-1 font-mono">35.000 Kz</div>
                  <div className="text-[10px] text-stone-500 mt-1">Até 150 convidados · PDF</div>
                </button>

                {/* Premium */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('Premium')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    selectedPlan === 'Premium'
                      ? 'border-[#8E2840] bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-[#8E2840]/30'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 hover:border-stone-300'
                  }`}
                >
                  <span className="absolute -top-2 right-2 bg-amber-500 text-stone-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                    Mais Popular
                  </span>
                  <div className="font-bold text-stone-900 dark:text-white text-xs">Premium</div>
                  <div className="text-base font-bold text-[#8E2840] dark:text-rose-400 mt-1 font-mono">65.000 Kz</div>
                  <div className="text-[10px] text-stone-500 mt-1">Ilimitado · WhatsApp · Álbum</div>
                </button>

                {/* Luxo VIP */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('Luxury')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    selectedPlan === 'Luxury'
                      ? 'border-[#8E2840] bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-[#8E2840]/30'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold text-stone-900 dark:text-white text-xs">Luxo VIP</div>
                  <div className="text-base font-bold text-[#8E2840] dark:text-rose-400 mt-1 font-mono">110.000 Kz</div>
                  <div className="text-[10px] text-stone-500 mt-1">Portaria QR · VIP Completo</div>
                </button>
              </div>
            </div>

            {/* 2. COORDENADAS BANCÁRIAS ANGOLANAS */}
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Dados Oficiais para Pagamento (Angola)
                </span>
                <span className="text-[10px] font-mono font-bold text-stone-700 dark:text-stone-300">
                  Total: {planPrices[selectedPlan].label}
                </span>
              </div>

              {/* MCX */}
              <div className="flex items-center justify-between bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-[10px] text-stone-500 font-medium">Multicaixa Express (MCX)</div>
                    <div className="font-mono font-bold text-stone-900 dark:text-white text-xs">923 456 789</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('923456789', 'mcx')}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedField === 'mcx' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              {/* IBAN */}
              <div className="flex items-center justify-between bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-[10px] text-stone-500 font-medium">IBAN BAI / BFA (Ki-Eventos Lda)</div>
                    <div className="font-mono font-bold text-stone-900 dark:text-white text-[11px]">AO06 0040 0000 1234 5678 9012 3</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('AO06004000001234567890123', 'iban')}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedField === 'iban' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* 3. DADOS DO PAGAMENTO EFETUADO */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 block">
                2. Informações do Comprovativo:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1 block">
                    Método Utilizado *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white text-xs font-medium"
                  >
                    <option value="mcx">Multicaixa Express (MCX)</option>
                    <option value="iban">Transferência Bancária (IBAN)</option>
                    <option value="cash">Depósito / Pagamento Direto</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1 block">
                    Nº da Operação / Referência *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MCX-948271 ou 049827"
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1 block">
                  Telefone / WhatsApp de Contato dos Noivos
                </label>
                <input
                  type="tel"
                  placeholder="Ex: +244 923 000 000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1 block">
                  Observações ou Detalhes Adicionais
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pagamento efetuado da conta do noivo Carlos"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white text-xs"
                />
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Enviando solicitação...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Enviar Solicitação de Ativação</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
