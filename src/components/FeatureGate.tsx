import React from 'react';
import { motion } from 'motion/react';
import { 
  Lock, Sparkles, ShieldAlert, ArrowUpRight, CheckCircle2, 
  Crown, Smartphone, Users, QrCode, Image as ImageIcon, MessageCircle
} from 'lucide-react';
import { ClientWeddingSaaS } from '../types';
import { usePlanPermissions, PlanFeatureKey } from '../hooks/usePlanPermissions';

interface FeatureGateProps {
  client?: ClientWeddingSaaS;
  feature: PlanFeatureKey;
  currentGuestCount?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgradeRequested?: (requiredPlan?: string) => void;
  title?: string;
  description?: string;
}

const FEATURE_METADATA: Record<PlanFeatureKey, {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultDescription: string;
  benefits: string[];
}> = {
  gatekeeper_portal: {
    name: 'Portaria & Concierge Inteligente',
    icon: QrCode,
    defaultDescription: 'Controle de acesso rigoroso à festa com leitura de bilhetes QR Code em tempo real por câmera dos smartphones dos recepcionistas.',
    benefits: [
      'Leitura ultra-rápida de convites QR Code pela câmera',
      'Múltiplos recepcionistas autenticados em tempo real',
      'Bloqueio anti-fraude contra uso duplo de convites',
      'Painel de lotação e presença sincronizado com os noivos'
    ]
  },
  collective_album: {
    name: 'Álbum Coletivo de Fotos dos Convidados',
    icon: ImageIcon,
    defaultDescription: 'Permita que todos os convidados confirmados publiquem fotos de alta resolução tiradas durante a cerimônia e festa diretamente no álbum do casal.',
    benefits: [
      'Upload instantâneo pelos convidados via smartphone',
      'Reações com emojis e comentários com amor',
      'Download em alta resolução das memórias mais marcantes',
      'Moderação e controle total de imagens pelos noivos'
    ]
  },
  whatsapp_automation: {
    name: 'Disparos Automáticos WhatsApp',
    icon: MessageCircle,
    defaultDescription: 'Envio em massa e personalizado de links de convite e lembretes de confirmação de presença diretamente aos convidados.',
    benefits: [
      'Disparos com nomes e links individualizados',
      'Lembrete automático para quem ainda não respondeu RSVP',
      'Confirmação instantânea de recepção',
      'Economia de horas de contato manual da assessoria'
    ]
  },
  music_playlist: {
    name: 'Trilha Sonora & Playlist Spotify',
    icon: Sparkles,
    defaultDescription: 'Toque a música tema do casal e incorpore a playlist oficial que tocará na festa de casamento.',
    benefits: [
      'Player de áudio elegante no convite interativo',
      'Integração direta com o Spotify',
      'Sugestões de músicas enviadas pelos convidados'
    ]
  },
  unlimited_guests: {
    name: 'Lista de Convidados Ilimitada',
    icon: Users,
    defaultDescription: 'Cadastre quantos convidados desejar, sem limite numérico.',
    benefits: [
      'Sem teto máximo de convidados cadastrados',
      'Importação em massa via planilha CSV',
      'Agrupamento por famílias, mesas e side da noiva/noivo'
    ]
  },
  gift_registry: {
    name: 'Lista de Presentes com Multicaixa Express',
    icon: Crown,
    defaultDescription: 'Receba transferências bancárias IBAN e Multicaixa Express diretamente na sua conta.',
    benefits: [
      'Chaves Multicaixa Express (MCX) e IBAN BAI/BFA',
      'Mural de recados exclusivo para quem presentear',
      'Sem retenção ou comissão sobre os valores presenteados'
    ]
  },
  pdf_passes: {
    name: 'Passes VIP Mobile em PDF',
    icon: Smartphone,
    defaultDescription: 'Gere passes digitais em PDF formato A5 com QR Code para os convidados guardarem na carteira do telemóvel.',
    benefits: [
      'Passes individuais com nome e acompanhantes autorizados',
      'QR Code exclusivo de validação rápida',
      'Design luxuoso para impressão ou envio por WhatsApp'
    ]
  },
  custom_domain: {
    name: 'Domínio Personalizado do Casal',
    icon: Crown,
    defaultDescription: 'Utilize um endereço exclusivo para o seu casamento (ex: noivos.ao).',
    benefits: [
      'Endereço web personalizado e memorável',
      'Certificado de segurança SSL incluído',
      'Redirecionamento automático'
    ]
  }
};

export default function FeatureGate({
  client,
  feature,
  currentGuestCount,
  children,
  fallback,
  onUpgradeRequested,
  title,
  description
}: FeatureGateProps) {
  const permissions = usePlanPermissions(client, currentGuestCount);
  const access = permissions.checkAccess(feature);

  // If user has access, render children normally
  if (access.allowed) {
    return <>{children}</>;
  }

  // If custom fallback is passed, render that
  if (fallback) {
    return <>{fallback}</>;
  }

  const meta = FEATURE_METADATA[feature] || {
    name: 'Recurso Premium',
    icon: Crown,
    defaultDescription: 'Este recurso requer um plano superior para ser utilizado.',
    benefits: ['Recursos exclusivos de casamento', 'Maior capacidade e suporte']
  };

  const Icon = meta.icon;
  const currentPlan = permissions.isTrial ? 'Grátis (Degustação)' : permissions.currentPlan;
  const requiredPlan = access.requiredPlan || 'Premium';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 sm:p-10 bg-white dark:bg-stone-900 rounded-3xl border border-amber-200/80 dark:border-amber-900/40 shadow-xl relative overflow-hidden"
    >
      {/* Background Decorative Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-400/10 via-rose-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="max-w-2xl mx-auto text-center space-y-6 relative z-10">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Lock className="w-3 h-3 text-amber-600" />
            Recurso Exclusivo
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Requer {requiredPlan === 'Luxury' ? 'Plano Luxo VIP' : `Plano ${requiredPlan}`}
          </span>
        </div>

        {/* Feature Icon Header */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-600/10 dark:from-amber-400/20 dark:to-rose-600/20 border border-amber-300/60 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto shadow-sm">
          <Icon className="w-8 h-8 stroke-[1.8]" />
        </div>

        {/* Feature Title and Explanation */}
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-white">
            {title || meta.name}
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-lg mx-auto">
            {description || access.reason || meta.defaultDescription}
          </p>
        </div>

        {/* Current Plan vs Required Plan Banner */}
        <div className="p-4 bg-stone-50 dark:bg-stone-850 rounded-2xl border border-stone-200/80 dark:border-stone-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">O Seu Plano Atual</span>
            <strong className="text-stone-800 dark:text-stone-200 font-semibold">{currentPlan}</strong>
          </div>
          <div className="hidden sm:block text-stone-300 dark:text-stone-700">→</div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block tracking-wider">Plano Necessário</span>
            <strong className="text-amber-700 dark:text-amber-300 font-bold">
              {requiredPlan === 'Luxury' ? 'Plano Luxo VIP (110.000 Kz)' : 'Plano Premium (65.000 Kz)'}
            </strong>
          </div>
        </div>

        {/* Benefits Checklist */}
        <div className="text-left bg-white/70 dark:bg-stone-800/70 p-4 sm:p-5 rounded-2xl border border-stone-200/70 dark:border-stone-800 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
            O que você desbloqueia:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600 dark:text-stone-300">
            {meta.benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (onUpgradeRequested) {
                onUpgradeRequested(requiredPlan);
              }
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-rose-700 hover:from-amber-700 hover:to-rose-800 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 group"
          >
            <Sparkles className="w-4 h-4 text-amber-200 group-hover:rotate-12 transition-transform" />
            <span>Solicitar Ativação do Pacote</span>
            <ArrowUpRight className="w-4 h-4 text-amber-200" />
          </button>

          <a
            href="https://wa.me/244923456789?text=Olá,%20gostaria%20de%20solicitar%20a%20ativação%20de%20recursos%20adicionais%20para%20o%20meu%20casamento."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Falar com Assessor VIP</span>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
