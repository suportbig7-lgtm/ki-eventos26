import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Check, X, Shield, Smartphone, 
  CreditCard, MessageCircle, Copy, CheckCircle2,
  Users, QrCode, Image as ImageIcon, Heart
} from 'lucide-react';
import { WeddingConfig } from '../types';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WeddingConfig;
  currentPlan?: string;
  onSelectPlan?: (planName: string) => void;
}

export const ANGOLAN_PLANS = [
  {
    id: 'free',
    name: 'Plano Grátis',
    price: '0 Kz',
    amountKz: 0,
    period: 'vitalício',
    guestLimit: 25,
    tag: 'Avaliação',
    desc: 'Ideal para casamento no civil ou teste inicial.',
    features: [
      'Até 25 convidados cadastrados',
      'Convite online padrão',
      'Confirmação de presença básica',
      'Suporte via comunidade'
    ],
    highlight: false,
    cta: 'Plano Atual'
  },
  {
    id: 'basic',
    name: 'Plano Ouro / Essencial',
    price: '35.000 Kz',
    amountKz: 35000,
    period: 'pagamento único',
    guestLimit: 150,
    tag: 'Mais Popular em Angola',
    desc: 'Perfeito para recepções familiares e elegantes.',
    features: [
      'Até 150 convidados cadastrados',
      'Passes VIP Mobile em PDF para telemóvel',
      'Lista de Presentes com Multicaixa Express & IBAN',
      'Mural de Recados exclusivo para quem presentear',
      'Aprovação de presença pelos noivos',
      'Suporte prioritário por e-mail'
    ],
    highlight: false,
    cta: 'Aderir ao Plano Ouro'
  },
  {
    id: 'premium',
    name: 'Plano Diamante / Luxo',
    price: '65.000 Kz',
    amountKz: 65000,
    period: 'pagamento único',
    guestLimit: 'Ilimitado',
    tag: 'Recomendado ★',
    desc: 'A experiência digital completa para o seu grande dia.',
    features: [
      'Convidados Ilimitados',
      'Passes VIP Mobile em PDF de alta resolução',
      'Álbum Coletivo Colaborativo (fotos dos convidados)',
      'Check-in de Portaria com Leitor de QR Code',
      'Disparo automático de links via WhatsApp',
      'Mural de votos interativo permanente',
      'Suporte direto via WhatsApp'
    ],
    highlight: true,
    cta: 'Aderir ao Plano Diamante'
  },
  {
    id: 'luxury',
    name: 'Plano Luanda VIP',
    price: '110.000 Kz',
    amountKz: 110000,
    period: 'pagamento único',
    guestLimit: 'Ilimitado',
    tag: 'Experiência Suprema',
    desc: 'Para casamentos monumentais e celebrações completas.',
    features: [
      'Multi-Eventos (Alambamento, Civil, Igreja e Festa)',
      'Múltiplos recepcionistas sincronizados na portaria',
      'Domínio personalizado ou link exclusivo nobre',
      'Álbum coletivo em 4K sem limites',
      'Assessoria VIP dedicada da equipe Kutxi',
      'Atendimento 24/7 exclusivo para os noivos'
    ],
    highlight: false,
    cta: 'Aderir ao Luanda VIP'
  }
];

export default function UpgradePlanModal({
  isOpen,
  onClose,
  config,
  currentPlan = 'Plano Grátis',
  onSelectPlan
}: UpgradePlanModalProps) {
  const [selectedTier, setSelectedTier] = useState<typeof ANGOLAN_PLANS[0] | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleWhatsAppPaymentProof = (tier: typeof ANGOLAN_PLANS[0]) => {
    const groom = config.brideGroom?.groomName || 'Noivo';
    const bride = config.brideGroom?.brideName || 'Noiva';
    const msg = `Olá Kutxi! Gostaria de ativar a adesão ao *${tier.name}* (${tier.price}) para o casamento de *${groom} & ${bride}*.\n\nEnvio em anexo o comprovativo de transferência para validação e liberação dos recursos. Obrigado!`;
    window.open(`https://api.whatsapp.com/send?phone=+244923456789&text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 font-sans"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full overflow-hidden text-slate-800 dark:text-slate-100 relative my-6"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 text-white p-6 sm:p-7 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Preços Justos no Mercado Angolano (Kwanzas - AOA)
            </span>
          </div>

          <h2 className="text-xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Adesão aos Planos Kutxi Casamentos
          </h2>
          <p className="text-xs sm:text-sm text-rose-200/80 mt-1 max-w-2xl leading-relaxed">
            Desbloqueie convidados ilimitados, passes em PDF no telemóvel para WhatsApp, álbum coletivo colaborativo e scanner de portaria digital.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Plan Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ANGOLAN_PLANS.map(tier => {
              const isSelected = selectedTier?.id === tier.id;
              const isCurrent = currentPlan.toLowerCase().includes(tier.id);

              return (
                <div
                  key={tier.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all relative ${
                    tier.highlight 
                      ? 'border-rose-400 dark:border-rose-600 bg-rose-50/20 dark:bg-rose-950/20 ring-2 ring-rose-500/20 shadow-md' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                  } ${isSelected ? 'ring-2 ring-amber-500 border-amber-500' : ''}`}
                >
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400 block">
                        {tier.tag}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                        {tier.name}
                      </h3>
                      <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {tier.price}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {tier.period}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {tier.desc}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px]">
                      <div className="font-bold text-slate-700 dark:text-slate-300">
                        Capacidade: {tier.guestLimit} convidados
                      </div>
                      <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
                        {tier.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-1.5 leading-tight">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-5 pt-3">
                    {tier.amountKz === 0 ? (
                      <div className="w-full py-2 rounded-xl text-center text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Gratuito
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                          isSelected
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : tier.highlight
                              ? 'bg-rose-900 hover:bg-rose-950 text-white'
                              : 'bg-slate-900 hover:bg-black text-white dark:bg-slate-800 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isSelected ? '✓ Selecionado' : 'Aderir a este Plano'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Instructions if a paid plan is selected */}
          {selectedTier && selectedTier.amountKz > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800/80 dark:to-amber-950/30 rounded-3xl border-2 border-amber-300 dark:border-amber-700 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 dark:border-amber-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 block">
                    Instruções de Pagamento em Angola
                  </span>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedTier.name} — Total: {selectedTier.price}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleWhatsAppPaymentProof(selectedTier)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar Comprovativo pelo WhatsApp</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Multicaixa Express */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 font-bold">
                    <Smartphone className="w-4 h-4" />
                    <span>Opção 1: Multicaixa Express (MCX)</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Envie o valor de <strong>{selectedTier.price}</strong> para o número oficial da Kutxi:
                  </p>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl font-mono text-xs font-bold">
                    <span>+244 923 456 789</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('923456789', 'mcx')}
                      className="text-slate-400 hover:text-rose-700 p-1"
                    >
                      {copiedField === 'mcx' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 block">Destinatário: Kutxi Casamentos & Tecnologia Lda</span>
                </div>

                {/* Transferência Bancária */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 font-bold">
                    <CreditCard className="w-4 h-4" />
                    <span>Opção 2: Transferência Bancária (BAI / BFA)</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Transfira para as contas empresariais em Kwanzas:
                  </p>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <span><strong>BAI:</strong> AO06.0040.0000.1234.5678.9012.3</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('AO06.0040.0000.1234.5678.9012.3', 'bai')}
                        className="text-slate-400 hover:text-rose-700 p-1"
                      >
                        {copiedField === 'bai' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <span><strong>BFA:</strong> AO06.0006.0000.9876.5432.1098.7</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('AO06.0006.0000.9876.5432.1098.7', 'bfa')}
                        className="text-slate-400 hover:text-rose-700 p-1"
                      >
                        {copiedField === 'bfa' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 block">Titular: Kutxi Casamentos & Tecnologia Lda</span>
                </div>
              </div>

              <div className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Após o envio do comprovativo, a equipe Kutxi ou o Super Administrador ativará a licença com todos os acessos imediatamente.
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
