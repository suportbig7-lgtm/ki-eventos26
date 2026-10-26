import { useMemo } from 'react';
import { ClientWeddingSaaS, ClientFeatures } from '../types';

export type PlanFeatureKey =
  | 'gatekeeper_portal'    // Portaria & Concierge com scanner QR em tempo real
  | 'collective_album'     // Álbum coletivo de fotos interativas dos convidados
  | 'whatsapp_automation'  // Disparo automático e mensagens de confirmação WhatsApp
  | 'music_playlist'       // Trilha sonora interativa Spotify integrada
  | 'unlimited_guests'     // Capacidade de convidados além de 150
  | 'custom_domain'        // Domínio personalizado (.ao ou .com)
  | 'gift_registry'        // Lista de presentes com IBAN e Multicaixa Express
  | 'pdf_passes';          // Download do Passe VIP Mobile em PDF

export interface PlanAccessResult {
  allowed: boolean;
  reason?: string;
  requiredPlan?: 'Basic' | 'Premium' | 'Luxury' | 'Enterprise';
  upgradeMessage?: string;
}

export interface PlanPermissionsHookResult {
  client?: ClientWeddingSaaS;
  currentPlan: 'Basic' | 'Premium' | 'Luxury' | 'Enterprise';
  isTrial: boolean;
  isActive: boolean;
  isSuspended: boolean;
  isExpired: boolean;

  // Guest limits
  maxGuests: number;
  currentGuests: number;
  remainingGuests: number;
  isGuestLimitExceeded: boolean;
  canAddGuest: boolean;
  guestUsagePercentage: number;

  // Feature Flags
  canUseGatekeeperPortal: boolean;
  canUseCollectiveAlbum: boolean;
  canUseWhatsAppAutomation: boolean;
  canUseMusicPlaylist: boolean;
  canUseGiftRegistry: boolean;
  canExportPdfPasses: boolean;

  // Methods
  hasPermission: (feature: PlanFeatureKey) => boolean;
  checkAccess: (feature: PlanFeatureKey) => PlanAccessResult;
  assertCanAddGuests: (countToAdd?: number) => { allowed: boolean; message?: string };
}

/**
 * Returns default max guest limit based on plan name and trial status
 */
export function getDefaultMaxGuests(plan: string, status?: string): number {
  if (status === 'Trial') return 25;
  switch (plan) {
    case 'Luxury':
    case 'Enterprise':
      return 9999; // Ilimitado
    case 'Premium':
      return 9999; // Ilimitado no pacote Premium
    case 'Basic':
      return 150;
    default:
      return 25;
  }
}

/**
 * Hook to verify and enforce subscription permissions on ClientWeddingSaaS
 */
export function usePlanPermissions(
  client?: ClientWeddingSaaS,
  activeGuestCount?: number
): PlanPermissionsHookResult {
  return useMemo(() => {
    // Demo account always has full VIP permissions
    const isDemo = client?.id === 'client_1';
    const isComplimentary = Boolean(client?.isComplimentary);

    const plan: 'Basic' | 'Premium' | 'Luxury' | 'Enterprise' = client?.plan || 'Basic';
    const status = client?.status || 'Active';
    const isSuspended = status === 'Suspended' || Boolean(client?.accessRevoked);
    const isExpired = status === 'Expired';
    const isTrial = status === 'Trial' || (client?.revenue === 0 && plan === 'Basic' && !isDemo && !isComplimentary);
    const isActive = (status === 'Active' || isTrial) && !isSuspended && !isExpired;

    // Feature overrides from client.features if defined
    const features: ClientFeatures = client?.features || {};

    // 1. Max Guests calculation
    let maxGuests = 25;
    if (isDemo || isComplimentary) {
      maxGuests = 9999;
    } else if (typeof features.maxGuests === 'number' && features.maxGuests > 0) {
      maxGuests = features.maxGuests;
    } else {
      maxGuests = getDefaultMaxGuests(plan, isTrial ? 'Trial' : status);
    }

    const currentGuests = typeof activeGuestCount === 'number' 
      ? activeGuestCount 
      : (client?.guestCount || 0);

    const remainingGuests = Math.max(0, maxGuests - currentGuests);
    const isGuestLimitExceeded = currentGuests >= maxGuests;
    const canAddGuest = isActive && !isGuestLimitExceeded;
    const guestUsagePercentage = maxGuests >= 9999 ? 0 : Math.min(100, Math.round((currentGuests / maxGuests) * 100));

    // 2. Feature Permissions Calculation
    // Gatekeeper Portal (Portaria com QR Scanner): Exclusive to Luxury / VIP or if explicit feature flag
    const canUseGatekeeperPortal = Boolean(
      isActive && (
        isDemo ||
        isComplimentary ||
        features.allowGatekeeperPortal === true ||
        plan === 'Luxury' ||
        plan === 'Enterprise'
      )
    );

    // Collective Album (Álbum Coletivo dos Convidados): Premium and Luxury
    const canUseCollectiveAlbum = Boolean(
      isActive && (
        isDemo ||
        isComplimentary ||
        features.allowCollectiveAlbum === true ||
        plan === 'Premium' ||
        plan === 'Luxury' ||
        plan === 'Enterprise'
      )
    );

    // WhatsApp Automation: Premium and Luxury
    const canUseWhatsAppAutomation = Boolean(
      isActive && (
        isDemo ||
        isComplimentary ||
        features.allowWhatsAppAutomation === true ||
        plan === 'Premium' ||
        plan === 'Luxury' ||
        plan === 'Enterprise'
      )
    );

    // Spotify playlist integration
    const canUseMusicPlaylist = Boolean(
      isActive && (
        isDemo ||
        isComplimentary ||
        plan === 'Premium' ||
        plan === 'Luxury' ||
        plan === 'Enterprise'
      )
    );

    // Gift Registry with MCX & IBAN: Basic, Premium, Luxury (all paid plans)
    const canUseGiftRegistry = Boolean(
      isActive && (
        isDemo ||
        isComplimentary ||
        features.allowGiftRegistry !== false
      )
    );

    // PDF Passes
    const canExportPdfPasses = Boolean(
      isActive && (
        isDemo ||
        isComplimentary ||
        !isTrial ||
        plan !== 'Basic'
      )
    );

    // Permission checker method
    const hasPermission = (feature: PlanFeatureKey): boolean => {
      if (!isActive) return false;
      switch (feature) {
        case 'gatekeeper_portal':
          return canUseGatekeeperPortal;
        case 'collective_album':
          return canUseCollectiveAlbum;
        case 'whatsapp_automation':
          return canUseWhatsAppAutomation;
        case 'music_playlist':
          return canUseMusicPlaylist;
        case 'unlimited_guests':
          return maxGuests > 150;
        case 'gift_registry':
          return canUseGiftRegistry;
        case 'pdf_passes':
          return canExportPdfPasses;
        case 'custom_domain':
          return Boolean(features.allowCustomDomain || plan === 'Luxury');
        default:
          return true;
      }
    };

    const checkAccess = (feature: PlanFeatureKey): PlanAccessResult => {
      if (isSuspended) {
        return {
          allowed: false,
          reason: 'Acesso suspenso ou revogado pela administração.',
          upgradeMessage: 'Sua conta de casamento está suspensa. Entre em contato com a equipa Ki-Eventos para reativação imediata.'
        };
      }

      if (isExpired) {
        return {
          allowed: false,
          reason: 'O período da sua licença expirou.',
          requiredPlan: plan,
          upgradeMessage: 'Renove a sua licença para continuar a usar todos os recursos do seu casamento.'
        };
      }

      switch (feature) {
        case 'gatekeeper_portal':
          if (!canUseGatekeeperPortal) {
            return {
              allowed: false,
              reason: 'A Portaria Inteligente com leitor QR Code e câmera em tempo real é exclusiva do Plano Luxo VIP.',
              requiredPlan: 'Luxury',
              upgradeMessage: 'Atualize para o Plano Luxo VIP (110.000 Kz) para liberar porteiros ilimitados, check-in com câmera ao vivo e relatórios de entrada em tempo real.'
            };
          }
          break;

        case 'collective_album':
          if (!canUseCollectiveAlbum) {
            return {
              allowed: false,
              reason: 'O Álbum Coletivo com upload direto de fotos e reações dos convidados requer o Plano Premium ou Luxo.',
              requiredPlan: 'Premium',
              upgradeMessage: 'Atualize para o Plano Premium (65.000 Kz) para que todos os convidados possam partilhar fotos em alta resolução da cerimônia e recepção.'
            };
          }
          break;

        case 'whatsapp_automation':
          if (!canUseWhatsAppAutomation) {
            return {
              allowed: false,
              reason: 'O envio automático de lembretes e confirmações por WhatsApp requer o Plano Premium ou Luxo.',
              requiredPlan: 'Premium',
              upgradeMessage: 'Atualize para o Plano Premium para automatizar disparos de RSVP e lembretes com link personalizado diretamente no WhatsApp dos convidados.'
            };
          }
          break;

        case 'music_playlist':
          if (!canUseMusicPlaylist) {
            return {
              allowed: false,
              reason: 'A incorporação da trilha sonora e playlist do casal está disponível a partir do Plano Premium.',
              requiredPlan: 'Premium',
              upgradeMessage: 'Adicione trilhas sonoras do Spotify e músicas que marcaram a vossa história aderindo ao Plano Premium.'
            };
          }
          break;

        case 'unlimited_guests':
          if (maxGuests <= 150) {
            return {
              allowed: false,
              reason: `O seu plano atual (${plan}) possui limite de ${maxGuests} convidados.`,
              requiredPlan: 'Premium',
              upgradeMessage: 'Precisa de mais convidados? Atualize para o Plano Premium ou Luxo VIP e convide sem restrições.'
            };
          }
          break;

        default:
          break;
      }

      return { allowed: true };
    };

    const assertCanAddGuests = (countToAdd = 1) => {
      if (maxGuests >= 9999) return { allowed: true };
      if (currentGuests + countToAdd > maxGuests) {
        return {
          allowed: false,
          message: `Limite de convidados atingido (${currentGuests}/${maxGuests}). O seu plano ${isTrial ? 'Grátis (Degustação)' : plan} permite até ${maxGuests} convidados. Atualize para o Plano Premium para convidados ilimitados.`
        };
      }
      return { allowed: true };
    };

    return {
      client,
      currentPlan: plan,
      isTrial,
      isActive,
      isSuspended,
      isExpired,
      maxGuests,
      currentGuests,
      remainingGuests,
      isGuestLimitExceeded,
      canAddGuest,
      guestUsagePercentage,
      canUseGatekeeperPortal,
      canUseCollectiveAlbum,
      canUseWhatsAppAutomation,
      canUseMusicPlaylist,
      canUseGiftRegistry,
      canExportPdfPasses,
      hasPermission,
      checkAccess,
      assertCanAddGuests
    };
  }, [client, activeGuestCount]);
}
