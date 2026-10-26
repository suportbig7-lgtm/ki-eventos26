import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Calendar, MapPin, Clock, Music, Gift, 
  HelpCircle, Sparkles, AlertCircle, CheckCircle, XCircle, 
  Copy, Smartphone, MessageSquare, Compass, Info, Check, 
  ChevronLeft, ChevronRight, Volume2, VolumeX, FileText, X, Camera, 
  Download, QrCode, ShieldCheck, Share2, ExternalLink, 
  MessageCircle, UserCheck, Users, Church, Building2, UtensilsCrossed,
  Send, Sparkle, Image as ImageIcon, Upload, Lock, ThumbsUp
} from 'lucide-react';
import { WeddingConfig, Guest, GuestStatus, WeddingRegistryItem, MuralMessage, SharedPhoto } from '../types';
import { downloadWeddingPdf, downloadMobileWeddingPassPdf, sendInviteViaWhatsApp, downloadPhysicalCardQrPdf } from '../utils/pdfGenerator';
import { safeSetItem, safeGetItem } from '../utils/storage';
import { getSafeImageUrl, handleImageError, WEDDING_FALLBACK_IMAGES } from '../utils/imageFallback';
import { generateQrDataUrl, generateHighResQrPng, downloadQrCodeImage } from '../utils/qrCodeHelper';

interface PublicInviteProps {
  config: WeddingConfig;
  simulatedOnly?: boolean;
  visibleBlocks?: {
    story: boolean;
    timeline: boolean;
    venue: boolean;
    dressCode: boolean;
    registry: boolean;
    playlist: boolean;
    faq: boolean;
    guestCheckIn: boolean;
  };
  guestToken?: string;
  onGuestRsvpSubmit?: (
    token: string, 
    status: GuestStatus, 
    companions: number, 
    dietary: string, 
    notes: string,
    extraGuest?: Partial<Guest>
  ) => void;
  allGuests?: Guest[];
  onSwitchClient?: (clientId: string) => void;
  onUpdateConfig?: (config: WeddingConfig) => void;
  onNavigateToPlans?: () => void;
}

export default function PublicInvite({ 
  config: initialConfig, 
  simulatedOnly = false,
  visibleBlocks = {
    story: true,
    timeline: true,
    venue: true,
    dressCode: true,
    registry: true,
    playlist: true,
    faq: true,
    guestCheckIn: true,
  },
  guestToken = '',
  onGuestRsvpSubmit,
  allGuests = [],
  onSwitchClient,
  onUpdateConfig,
  onNavigateToPlans
}: PublicInviteProps) {
  const [config, setConfig] = useState<WeddingConfig>(initialConfig);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [rsvpToast, setRsvpToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'ticket' | 'scroller'>('scroller');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // RSVP Mode: 'direct_form' (Novo convidado pelo link) vs 'token_lookup' (Com código)
  const [rsvpMethod, setRsvpMethod] = useState<'direct_form' | 'token_lookup'>('direct_form');

  // Direct Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [hasCompanion, setHasCompanion] = useState(true); // Padrão: 1 acompanhante
  const [companionName, setCompanionName] = useState('');
  const [guestDietary, setGuestDietary] = useState('');
  const [guestMessageToCouple, setGuestMessageToCouple] = useState('');

  // Token Lookup State
  const [tokenInput, setTokenInput] = useState(guestToken || '');
  const [validatedGuest, setValidatedGuest] = useState<Guest | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<'Confirmed' | 'Declined'>('Confirmed');
  const [companionsCount, setCompanionsCount] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  // Validation Celebration Modal State
  const [validatedPass, setValidatedPass] = useState<{
    show: boolean;
    guest: Guest;
  } | null>(null);

  // Gift Contribution & Mural Modal State
  const [contributingGift, setContributingGift] = useState<WeddingRegistryItem | null>(null);
  const [contribName, setContribName] = useState('');
  const [contribAmount, setContribAmount] = useState<number>(0);
  const [contribMuralMessage, setContribMuralMessage] = useState('');
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  // Standalone Mural Comment Input
  const [newMuralAuthor, setNewMuralAuthor] = useState('');
  const [newMuralText, setNewMuralText] = useState('');

  // Physical Invitation QR & Profile Link Share State
  const [showPhysicalQrModal, setShowPhysicalQrModal] = useState(false);
  const [physicalQrColor, setPhysicalQrColor] = useState('#1c1917');
  const [physicalQrDataUrl, setPhysicalQrDataUrl] = useState<string>('');
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(false);

  // Shared Album state & reactions
  const [sharedPhotos, setSharedPhotos] = useState<SharedPhoto[]>(() => {
    try {
      const saved = localStorage.getItem(`kutxi_photos_${config.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [uploadPhotoUrl, setUploadPhotoUrl] = useState('');
  const [uploadPhotoCaption, setUploadPhotoCaption] = useState('');
  const [uploadPhotoAuthor, setUploadPhotoAuthor] = useState('');
  const [reactingPhotoId, setReactingPhotoId] = useState<string | null>(null);
  const [pendingReactionEmoji, setPendingReactionEmoji] = useState('❤️');
  const [reactionTokenInput, setReactionTokenInput] = useState('');

  // Track if guest made a contribution to unlock mural message posting
  const [hasContributedGift, setHasContributedGift] = useState<boolean>(() => {
    try {
      return safeGetItem(`kutxi_contributed_${config.id}`) === 'true';
    } catch (e) {
      return false;
    }
  });

  // Sync photos and contribution status when config changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`kutxi_photos_${config.id}`);
      if (saved) setSharedPhotos(JSON.parse(saved));
      setHasContributedGift(safeGetItem(`kutxi_contributed_${config.id}`) === 'true');
    } catch (e) {}
  }, [config.id]);

  // Audio Playback
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const targetCid = config.clientId || config.id || 'client_1';
  const inviteProfileUrl = `${origin}/?clientId=${targetCid}&invite=convite`;
  const shortInviteUrl = `${origin}/?w=${targetCid}`;

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setRsvpToast({ show: true, message, type });
    setTimeout(() => setRsvpToast(null), 4500);
  };

  const handleCopyInviteUrl = () => {
    navigator.clipboard.writeText(inviteProfileUrl);
    setCopiedInviteUrl(true);
    showToast('Link do convite copiado com sucesso!', 'success');
    setTimeout(() => setCopiedInviteUrl(false), 2500);
  };

  const handleShareInviteWhatsApp = () => {
    const groomName = config.brideGroom?.groomName?.trim() || (config.clientId !== 'client_1' ? 'Noivo' : 'Gabriel');
    const brideName = config.brideGroom?.brideName?.trim() || (config.clientId !== 'client_1' ? 'Noiva' : 'Sofia');
    let formattedDate = 'Data da Celebração';
    try {
      if (config.date) {
        formattedDate = new Date(config.date).toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (e) {}

    const text = `💍 *Convite Oficial de Casamento* 💍\n\nÉ com imensa honra e alegria que convidamos você para celebrar o nosso matrimônio!\n\n✨ *${groomName} & ${brideName}*\n📅 *Data:* ${formattedDate}\n\nAcesse o link abaixo para visualizar todos os detalhes, mapa da Igreja e Recepção, lista de presentes e confirmar a sua presença:\n🔗 ${shortInviteUrl}\n\nSerá uma honra celebrar este dia com você! ❤️`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Generate High-Res QR code when physical QR modal is opened
  useEffect(() => {
    if (showPhysicalQrModal) {
      generateHighResQrPng(inviteProfileUrl, 1000, physicalQrColor)
        .then(url => setPhysicalQrDataUrl(url))
        .catch(() => {});
    }
  }, [showPhysicalQrModal, physicalQrColor, inviteProfileUrl]);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  // Instant reactive synchronization listener
  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e.detail?.config) {
        setConfig(e.detail.config);
      }
    };
    window.addEventListener('kutxi_wedding_config_changed', handleConfigChange);
    return () => window.removeEventListener('kutxi_wedding_config_changed', handleConfigChange);
  }, []);

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const target = new Date(config.date).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) {
        clearInterval(interval);
      } else {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [config.date]);

  // If token passed in URL, auto-resolve guest
  useEffect(() => {
    if (guestToken && allGuests.length > 0) {
      const found = allGuests.find(g => 
        g.rsvpToken.toLowerCase() === guestToken.toLowerCase() ||
        g.id.toLowerCase() === guestToken.toLowerCase()
      );
      if (found) {
        setValidatedGuest(found);
        setTokenInput(found.rsvpToken);
        setRsvpStatus(found.status === 'Declined' ? 'Declined' : 'Confirmed');
        setCompanionsCount(found.plusOnesConfirmed || found.maxPlusOnes || 1);
        if (found.companionName) {
          setCompanionName(found.companionName);
          setHasCompanion(true);
        }
        setRsvpMethod('token_lookup');
      }
    }
  }, [guestToken, allGuests]);

  useEffect(() => {
    const activeToken = validatedPass?.guest?.rsvpToken || validatedGuest?.rsvpToken;
    if (activeToken) {
      generateQrDataUrl(`rsvp:${activeToken}`, 220)
        .then(url => setQrCodeDataUrl(url))
        .catch(() => {});
    }
  }, [validatedGuest, validatedPass]);

  // Copy helper
  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankField(fieldId);
    setTimeout(() => setCopiedBankField(null), 2500);
  };

  // Guest Confirmation & Identity Status
  const isGuestConfirmed = Boolean(
    (validatedGuest && validatedGuest.status === 'Confirmed') ||
    (validatedPass && validatedPass.guest && validatedPass.guest.status === 'Confirmed')
  );
  const currentGuestToken = validatedPass?.guest?.rsvpToken || validatedGuest?.rsvpToken || guestToken || '';
  const currentGuestName = validatedPass?.guest?.name || validatedGuest?.name || (firstName && lastName ? `${firstName.trim()} ${lastName.trim()}` : '');

  // Photo Upload Handler for Shared Album (only unlocked after confirming presence)
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('A imagem excede 5MB. Por favor, escolha uma foto menor.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadPhotoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSharedPhoto = (e: FormEvent) => {
    e.preventDefault();
    if (!isGuestConfirmed) {
      showToast('Apenas convidados com presença confirmada podem enviar fotos para o álbum!', 'error');
      return;
    }
    if (!uploadPhotoUrl.trim()) {
      showToast('Por favor, selecione uma foto para publicar.', 'error');
      return;
    }
    const author = uploadPhotoAuthor.trim() || currentGuestName || 'Convidado Confirmado';
    const newPhoto: SharedPhoto = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      guestName: author,
      guestToken: currentGuestToken,
      imageUrl: uploadPhotoUrl.trim(),
      timestamp: new Date().toLocaleDateString('pt-AO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      caption: uploadPhotoCaption.trim(),
      approved: true, // "nao precisam de aprovação"
      reactions: { '❤️': currentGuestToken ? [currentGuestToken] : [] }
    };
    const updated = [newPhoto, ...sharedPhotos];
    setSharedPhotos(updated);
    safeSetItem(`kutxi_photos_${config.id}`, JSON.stringify(updated));
    setUploadPhotoUrl('');
    setUploadPhotoCaption('');
    showToast('Foto adicionada ao Álbum Partilhado dos Noivos com sucesso!', 'success');
  };

  // Reactions Handler (requires guest token)
  const handleTriggerReaction = (photoId: string, emoji: string) => {
    const tokenToUse = currentGuestToken || safeGetItem('kutxi_active_reaction_token');
    if (tokenToUse) {
      applyReaction(photoId, emoji, tokenToUse);
    } else {
      setReactingPhotoId(photoId);
      setPendingReactionEmoji(emoji);
    }
  };

  const applyReaction = (photoId: string, emoji: string, token: string) => {
    const cleanToken = token.trim();
    if (!cleanToken) return;
    safeSetItem('kutxi_active_reaction_token', cleanToken);

    const updated = sharedPhotos.map(photo => {
      if (photo.id !== photoId) return photo;
      const reactions = { ...(photo.reactions || {}) };
      const list = reactions[emoji] || [];
      if (list.includes(cleanToken)) {
        reactions[emoji] = list.filter(t => t !== cleanToken);
      } else {
        reactions[emoji] = [...list, cleanToken];
      }
      return { ...photo, reactions };
    });

    setSharedPhotos(updated);
    safeSetItem(`kutxi_photos_${config.id}`, JSON.stringify(updated));
    setReactingPhotoId(null);
    setReactionTokenInput('');
    showToast(`Reação ${emoji} registrada com o seu token!`, 'success');
  };

  // 1. Submit RSVP through Direct Link (Nome e Sobrenome, acompanhante padrão 1)
  const handleDirectRsvpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      showToast('Por favor, preencha o seu Nome e Sobrenome.', 'error');
      return;
    }
    if (hasCompanion && !companionName.trim()) {
      showToast('Por favor, informe o nome completo do seu acompanhante.', 'error');
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const generatedToken = 'KTX-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const newGuestRecord: Guest = {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: guestPhone.trim(),
      email: '',
      group: 'Friends',
      tableNumber: 'Mesa Especial dos Noivos',
      maxPlusOnes: hasCompanion ? 1 : 0,
      plusOnesConfirmed: hasCompanion ? 1 : 0,
      companionName: hasCompanion ? companionName.trim() : undefined,
      status: 'Confirmed',
      dietaryRequirements: guestDietary.trim(),
      notes: guestMessageToCouple.trim(),
      rsvpToken: generatedToken,
      invitationViews: 1,
      checkedIn: false,
      confirmedAt: new Date().toISOString()
    };

    if (onGuestRsvpSubmit) {
      onGuestRsvpSubmit(
        generatedToken,
        'Confirmed',
        hasCompanion ? 1 : 0,
        guestDietary,
        guestMessageToCouple,
        newGuestRecord
      );
    }

    // If guest left a message for the couple, also post to Mural with pending status
    if (guestMessageToCouple.trim() && onUpdateConfig) {
      const newMuralMsg: MuralMessage = {
        id: 'm_' + Date.now(),
        author: fullName,
        message: guestMessageToCouple.trim(),
        date: new Date().toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' }),
        avatarUrl: WEDDING_FALLBACK_IMAGES.avatarFemale,
        status: 'pending'
      };
      const updatedConfig = {
        ...config,
        muralComments: [newMuralMsg, ...(config.muralComments || [])]
      };
      onUpdateConfig(updatedConfig);
    }

    // Set celebration modal
    setValidatedPass({
      show: true,
      guest: newGuestRecord
    });

    // Auto-generate PDF with personalized names
    downloadWeddingPdf(config, newGuestRecord);

    showToast(`Presença confirmada com sucesso, ${fullName}! O seu convite PDF oficial foi gerado.`, 'success');
  };

  // 2. Submit RSVP through Token Lookup
  const handleTokenLookup = (e: FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setErrorMsg('');

    const norm = (t: string) => (t || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const qNorm = norm(tokenInput);

    const found = allGuests.find(g => 
      norm(g.rsvpToken) === qNorm ||
      norm(g.name).includes(qNorm) ||
      qNorm.includes(norm(g.name))
    );

    if (found) {
      setValidatedGuest(found);
      setRsvpStatus(found.status === 'Declined' ? 'Declined' : 'Confirmed');
      setCompanionsCount(found.plusOnesConfirmed || found.maxPlusOnes || 1);
      if (found.companionName) {
        setCompanionName(found.companionName);
        setHasCompanion(true);
      }
      showToast(`Convite de ${found.name} localizado!`, 'info');
    } else {
      setErrorMsg('Convite ou código não encontrado. Pode confirmar diretamente preenchendo o Nome e Sobrenome na aba ao lado.');
    }
  };

  const handleConfirmExistingTokenGuest = (e: FormEvent) => {
    e.preventDefault();
    if (!validatedGuest) return;

    const updatedGuest: Guest = {
      ...validatedGuest,
      status: rsvpStatus,
      plusOnesConfirmed: rsvpStatus === 'Confirmed' ? companionsCount : 0,
      companionName: (hasCompanion && companionName.trim()) ? companionName.trim() : validatedGuest.companionName,
      confirmedAt: new Date().toISOString()
    };

    if (onGuestRsvpSubmit) {
      onGuestRsvpSubmit(
        validatedGuest.rsvpToken,
        rsvpStatus,
        rsvpStatus === 'Confirmed' ? companionsCount : 0,
        validatedGuest.dietaryRequirements || '',
        validatedGuest.notes || '',
        updatedGuest
      );
    }

    if (rsvpStatus === 'Confirmed') {
      setValidatedPass({
        show: true,
        guest: updatedGuest
      });
      downloadWeddingPdf(config, updatedGuest);
      showToast(`Presença confirmada com sucesso, ${validatedGuest.name}! Seu PDF foi gerado.`, 'success');
    } else {
      showToast(`Resposta registrada com sucesso. Agradecemos por nos avisar!`, 'info');
    }
  };

  // 3. Handle Gift Contribution & Mural Message
  const handleConfirmGiftContribution = () => {
    if (!contributingGift) return;
    const amount = Number(contribAmount) || 0;
    if (amount <= 0) {
      showToast('Por favor, informe um valor válido para a contribuição em Kwanzas.', 'error');
      return;
    }
    const donorName = contribName.trim() || 'Amigo dos Noivos';

    const currentTotal = contributingGift.totalCollected || 0;
    const newTotal = currentTotal + amount;
    const isCompleted = newTotal >= contributingGift.price;

    const newContributor = {
      id: 'c_' + Date.now(),
      name: donorName,
      amount,
      date: new Date().toLocaleDateString('pt-AO', { day: 'numeric', month: 'numeric', year: 'numeric' }),
      message: contribMuralMessage.trim() || undefined,
      avatarUrl: WEDDING_FALLBACK_IMAGES.avatarFemale
    };

    const updatedRegistryItems = (config.giftRegistry?.registryItems || []).map(item => {
      if (item.id === contributingGift.id) {
        return {
          ...item,
          totalCollected: newTotal,
          status: isCompleted ? ('recebido' as const) : item.status,
          contributors: [...(item.contributors || []), newContributor]
        };
      }
      return item;
    });

    // Add message to Mural if provided
    let updatedMural = config.muralComments || [];
    if (contribMuralMessage.trim()) {
      const muralEntry: MuralMessage = {
        id: 'm_' + Date.now(),
        author: donorName,
        message: contribMuralMessage.trim(),
        date: new Date().toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' }),
        giftName: contributingGift.name,
        amountContributed: amount,
        avatarUrl: WEDDING_FALLBACK_IMAGES.avatarFemale,
        status: 'pending'
      };
      updatedMural = [muralEntry, ...updatedMural];
    }

    const updatedConfig: WeddingConfig = {
      ...config,
      giftRegistry: {
        ...config.giftRegistry,
        registryItems: updatedRegistryItems
      },
      muralComments: updatedMural
    };

    setConfig(updatedConfig);
    if (onUpdateConfig) {
      onUpdateConfig(updatedConfig);
    }
    safeSetItem('kutxi_wedding_config', JSON.stringify(updatedConfig));

    setContributingGift(null);
    setContribName('');
    setContribAmount(0);
    setContribMuralMessage('');
    setHasContributedGift(true);
    safeSetItem(`kutxi_contributed_${config.id}`, 'true');

    showToast(
      isCompleted 
        ? `Parabéns! Sua contribuição completou este presente! O seu recado aguarda validação no perfil dos noivos.`
        : `Muito obrigado, ${donorName}! Sua contribuição de ${formatAOA(amount)} foi registrada. O seu recado aguarda validação no perfil dos noivos.`,
      'success'
    );
  };

  // Add Direct Mural Wish (Awaits couple's validation)
  const handleAddDirectMuralWish = (e: FormEvent) => {
    e.preventDefault();
    if (!newMuralAuthor.trim() || !newMuralText.trim()) return;

    const muralEntry: MuralMessage = {
      id: 'm_' + Date.now(),
      author: newMuralAuthor.trim(),
      message: newMuralText.trim(),
      date: new Date().toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' }),
      avatarUrl: WEDDING_FALLBACK_IMAGES.avatarMale,
      status: 'pending'
    };

    const updatedConfig: WeddingConfig = {
      ...config,
      muralComments: [muralEntry, ...(config.muralComments || [])]
    };

    setConfig(updatedConfig);
    if (onUpdateConfig) {
      onUpdateConfig(updatedConfig);
    }
    safeSetItem('kutxi_wedding_config', JSON.stringify(updatedConfig));

    setNewMuralAuthor('');
    setNewMuralText('');
    showToast('Sua mensagem carinhosa foi enviada e aguarda validação no perfil dos noivos antes de aparecer no mural!', 'success');
  };

  const groom = config.brideGroom?.groomName?.trim() || (config.clientId !== 'client_1' ? 'Noivo' : 'Gabriel');
  const bride = config.brideGroom?.brideName?.trim() || (config.clientId !== 'client_1' ? 'Noiva' : 'Sofia');

  const formatAOA = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val) + ' Kz';
  };

  // Cover photo with bulletproof fallback
  const heroCoverUrl = getSafeImageUrl(config.media?.coverImage || config.brideGroom?.couplePhoto, 'cover');
  const bridePhotoUrl = getSafeImageUrl(config.brideGroom?.bridePhoto, 'bride');
  const groomPhotoUrl = getSafeImageUrl(config.brideGroom?.groomPhoto, 'groom');
  const couplePhotoUrl = getSafeImageUrl(config.brideGroom?.couplePhoto, 'couple');
  const storyImageUrl = getSafeImageUrl(config.media?.storyImage, 'story');

  const galleryPhotos = (config.media?.photos && config.media.photos.length > 0)
    ? config.media.photos
    : WEDDING_FALLBACK_IMAGES.gallery;

  const registryItems = config.giftRegistry?.registryItems || [];

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans relative selection:bg-rose-100 selection:text-rose-900 transition-colors duration-300">
      {/* Toast Notification */}
      {rsvpToast && (
        <div 
          role="status" 
          aria-live="polite" 
          className="fixed bottom-6 right-6 z-50 p-4 bg-stone-950 text-white rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{rsvpToast.message}</span>
        </div>
      )}

      {/* Top Banner Navigation Bar - Luminous Frosted Bar */}
      <header className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md text-stone-900 dark:text-stone-100 py-3 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 border-b border-stone-200/70 dark:border-stone-800 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Heart className="w-4 h-4 text-[#8E2840] fill-[#8E2840] animate-pulse" />
          <span className="font-serif font-bold text-sm tracking-wider uppercase text-stone-900 dark:text-amber-200">
            {groom} & {bride}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {simulatedOnly ? (
            <button
              onClick={() => setShowPhysicalQrModal(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#FAF6EE] dark:bg-amber-950/40 text-[#9E7A36] dark:text-amber-300 hover:bg-[#F4ECD8] border border-[#E9DEC6] dark:border-amber-900/50 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Partilhar Link do Convite & Gerar QR Code para Gráfica"
            >
              <QrCode className="w-3.5 h-3.5 text-[#9E7A36] dark:text-amber-300" />
              <span className="hidden sm:inline">Partilhar & QR Físico</span>
              <span className="sm:hidden">QR Físico</span>
            </button>
          ) : (
            <a
              href="#rsvp-section"
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#8E2840] hover:bg-[#782236] text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar Presença</span>
            </a>
          )}

          <button
            onClick={() => setViewMode(viewMode === 'ticket' ? 'scroller' : 'ticket')}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200/70 dark:hover:bg-stone-750 border border-stone-200/80 dark:border-stone-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            {viewMode === 'ticket' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#9E7A36] dark:text-amber-300" />
                <span>Ver Convite Completo</span>
              </>
            ) : (
              <>
                <QrCode className="w-3.5 h-3.5 text-[#8E2840] dark:text-rose-400" />
                <span>Passe VIP & Bilhete</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ========================================================
          MODE 1: VIP TICKET & RSVP PASS (TICKET VIEW)
          ======================================================== */}
      {viewMode === 'ticket' && (
        <main className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8 animate-in fade-in duration-300">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3.5 py-1 rounded-full inline-block">
              Passe Digital VIP & Acesso à Portaria
            </span>
            <h1 className="text-3xl md:text-5xl font-serif font-light text-stone-900 dark:text-white">
              {groom} <span className="italic text-rose-800 dark:text-rose-400 font-normal">&</span> {bride}
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {new Date(config.date).toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Couple Cover Banner in Ticket */}
          <div className="relative h-48 md:h-64 rounded-3xl overflow-hidden shadow-lg border border-stone-200 dark:border-stone-800">
            <img 
              src={heroCoverUrl} 
              alt="Noivos" 
              className="w-full h-full object-cover"
              onError={e => handleImageError(e, 'cover')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
              <div className="text-white">
                <span className="text-[10px] uppercase tracking-widest font-bold text-amber-300">Celebração Matrimonial</span>
                <h2 className="text-2xl font-serif font-bold">{config.venue?.churchName || config.venue?.ceremonyName || 'Igreja Nossa Senhora do Carmo'}</h2>
              </div>
            </div>
          </div>

          {/* Quick Share & Physical QR Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900 rounded-2xl text-xs">
            <div className="flex items-center gap-2.5">
              <QrCode className="w-5 h-5 text-amber-800 dark:text-amber-400 shrink-0" />
              <div>
                <strong className="text-amber-950 dark:text-amber-200 block font-serif">QR Code para Convites Físicos / Impressos</strong>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">Gere e baixe a imagem em alta resolução (1200 DPI) para gráfica e cartões em papel</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPhysicalQrModal(true)}
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Gerar QR para Gráfica</span>
            </button>
          </div>

          {/* RSVP Tab Selector */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-xl space-y-6">
            <div className="flex border-b border-stone-100 dark:border-stone-800 pb-4 justify-center gap-2">
              <button
                type="button"
                onClick={() => setRsvpMethod('direct_form')}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  rsvpMethod === 'direct_form'
                    ? 'bg-[#8E2840] text-white shadow-2xs font-semibold'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                Confirmar pelo Link (Nome & Sobrenome)
              </button>
              <button
                type="button"
                onClick={() => setRsvpMethod('token_lookup')}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  rsvpMethod === 'token_lookup'
                    ? 'bg-[#8E2840] text-white shadow-2xs font-semibold'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                Já Tenho Código / Token
              </button>
            </div>

            {/* TAB A: DIRECT RSVP WITH FIRST & LAST NAME + COMPANION */}
            {rsvpMethod === 'direct_form' && (
              <form onSubmit={handleDirectRsvpSubmit} className="space-y-4 max-w-lg mx-auto">
                <div className="text-center space-y-1">
                  <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                    Confirmação de Presença
                  </h3>
                  <p className="text-xs text-stone-500">
                    Insira seus dados para validar sua presença e emitir seu convite oficial personalizado em PDF.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-rose-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">
                      Sobrenome *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Mendes"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-rose-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">
                    Telefone / WhatsApp (Para envio do Passe)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: +244 923 000 000"
                    value={guestPhone}
                    onChange={e => setGuestPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-rose-800"
                  />
                </div>

                {/* COMPANION TOGGLE (DEFAULT 1 COMPANION) */}
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-xs text-amber-950 dark:text-amber-200 block">
                        Acompanhante no Convite
                      </strong>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400">
                        Por defeito é atribuído 1 acompanhante ao seu convite.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasCompanion} 
                        onChange={e => setHasCompanion(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-800"></div>
                    </label>
                  </div>

                  {/* WHEN COMPANION IS SELECTED: ASK FOR COMPANION'S NAME */}
                  {hasCompanion && (
                    <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 space-y-1 animate-in fade-in">
                      <label className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        <span>Nome Completo do Acompanhante *</span>
                      </label>
                      <input
                        type="text"
                        required={hasCompanion}
                        placeholder="Ex: Maria Fernandes Mendes"
                        value={companionName}
                        onChange={e => setCompanionName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-rose-800"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">
                    Recado carinhoso para os Noivos (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Deixe seus votos para o casal (aparecerá no Mural dos Noivos)..."
                    value={guestMessageToCouple}
                    onChange={e => setGuestMessageToCouple(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-rose-800 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  <span>Confirmar Presença & Emitir Convite PDF</span>
                </button>
              </form>
            )}

            {/* TAB B: TOKEN LOOKUP */}
            {rsvpMethod === 'token_lookup' && (
              <div className="space-y-4 max-w-lg mx-auto">
                {!validatedGuest ? (
                  <form onSubmit={handleTokenLookup} className="space-y-3">
                    <div className="text-center space-y-1">
                      <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                        Aceder por Código / Token
                      </h3>
                      <p className="text-xs text-stone-500 font-light">
                        Digite o código recebido no seu convite de WhatsApp.
                      </p>
                    </div>

                    <input
                      type="text"
                      required
                      placeholder="Ex: KTX-AB12 ou seu nome"
                      value={tokenInput}
                      onChange={e => setTokenInput(e.target.value)}
                      className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white text-center font-bold focus:outline-rose-800"
                    />

                    {errorMsg && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
                        {errorMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-all"
                    >
                      Localizar Meu Convite
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmExistingTokenGuest} className="space-y-4">
                    <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase block">Convidado</span>
                        <h4 className="font-serif text-lg font-bold text-stone-900 dark:text-white">{validatedGuest.name}</h4>
                        {validatedGuest.tableNumber && (
                          <span className="text-xs text-stone-500">Mesa: {validatedGuest.tableNumber}</span>
                        )}
                      </div>
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-full text-[10px] font-bold">
                        Token: {validatedGuest.rsvpToken}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setRsvpStatus('Confirmed')}
                        className={`py-2.5 rounded-xl border transition-all cursor-pointer ${
                          rsvpStatus === 'Confirmed' 
                            ? 'bg-rose-900 text-white border-rose-900 shadow-sm' 
                            : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200'
                        }`}
                      >
                        Vou Comparecer ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setRsvpStatus('Declined')}
                        className={`py-2.5 rounded-xl border transition-all cursor-pointer ${
                          rsvpStatus === 'Declined' 
                            ? 'bg-stone-900 text-white border-stone-900 shadow-sm' 
                            : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200'
                        }`}
                      >
                        Não Poderei Ir ✕
                      </button>
                    </div>

                    {rsvpStatus === 'Confirmed' && (
                      <div className="space-y-3 pt-2">
                        <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl space-y-2">
                          <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase block">
                            Nome do Acompanhante
                          </label>
                          <input
                            type="text"
                            placeholder="Nome completo do acompanhante"
                            value={companionName}
                            onChange={e => setCompanionName(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-stone-900 border rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirmar & Gerar Convite PDF</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </main>
      )}

      {/* ========================================================
          MODE 2: COMPLETE SCROLLER WEBPAGE (PORTAL COMPLETO)
          ======================================================== */}
      {viewMode === 'scroller' && (
        <main className="max-w-4xl mx-auto px-4 py-8 md:py-14 space-y-16 animate-in fade-in duration-300">
          {/* HERO SECTION WITH REAL PHOTO & ORNATE STYLING */}
          <section className="relative rounded-3xl overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 text-center py-20 px-6 bg-stone-900 text-white min-h-[500px] flex flex-col justify-center items-center">
            {/* Background Image */}
            <img 
              src={heroCoverUrl} 
              alt="Capa dos Noivos" 
              className="absolute inset-0 w-full h-full object-cover opacity-45 scale-105 transition-transform duration-1000"
              onError={e => handleImageError(e, 'cover')}
            />
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />

            <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
              <span className="text-[11px] uppercase tracking-[0.3em] font-semibold text-amber-300 bg-black/40 px-4 py-1.5 rounded-full border border-amber-300/30 inline-block backdrop-blur-xs">
                Celebração Matrimonial
              </span>

              <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-light tracking-wide text-white drop-shadow-md">
                {groom} <span className="italic text-amber-300 font-normal">&</span> {bride}
              </h1>

              <p className="text-sm sm:text-base text-stone-200 font-serif italic max-w-md mx-auto">
                "O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha."
              </p>

              <div className="text-xs text-amber-200/90 font-mono tracking-wider pt-2">
                {new Date(config.date).toLocaleDateString('pt-AO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              {/* Countdown Badges */}
              <div className="grid grid-cols-4 gap-2.5 max-w-xs mx-auto pt-4 text-center">
                <div className="p-3 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
                  <div className="text-2xl font-bold font-mono text-amber-300">{timeLeft.days}</div>
                  <div className="text-[9px] uppercase tracking-wider text-stone-300">Dias</div>
                </div>
                <div className="p-3 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
                  <div className="text-2xl font-bold font-mono text-amber-300">{timeLeft.hours}</div>
                  <div className="text-[9px] uppercase tracking-wider text-stone-300">Horas</div>
                </div>
                <div className="p-3 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
                  <div className="text-2xl font-bold font-mono text-amber-300">{timeLeft.minutes}</div>
                  <div className="text-[9px] uppercase tracking-wider text-stone-300">Min</div>
                </div>
                <div className="p-3 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
                  <div className="text-2xl font-bold font-mono text-amber-300">{timeLeft.seconds}</div>
                  <div className="text-[9px] uppercase tracking-wider text-stone-300">Seg</div>
                </div>
              </div>

              {/* Quick RSVP Button */}
              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <a
                  href="#rsvp-section"
                  className="px-6 py-3 bg-[#8E2840] hover:bg-[#782236] text-white rounded-full text-xs font-semibold tracking-wider uppercase shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  <span>Confirmar Presença (RSVP)</span>
                </a>
                {/* A opção baixar convite só aparece após confirmação da presença */}
                {isGuestConfirmed && (
                  <button
                    type="button"
                    onClick={() => downloadWeddingPdf(config, validatedGuest || validatedPass?.guest)}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-2 shadow-lg animate-in fade-in"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Convite PDF ({validatedGuest?.name || validatedPass?.guest?.name})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPhysicalQrModal(true)}
                  className="px-5 py-3 bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 backdrop-blur-md border border-amber-400/40 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-amber-300" />
                  <span>QR para Convite Físico / Gráfica</span>
                </button>
              </div>
            </div>
          </section>

          {/* NOIVOS & PORTRAITS SECTION */}
          <section className="bg-white dark:bg-stone-900 p-8 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-8">
            <div className="text-center space-y-1">
              <span className="text-[10px] tracking-widest uppercase font-bold text-amber-700 dark:text-amber-400">
                Os Noivos
              </span>
              <h2 className="text-3xl font-serif font-light text-stone-900 dark:text-white">
                Quem Encontrou a Sua Outra Metade
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Groom Card */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-700">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-amber-200 dark:border-amber-800">
                  <img 
                    src={groomPhotoUrl} 
                    alt={groom}
                    className="w-full h-full object-cover"
                    onError={e => handleImageError(e, 'groom')}
                  />
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <span className="text-[10px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-widest block">O Noivo</span>
                  <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-white">
                    {config.brideGroom?.groomFullName || groom}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-light">
                    {config.brideGroom?.groomBio || 'Apaixonado pela vida e grato por celebrar este momento tão especial com você.'}
                  </p>
                  {config.brideGroom?.groomParents && (
                    <span className="text-[10px] text-stone-400 block pt-1 font-serif italic">
                      Filho de: {config.brideGroom.groomParents}
                    </span>
                  )}
                </div>
              </div>

              {/* Bride Card */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-700">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-amber-200 dark:border-amber-800">
                  <img 
                    src={bridePhotoUrl} 
                    alt={bride}
                    className="w-full h-full object-cover"
                    onError={e => handleImageError(e, 'bride')}
                  />
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <span className="text-[10px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-widest block">A Noiva</span>
                  <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-white">
                    {config.brideGroom?.brideFullName || bride}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-light">
                    {config.brideGroom?.brideBio || 'Ansiosa por dizer o "Sim" e iniciar o capítulo mais bonito da nossa caminhada.'}
                  </p>
                  {config.brideGroom?.brideParents && (
                    <span className="text-[10px] text-stone-400 block pt-1 font-serif italic">
                      Filha de: {config.brideGroom.brideParents}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* CRITICAL REQUIREMENT: INFORMAÇÃO COMPLETA DOS LOCAIS: IGREJA, REGISTO CIVIL E RECEPÇÃO */}
          {visibleBlocks.venue && (
            <section className="bg-white dark:bg-stone-900 p-8 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-8" id="locais-section">
              <div className="text-center space-y-1">
                <span className="text-[10px] tracking-widest uppercase font-bold text-amber-700 dark:text-amber-400">
                  Locais da Celebração
                </span>
                <h2 className="text-3xl font-serif font-light text-stone-900 dark:text-white">
                  Onde Tudo Acontecerá
                </h2>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Informações detalhadas sobre a Cerimónia Religiosa (Igreja), Cerimónia Civil (Registo) e o Copo de Água.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. CERIMÓNIA RELIGIOSA (IGREJA) */}
                <div className="p-6 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border-2 border-amber-200/80 dark:border-amber-900 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 rounded-xl flex items-center justify-center text-amber-800 dark:text-amber-400">
                      <Church className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 block">
                        Cerimónia Religiosa
                      </span>
                      <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                        {config.venue?.churchName || config.venue?.ceremonyName || 'Igreja Nossa Senhora do Carmo'}
                      </h3>
                    </div>

                    <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span>{config.venue?.churchTime || config.venue?.ceremonyTime || 'Sábado, às 16:00h'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span>{config.venue?.churchAddress || config.venue?.ceremonyAddress || 'Largo do Carmo, Ingombota, Luanda'}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={config.venue?.churchMapsUrl || config.venue?.ceremonyMapsUrl || 'https://maps.google.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver no Google Maps</span>
                  </a>
                </div>

                {/* 2. CERIMÓNIA CIVIL (REGISTO) */}
                <div className="p-6 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border-2 border-stone-200 dark:border-stone-700 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-stone-200 dark:bg-stone-700 rounded-xl flex items-center justify-center text-stone-800 dark:text-stone-200">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
                        Cerimónia Civil / Registo
                      </span>
                      <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                        {config.venue?.civilName || 'Conservatória do Registo Civil'}
                      </h3>
                    </div>

                    <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                        <span>{config.venue?.civilTime || 'Sexta-feira, às 10:30h'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                        <span>{config.venue?.civilAddress || 'Rua Rainha Ginga, Luanda, Angola'}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={config.venue?.civilMapsUrl || 'https://maps.google.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver no Google Maps</span>
                  </a>
                </div>

                {/* 3. COPO DE ÁGUA & RECEPÇÃO */}
                <div className="p-6 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border-2 border-rose-200/80 dark:border-rose-900 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 rounded-xl flex items-center justify-center text-rose-800 dark:text-rose-400">
                      <UtensilsCrossed className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400 block">
                        Copo de Água & Recepção
                      </span>
                      <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                        {config.venue?.receptionName || 'Espaço Jardins da Welwitschia'}
                      </h3>
                    </div>

                    <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                        <span>{config.venue?.receptionTime || 'A partir das 18:00h'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                        <span>{config.venue?.receptionAddress || 'Via AL 15, Talatona, Luanda'}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={config.venue?.receptionMapsUrl || 'https://maps.google.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver no Google Maps</span>
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* NOSSA HISTÓRIA */}
          {visibleBlocks.story && (
            <section className="bg-white dark:bg-stone-900 p-8 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-[10px] tracking-widest uppercase font-bold text-amber-700 dark:text-amber-400">
                    Como Tudo Começou
                  </span>
                  <h2 className="text-3xl font-serif font-light text-stone-900 dark:text-white">
                    {config.storyTitle || 'Nossa História de Amor'}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-light">
                    {config.storyContent || 'Nos conhecemos num belo fim de tarde à beira da Baía de Luanda. Anos de risadas, desafios superados e um amor que cresceu e amadureceu diante de Deus.'}
                  </p>
                </div>
                <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden shadow-lg border border-stone-200 dark:border-stone-700">
                  <img 
                    src={storyImageUrl} 
                    alt="História de Amor" 
                    className="w-full h-full object-cover"
                    onError={e => handleImageError(e, 'story')}
                  />
                </div>
              </div>
            </section>
          )}

          {/* GALERIA DE FOTOS */}
          <section className="bg-white dark:bg-stone-900 p-8 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-6">
            <div className="text-center space-y-1">
              <span className="text-[10px] tracking-widest uppercase font-bold text-amber-700 dark:text-amber-400">
                Momentos Especiais
              </span>
              <h2 className="text-3xl font-serif font-light text-stone-900 dark:text-white">
                Galeria dos Noivos
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryPhotos.map((photo, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedPhoto(photo)}
                  className="relative aspect-square rounded-2xl overflow-hidden shadow-xs hover:shadow-md cursor-pointer group bg-stone-100 dark:bg-stone-800"
                >
                  <img 
                    src={photo} 
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={e => handleImageError(e, 'cover')}
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-6 h-6" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CRITICAL REQUIREMENT: LISTA DE PRESENTES COM BARRA DE PROGRESSO & COMENTÁRIO NO MURAL */}
          {visibleBlocks.registry && (
            <section className="bg-white dark:bg-stone-900 p-8 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-8" id="lista-presentes-section">
              <div className="text-center space-y-1">
                <span className="text-[10px] tracking-widest uppercase font-bold text-amber-700 dark:text-amber-400">
                  Lista de Presentes & Cotas
                </span>
                <h2 className="text-3xl font-serif font-light text-stone-900 dark:text-white">
                  Abençoe o Nosso Novo Lar
                </h2>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Acompanhe a barra de progresso de cada presente. Ao contribuir, deixe uma mensagem especial no nosso Mural!
                </p>
              </div>

              {/* Bank & Multicaixa Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
                      Multicaixa Express (MCX)
                    </span>
                    <button
                      onClick={() => handleCopy(config.giftRegistry?.multicaixaPhone || '+244 923 456 789', 'mcx')}
                      className="text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedBankField === 'mcx' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedBankField === 'mcx' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-base font-bold text-stone-900 dark:text-white">
                    {config.giftRegistry?.multicaixaPhone || '+244 923 456 789'}
                  </div>
                </div>

                <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
                      IBAN Bancário ({config.giftRegistry?.bankName || 'BFA'})
                    </span>
                    <button
                      onClick={() => handleCopy(config.giftRegistry?.iban || 'AO06 0006 0042 0001 9472 0090 1', 'iban')}
                      className="text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedBankField === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedBankField === 'iban' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs font-bold text-stone-900 dark:text-white break-all">
                    {config.giftRegistry?.iban || 'AO06 0006 0042 0001 9472 0090 1'}
                  </div>
                </div>
              </div>

              {/* Items Grid with Progress Bar & Completion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {registryItems.map(item => {
                  const collected = item.totalCollected || 0;
                  const price = item.price || 1;
                  const pct = Math.min(100, Math.round((collected / price) * 100));
                  const isCompleted = collected >= price || item.status === 'recebido';

                  return (
                    <div 
                      key={item.id}
                      className="bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
                    >
                      <div>
                        <div className="relative h-44 w-full bg-stone-100 dark:bg-stone-700 overflow-hidden">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={e => handleImageError(e, 'giftDefault')}
                          />
                          <div className="absolute top-2.5 right-2.5">
                            {isCompleted ? (
                              <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-bold shadow-md flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>CONCLUÍDA 🎉</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-black/60 text-white backdrop-blur-xs rounded-full text-[10px] font-semibold">
                                {pct}% arrecadado
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-4 space-y-2">
                          <h4 className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1">
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          {/* PROGRESS BAR */}
                          <div className="pt-2 space-y-1">
                            <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                              <span>Arrecadado: {formatAOA(collected)}</span>
                              <span>Meta: {formatAOA(price)}</span>
                            </div>
                            <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-700 ${
                                  isCompleted ? 'bg-emerald-500' : 'bg-rose-800'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        {isCompleted ? (
                          <div className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-center text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                            ✓ Meta Concluída com Sucesso!
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setContributingGift(item);
                              setContribAmount(Math.max(10000, price - collected));
                            }}
                            className="w-full py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Gift className="w-3.5 h-3.5" />
                            <span>Contribuir & Deixar Recado</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* CRITICAL REQUIREMENT: MURAL DOS NOIVOS (RECADOS & COMENTÁRIOS DE QUEM AJUDOU) */}
          <section className="bg-white dark:bg-stone-900 p-8 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-8" id="mural-section">
            <div className="text-center space-y-1">
              <span className="text-[10px] tracking-widest uppercase font-bold text-amber-700 dark:text-amber-400">
                Mural dos Noivos & Livro de Recados
              </span>
              <h2 className="text-3xl font-serif font-light text-stone-900 dark:text-white">
                Mensagens de Amor & Felicitações
              </h2>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Leia os votos deixados por amigos, familiares e padrinhos que contribuíram e celebraram esta união.
              </p>
            </div>

            {/* Mural Contribution Callout */}
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Gift className="w-5 h-5 text-amber-800 dark:text-amber-300 shrink-0" />
                <div>
                  <strong className="text-amber-950 dark:text-amber-200 block font-serif">Mural dos Noivos & Mensagens de Carinho</strong>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    O envio de recados para o mural fica habilitado mediante contribuição com um presente ou cota. As mensagens aguardam validação no perfil dos noivos antes de serem publicadas.
                  </span>
                </div>
              </div>
              <a
                href="#lista-presentes-section"
                className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Presentear & Deixar Recado</span>
              </a>
            </div>

            {/* Formulário do Mural: Habilitado APENAS após realizar contribuição */}
            {!hasContributedGift ? (
              <div className="p-6 bg-amber-50/80 dark:bg-amber-950/30 border-2 border-dashed border-amber-300 dark:border-amber-800 rounded-3xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center mx-auto shadow-xs">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-base text-amber-950 dark:text-amber-200">
                    Mural Exclusivo para Contribuidores
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300 max-w-lg mx-auto leading-relaxed">
                    A publicação de recados no mural só fica habilitada <strong>após realizar uma contribuição</strong> na Lista de Presentes. Após o envio, a sua mensagem aguarda a validação e aprovação carinhosa no perfil dos noivos antes de surgir no mural!
                  </p>
                </div>
                <a
                  href="#lista-presentes-section"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-800 hover:bg-amber-900 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Gift className="w-4 h-4" />
                  <span>Contribuir na Lista de Presentes para Desbloquear Mural</span>
                </a>
              </div>
            ) : (
              <form onSubmit={handleAddDirectMuralWish} className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-800 rounded-3xl space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Contribuição Confirmada · Envio para o Mural Liberado</span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Escreva sua mensagem aos noivos. Ela será enviada para o perfil dos noivos e aguardará validação antes de ser publicada no mural.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Seu nome"
                    value={newMuralAuthor}
                    onChange={e => setNewMuralAuthor(e.target.value)}
                    className="px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold focus:outline-emerald-700"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Escreva seus votos carinhosos para o casal..."
                    value={newMuralText}
                    onChange={e => setNewMuralText(e.target.value)}
                    className="sm:col-span-2 px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs focus:outline-emerald-700"
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] text-stone-500 pt-1">
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>A mensagem aguardará validação e aprovação no perfil dos noivos</span>
                  </span>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar para Validação dos Noivos</span>
                  </button>
                </div>
              </form>
            )}

            {/* Mural Comments List - Filtered strictly by approved */}
            {((config.muralComments || []).filter(c => c.status === 'approved' || (!c.status && c.author))).length === 0 ? (
              <div className="text-center py-8 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 text-xs text-stone-400">
                Ainda não há mensagens aprovadas no mural. Contribua na lista de presentes acima e envie seus votos para o casal!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(config.muralComments || []).filter(c => c.status === 'approved' || (!c.status && c.author)).map(comment => (
                  <div 
                    key={comment.id}
                    className="p-5 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-100 dark:border-stone-700 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 font-bold flex items-center justify-center text-xs overflow-hidden">
                          {comment.avatarUrl ? (
                            <img src={comment.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            comment.author.charAt(0)
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-stone-900 dark:text-white">{comment.author}</h4>
                          <span className="text-[10px] text-stone-400">{comment.date}</span>
                        </div>
                      </div>

                      {comment.giftName && (
                        <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full text-[9px] font-bold">
                          🎁 {comment.giftName}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-300 font-serif italic leading-relaxed">
                      "{comment.message}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CRITICAL REQUIREMENT: RSVP SECTION ON PAGE */}
          <section className="bg-white dark:bg-stone-900 p-8 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl space-y-6" id="rsvp-section">
            <div className="text-center space-y-1">
              <span className="text-[10px] tracking-widest uppercase font-bold text-rose-800 dark:text-rose-400">
                Confirmação de Presença
              </span>
              <h2 className="text-3xl font-serif font-light text-stone-900 dark:text-white">
                Contamos com Você!
              </h2>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Preencha o formulário abaixo para confirmar sua presença e gerar imediatamente o seu Passe VIP em PDF.
              </p>
            </div>

            <form onSubmit={handleDirectRsvpSubmit} className="space-y-4 max-w-lg mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-rose-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">
                    Sobrenome *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mendes"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-rose-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="Ex: +244 923 000 000"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-rose-800"
                />
              </div>

              {/* COMPANION (DEFAULT 1 COMPANION) */}
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-amber-950 dark:text-amber-200 block">
                      Acompanhante
                    </strong>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      (Por defeito: 1 acompanhante reservado)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hasCompanion} 
                      onChange={e => setHasCompanion(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-800"></div>
                  </label>
                </div>

                {hasCompanion && (
                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 space-y-1 animate-in fade-in">
                    <label className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      <span>Nome Completo do Acompanhante *</span>
                    </label>
                    <input
                      type="text"
                      required={hasCompanion}
                      placeholder="Ex: Maria Fernandes Mendes"
                      value={companionName}
                      onChange={e => setCompanionName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-rose-800"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">
                  Votos ou Mensagem para o Mural dos Noivos
                </label>
                <textarea
                  rows={2}
                  placeholder="Escreva seus parabéns ao casal..."
                  value={guestMessageToCouple}
                  onChange={e => setGuestMessageToCouple(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-rose-800 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                <span>Confirmar Presença & Emitir Convite PDF Oficial</span>
              </button>
            </form>
          </section>

          {/* CRITICAL REQUIREMENT: ÁLBUM PARTILHADO DOS CONVIDADOS (LIBERADO APÓS CONFIRMAR PRESENÇA) */}
          <section className="bg-white dark:bg-stone-900 p-8 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl space-y-8" id="album-partilhado-section">
            <div className="text-center space-y-1">
              <span className="text-[10px] tracking-widest uppercase font-bold text-amber-700 dark:text-amber-400">
                Álbum Partilhado & Coletivo
              </span>
              <h2 className="text-3xl font-serif font-light text-stone-900 dark:text-white">
                Memórias dos Convidados
              </h2>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Partilhe suas fotos da celebração! Quem confirmar presença pode adicionar fotos diretamente ao álbum sem necessidade de aprovação, e reagir às fotos usando seu token de convidado.
              </p>
            </div>

            {/* UPLOAD BOX: CONDITIONAL ON CONFIRMED ATTENDANCE */}
            {!isGuestConfirmed ? (
              <div className="p-6 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-3xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-sm text-amber-950 dark:text-amber-200">
                    Envio de Fotos para o Álbum Bloqueado
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300 max-w-md mx-auto">
                    Apenas convidados com presença confirmada têm acesso para adicionar fotos ao álbum do casamento. Confirme sua presença no formulário acima para liberar o envio imediato!
                  </p>
                </div>
                <a
                  href="#rsvp-section"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirmar Presença Acima</span>
                </a>
              </div>
            ) : (
              <form onSubmit={handleUploadSharedPhoto} className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Presença Confirmada ({currentGuestName}) · Envio Liberado Instantâneo</span>
                  </div>
                  <span className="text-[10px] text-stone-400">Publicação direta sem necessidade de aprovação</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-stone-600 dark:text-stone-300">
                      Fotografia (Arquivo ou Câmera) *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-900 file:text-white hover:file:bg-rose-950 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-stone-600 dark:text-stone-300">
                      Ou Link / URL da Imagem
                    </label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/foto.jpg"
                      value={uploadPhotoUrl.startsWith('data:') ? '' : uploadPhotoUrl}
                      onChange={e => setUploadPhotoUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {uploadPhotoUrl && (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-emerald-300 mx-auto sm:mx-0 shadow-xs">
                    <img src={uploadPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setUploadPhotoUrl('')}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-stone-600 dark:text-stone-300">
                      Nome de Quem Tirou a Foto
                    </label>
                    <input
                      type="text"
                      placeholder={currentGuestName || "Seu nome"}
                      value={uploadPhotoAuthor}
                      onChange={e => setUploadPhotoAuthor(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-stone-600 dark:text-stone-300">
                      Legenda / Momento da Foto
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Brinde com os noivos e padrinhos!"
                      value={uploadPhotoCaption}
                      onChange={e => setUploadPhotoCaption(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Publicar Foto no Álbum dos Noivos</span>
                  </button>
                </div>
              </form>
            )}

            {/* SHARED PHOTOS GRID WITH TOKEN-BASED REACTIONS */}
            {sharedPhotos.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 dark:bg-stone-800/50 rounded-3xl border border-dashed border-stone-200 dark:border-stone-700 space-y-2">
                <Camera className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
                <p className="text-xs text-stone-400">
                  Nenhuma foto compartilhada ainda. Seja o primeiro a registrar este momento especial!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {sharedPhotos.map(photo => {
                  const reactions = photo.reactions || {};
                  return (
                    <div 
                      key={photo.id}
                      className="bg-stone-50 dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div 
                          onClick={() => setSelectedPhoto(photo.imageUrl)}
                          className="aspect-square bg-stone-200 dark:bg-stone-700 cursor-pointer overflow-hidden relative group"
                        >
                          <img 
                            src={photo.imageUrl} 
                            alt={photo.caption || photo.guestName} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => handleImageError(e, 'couple')}
                          />
                        </div>

                        <div className="p-4 space-y-1.5">
                          <div className="flex justify-between items-start text-xs">
                            <strong className="font-bold text-stone-900 dark:text-white line-clamp-1">
                              {photo.guestName}
                            </strong>
                            <span className="text-[10px] text-stone-400 font-mono shrink-0">
                              {photo.timestamp}
                            </span>
                          </div>
                          {photo.caption && (
                            <p className="text-[11px] text-stone-600 dark:text-stone-300 italic font-serif">
                              "{photo.caption}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* EMOJI REACTIONS BAR (TOKEN PROTECTED) */}
                      <div className="p-3 pt-0 border-t border-stone-200/60 dark:border-stone-700/60 mt-2">
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[10px] text-stone-400 font-semibold">Reagir:</span>
                          <div className="flex items-center gap-1.5">
                            {['❤️', '😍', '🥂', '🎉', '👏'].map(emoji => {
                              const list = reactions[emoji] || [];
                              const hasReacted = currentGuestToken && list.includes(currentGuestToken);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleTriggerReaction(photo.id, emoji)}
                                  className={`px-2 py-1 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1 border ${
                                    hasReacted 
                                      ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold scale-105' 
                                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 hover:border-amber-400'
                                  }`}
                                  title={`Reagir com ${emoji}`}
                                >
                                  <span>{emoji}</span>
                                  {list.length > 0 && (
                                    <span className="text-[10px] font-mono text-stone-500">{list.length}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* INLINE TOKEN PROMPT IF USER HAS NO TOKEN SET */}
                        {reactingPhotoId === photo.id && (
                          <div className="mt-2.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2 animate-in fade-in text-xs">
                            <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 uppercase block">
                              Insira seu Token / Código de Convidado para reagir {pendingReactionEmoji}
                            </span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Ex: KTX-AB12 ou seu nome"
                                value={reactionTokenInput}
                                onChange={e => setReactionTokenInput(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-white dark:bg-stone-900 border rounded-xl text-xs font-mono font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => applyReaction(photo.id, pendingReactionEmoji, reactionTokenInput)}
                                className="px-3 py-1.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold cursor-pointer"
                              >
                                Reagir
                              </button>
                              <button
                                type="button"
                                onClick={() => setReactingPhotoId(null)}
                                className="px-2 py-1.5 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      )}

      {/* ========================================================
          CRITICAL MODAL: VALIDATION MESSAGE & INSTANT PDF DOWNLOAD
          ======================================================== */}
      <AnimatePresence>
        {validatedPass && validatedPass.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border-2 border-amber-300 dark:border-amber-700 max-w-lg w-full overflow-hidden my-6 text-center"
            >
              {/* Header Badge */}
              <div className="bg-gradient-to-r from-amber-700 via-rose-900 to-stone-950 p-6 text-white space-y-2 relative">
                <button
                  onClick={() => setValidatedPass(null)}
                  className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-xs">
                  <CheckCircle className="w-8 h-8 text-amber-300" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 block">
                  Presença Validada & Confirmada
                </span>
                <h3 className="font-serif text-2xl font-bold">
                  Passe VIP de Acesso Emitido!
                </h3>
              </div>

              <div className="p-6 space-y-5 text-left text-xs">
                {/* Guest Details Box */}
                <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-3">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Titular do Convite</span>
                    <strong className="text-sm font-serif text-stone-900 dark:text-white">
                      {validatedPass.guest.name}
                    </strong>
                  </div>

                  {validatedPass.guest.companionName && (
                    <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold block">
                        Acompanhante Confirmado
                      </span>
                      <strong className="text-xs text-stone-800 dark:text-stone-200">
                        {validatedPass.guest.companionName}
                      </strong>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 dark:border-stone-700 text-[11px]">
                    <div>
                      <span className="text-stone-400 block">Mesa Reservada</span>
                      <strong className="text-stone-800 dark:text-stone-200 font-mono">
                        {validatedPass.guest.tableNumber || 'Mesa 1'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Código / Token</span>
                      <strong className="text-amber-700 dark:text-amber-400 font-mono">
                        {validatedPass.guest.rsvpToken}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* QR Code display */}
                <div className="text-center space-y-1">
                  <div className="w-32 h-32 bg-white p-2 rounded-2xl border mx-auto flex items-center justify-center shadow-xs">
                    <img 
                      src={qrCodeDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=rsvp:${validatedPass.guest.rsvpToken}`} 
                      alt="QR Code Passe" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[10px] text-stone-400">Apresente este QR Code na portaria da recepção</span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => downloadWeddingPdf(config, validatedPass.guest)}
                    className="w-full py-3.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Convite Oficial em PDF com seus Nomes</span>
                  </button>

                  <button
                    onClick={() => sendInviteViaWhatsApp(config, validatedPass.guest)}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Receber Passe no WhatsApp</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL: CONTRIBUIR PARA PRESENTE & DEIXAR RECADO NO MURAL
          ======================================================== */}
      <AnimatePresence>
        {contributingGift && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full overflow-hidden my-6"
            >
              <div className="bg-stone-950 p-5 text-white flex justify-between items-center border-b border-stone-800">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300">Presentear o Casal</span>
                  <h3 className="font-serif text-base font-bold line-clamp-1">{contributingGift.name}</h3>
                </div>
                <button 
                  onClick={() => setContributingGift(null)}
                  className="text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* Bank Info with 1-click Copy */}
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold uppercase text-amber-900 dark:text-amber-300">
                    Dados para Transferência (MCX / IBAN)
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span>MCX: <strong>{config.giftRegistry?.multicaixaPhone || '+244 923 456 789'}</strong></span>
                    <button 
                      onClick={() => handleCopy(config.giftRegistry?.multicaixaPhone || '+244 923 456 789', 'modal_mcx')}
                      className="text-amber-800 dark:text-amber-300 font-bold underline cursor-pointer"
                    >
                      {copiedBankField === 'modal_mcx' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate pr-2">IBAN: <strong className="font-mono text-[11px]">{config.giftRegistry?.iban || 'AO06 0006 0042 0001 9472 0090 1'}</strong></span>
                    <button 
                      onClick={() => handleCopy(config.giftRegistry?.iban || 'AO06 0006 0042 0001 9472 0090 1', 'modal_iban')}
                      className="text-amber-800 dark:text-amber-300 font-bold underline cursor-pointer shrink-0"
                    >
                      {copiedBankField === 'modal_iban' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300 uppercase text-[10px]">
                    Seu Nome (Quem está a presentear) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dra. Ana e Família"
                    value={contribName}
                    onChange={e => setContribName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300 uppercase text-[10px]">
                    Valor da sua Contribuição (Kwanzas) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={5000}
                    value={contribAmount || ''}
                    onChange={e => setContribAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl font-mono text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300 uppercase text-[10px]">
                    Recado Especial para o Mural dos Noivos
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Deixe seus votos de felicidade que serão exibidos no Mural dos Noivos..."
                    value={contribMuralMessage}
                    onChange={e => setContribMuralMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleConfirmGiftContribution}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar Contribuição & Publicar no Mural</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PHOTO PREVIEW MODAL */}
      <AnimatePresence>
        {selectedPhoto && (
          <div 
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img 
                src={selectedPhoto} 
                alt="Foto Ampliada" 
                className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" 
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL: GERADOR DE QR CODE PARA CONVITES FÍSICOS & GRÁFICA
          ======================================================== */}
      <AnimatePresence>
        {showPhysicalQrModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border-2 border-amber-300/60 dark:border-amber-800 max-w-xl w-full overflow-hidden my-6 text-stone-900 dark:text-stone-100"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-stone-950 via-rose-950 to-stone-900 text-white p-6 relative border-b border-stone-800">
                <button
                  onClick={() => setShowPhysicalQrModal(false)}
                  className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 bg-amber-950/60 border border-amber-400/30 px-3 py-0.5 rounded-full">
                    Impressão Gráfica & Físicos
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-white">
                  QR Code para Convites Físicos
                </h3>
                <p className="text-xs text-stone-300 font-light mt-1">
                  Gere e baixe o QR Code em altíssima resolução para estampar nos seus convites em papel, cartões de mesa, tags ou envelopes.
                </p>
              </div>

              <div className="p-6 space-y-6 text-xs">
                {/* 1. Link Oficial Box */}
                <div className="p-4 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Link Oficial do Convite Interativo</span>
                    </span>
                    <span className="text-[10px] text-stone-400">Acesso livre aos convidados</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteProfileUrl}
                      className="flex-1 px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-800 dark:text-stone-200 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyInviteUrl}
                      className="px-4 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      {copiedInviteUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedInviteUrl ? 'Copiado!' : 'Copiar Link'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleShareInviteWhatsApp}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Partilhar Convite no WhatsApp com Texto Formatado</span>
                  </button>
                </div>

                {/* 2. QR Code Preview with Palette Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div className="text-center space-y-2">
                    <div className="w-52 h-52 bg-white p-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 mx-auto flex items-center justify-center shadow-md">
                      {physicalQrDataUrl ? (
                        <img 
                          src={physicalQrDataUrl} 
                          alt="QR Code Convite" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 border-2 border-rose-800 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono block">
                      Resolução: 1200 x 1200 px (300+ DPI Gráfica)
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase block">
                        Cor do QR Code para Impressão
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: '#1c1917', name: 'Preto Clássico', bg: 'bg-[#1c1917]' },
                          { id: '#78350f', name: 'Ouro Imperial', bg: 'bg-[#78350f]' },
                          { id: '#881337', name: 'Vinho Marsala', bg: 'bg-[#881337]' },
                          { id: '#14532d', name: 'Verde Floresta', bg: 'bg-[#14532d]' }
                        ].map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setPhysicalQrColor(c.id)}
                            className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                              physicalQrColor === c.id
                                ? 'border-rose-800 bg-rose-50/50 dark:bg-rose-950/40 font-bold'
                                : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded-full ${c.bg} shrink-0`} />
                            <span className="text-[11px]">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      {/* Direct PNG download */}
                      <button
                        type="button"
                        onClick={() => downloadQrCodeImage(
                          inviteProfileUrl, 
                          `QRCode_Convite_${groom}_e_${bride}.png`, 
                          1200, 
                          physicalQrColor
                        )}
                        className="w-full py-3 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4 text-amber-300" />
                        <span>Baixar Imagem PNG (Para Gráfica)</span>
                      </button>

                      {/* Printable A6 PDF Card */}
                      <button
                        type="button"
                        onClick={() => downloadPhysicalCardQrPdf(config, inviteProfileUrl)}
                        className="w-full py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border border-stone-200 dark:border-stone-700"
                      >
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span>Baixar Cartão A6 Pronto em PDF</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Dicas Técnicas para a Gráfica */}
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-[11px] text-amber-950 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                    <Info className="w-3.5 h-3.5" />
                    <span>Dicas para a Gráfica e Convite em Papel:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-stone-600 dark:text-stone-400 font-light">
                    <li>O arquivo PNG baixado possui 1200px com margem de segurança e alta taxa de correção de erros (Nível H).</li>
                    <li>Tamanho mínimo recomendado na impressão: <strong>2.5 cm × 2.5 cm</strong> para leitura imediata por qualquer celular (iPhone ou Android).</li>
                    <li>Ideal para imprimir em envelopes, cartões de RSVP, lacres de cera e marcadores de mesa.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMMERCIAL CONVERSION SECTION */}
      <section className="py-14 px-6 bg-gradient-to-b from-[#FAF6EE] to-white dark:from-stone-900 dark:to-stone-950 border-t border-[#E9DEC6]/70 dark:border-stone-800 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-100/30 dark:bg-rose-950/20 rounded-full blur-3xl pointer-events-none -z-0" />
        
        <div className="max-w-xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-stone-800 text-[#9E7A36] dark:text-amber-300 border border-[#E9DEC6] dark:border-amber-900/50 text-[11px] font-semibold tracking-wide shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kutxi · Plataforma de Casamentos</span>
          </div>

          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white leading-tight">
            Também vai casar? Crie o seu convite digital interativo
          </h3>

          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-light leading-relaxed">
            Impressione os seus convidados com confirmação de presença no WhatsApp, lista de presentes virtuais em Kwanzas (AOA), mapa interativo e fotos ao vivo do grande dia.
          </p>

          <div className="p-3 bg-white/80 dark:bg-stone-800/80 rounded-2xl border border-stone-200/80 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300">
            🎁 <strong>Plano Degustação Gratuito:</strong> Crie até <strong>20 convites digitais</strong> sem nenhum custo para experimentar a plataforma.
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToPlans) {
                  onNavigateToPlans();
                } else if (typeof window !== 'undefined') {
                  window.location.href = '/?planos=true';
                }
              }}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-semibold tracking-wider uppercase shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Heart className="w-4 h-4 fill-current text-white" />
              <span>Também Quero Criar o Meu Convite (Começar Grátis)</span>
            </button>
          </div>

          <span className="text-[10px] text-stone-400 block font-light">
            Planos a partir de 0 Kz · Acesso imediato sem cartão de crédito
          </span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 text-center text-xs text-stone-500 border-t border-stone-200 dark:border-stone-800 space-y-2">
        <p className="font-serif text-base text-stone-700 dark:text-stone-300">
          {config.customFooter || `Com amor, sempre. — ${groom} & ${bride}`}
        </p>
        <span className="text-[10px] text-stone-400 font-mono block">
          Kutxi · Plataforma de Convites Digitais & Portaria VIP
        </span>
      </footer>
    </div>
  );
}
