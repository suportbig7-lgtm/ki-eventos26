/**
 * Types for Kutxi - Premium Digital Wedding Invitation & Event Management SaaS
 */

export interface BrideGroomInfo {
  brideName: string;
  brideFullName: string;
  brideBio: string;
  brideParents: string;
  bridePhoto: string;
  groomName: string;
  groomFullName: string;
  groomBio: string;
  groomParents: string;
  groomPhoto: string;
  couplePhoto?: string;
}

export interface WeddingTimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  icon: string;
}

export interface VenueInfo {
  ceremonyName: string; // Igreja / Religiosa
  ceremonyAddress: string;
  ceremonyTime: string;
  ceremonyMapsUrl?: string;
  ceremonyWazeUrl?: string;
  churchName?: string; // Igreja específica
  churchAddress?: string;
  churchTime?: string;
  churchMapsUrl?: string;
  civilName?: string; // Cerimónia Civil / Registo
  civilAddress?: string;
  civilTime?: string;
  civilMapsUrl?: string;
  receptionName: string; // Copo de Água / Festa
  receptionAddress: string;
  receptionTime: string;
  receptionMapsUrl?: string;
  receptionWazeUrl?: string;
  afterPartyName?: string;
  afterPartyAddress?: string;
  afterPartyTime?: string;
  capacity?: number;
  hasParking?: boolean;
  photos?: string[];
}

export interface GiftContributor {
  id: string;
  name: string;
  amount: number;
  date: string;
  avatarUrl?: string;
  message?: string;
  phone?: string;
  proofUrl?: string;
}

export interface WeddingRegistryItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category?: 'eletro' | 'cozinha' | 'lua_de_mel' | 'sala_quarto' | 'experiencias' | 'cotas_dinheiro' | 'outro' | string;
  description?: string;
  claimedBy?: string;
  claimedDate?: string;
  claimedPhone?: string;
  guestMessage?: string;
  guestAvatar?: string;
  contributors?: GiftContributor[];
  totalCollected?: number;
  isQuota?: boolean;
  totalQuotas?: number;
  claimedQuotas?: number;
  paymentStatus?: 'pending' | 'received';
  status?: 'disponivel' | 'reservado' | 'recebido';
}

export interface WeddingGiftInfo {
  pixKey: string;
  pixQrCode: string;
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  bankRecipient: string;
  accountHolder?: string;
  iban?: string;
  multicaixaPhone?: string;
  customInstructions?: string;
  registryItems: WeddingRegistryItem[];
}

export interface WeddingFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface WeddingMediaGallery {
  coverImage: string;
  storyImage: string;
  photos: string[];
}

export interface WeddingAccomTrans {
  accommodationNotes: string;
  transportNotes: string;
  recommendedHotels: { name: string; stars: number; phone: string; link: string }[];
}

export interface WeddingTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  fontHeading: 'serif' | 'display' | 'sans';
  fontBody: 'sans' | 'serif';
  buttonStyle: 'rounded-full' | 'rounded-md' | 'rounded-none';
  glassEffect: boolean;
  spacing: 'compact' | 'relaxed' | 'spacious';
  borderRadius: 'none' | 'md' | 'lg' | 'full';
  bgPattern?: string;
}

export interface TodoItem {
  id: string;
  label: string;
  completed: boolean;
  urgency: 'alta' | 'media' | 'baixa';
}

export interface MuralMessage {
  id: string;
  author: string;
  message: string;
  date: string;
  avatarUrl?: string;
  giftName?: string;
  amountContributed?: number;
  status?: 'pending' | 'approved' | 'rejected';
  guestToken?: string;
}

export interface SharedPhotoReaction {
  emoji: string;
  count: number;
  tokens: string[];
}

export interface SharedPhoto {
  id: string;
  guestName: string;
  guestToken?: string;
  imageUrl: string;
  timestamp: string;
  caption?: string;
  approved?: boolean;
  reactions?: Record<string, string[]>; // emoji -> array of user/guest tokens
}

export interface WeddingConfig {
  id: string;
  slug: string;
  clientId: string;
  todoList?: TodoItem[];
  brideGroom: BrideGroomInfo;
  date: string;
  storyTitle: string;
  storyContent: string;
  timeline: WeddingTimelineEvent[];
  venue: VenueInfo;
  dressCode: {
    title: string;
    description: string;
    colorPalette: string[];
    imageUrl?: string;
  };
  entourage: {
    bridesmaids: string[];
    groomsmen: string[];
  };
  faq: WeddingFaqItem[];
  giftRegistry: WeddingGiftInfo;
  media: WeddingMediaGallery;
  accomTrans: WeddingAccomTrans;
  spotifyPlaylistUrl?: string;
  spotifyUrl?: string;
  youtubeVideoId?: string;
  theme: WeddingTheme;
  customFooter: string;
  pdfUrl?: string;
  isFirstLogin?: boolean;
  contactInfo: {
    phone: string;
    email: string;
  };
  isActive: boolean;
  isNewProfile?: boolean;
  onboardingCompleted?: boolean;
  muralComments?: MuralMessage[];
  updatedAt?: number;
}

export type GuestGroup = 'Family' | 'Friends' | 'VIP' | 'Bride Side' | 'Groom Side' | 'Children' | 'Corporate';

export type GuestStatus = 'Pending' | 'Confirmed' | 'Declined' | 'Awaiting_Approval';

export interface Guest {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  companionName?: string;
  email: string;
  phone: string;
  group: GuestGroup;
  tableNumber: string;
  maxPlusOnes: number;
  plusOnesConfirmed: number;
  status: GuestStatus;
  approvedByCouple?: boolean;
  approvalDate?: string;
  requestedAt?: string;
  dietaryRequirements?: string;
  rsvpToken: string;
  invitationViews: number;
  lastViewedAt?: string;
  confirmedAt?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  notes?: string;
  photoUrl?: string;
  notificationStatus?: 'sent' | 'failed' | 'pending';
  lastNotificationAt?: string;
  updatedAt?: number;
}

export interface ClientFeatures {
  allowWhatsAppAutomation?: boolean;
  allowCollectiveAlbum?: boolean;
  allowGatekeeperPortal?: boolean;
  allowCustomDomain?: boolean;
  allowGiftRegistry?: boolean;
  maxGuests?: number;
}

export interface ClientWeddingSaaS {
  id: string;
  clientName: string;
  clientEmail: string;
  weddingDate: string;
  plan: 'Basic' | 'Premium' | 'Luxury' | 'Enterprise';
  status: 'Active' | 'Trial' | 'Expired' | 'Suspended';
  revenue: number;
  config: WeddingConfig;
  guestCount?: number;
  rsvpsReceived?: number;
  createdAt?: string;
  updatedAt?: number;
  accessRevoked?: boolean;
  isComplimentary?: boolean;
  features?: ClientFeatures;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  ip: string;
  type?: 'system' | 'auth' | 'rsvp' | 'messaging' | 'security';
}

export interface MessagingWebhookConfig {
  webhookUrl: string;
  apiToken: string;
  provider: 'webhook' | 'evolution' | 'zapi' | 'twilio' | 'custom';
  autoSendOnGuestCreated: boolean;
  senderNumber?: string;
  customTemplate?: string;
  twilioAccountSid?: string;
  twilioApiKeySid?: string;
  twilioAuthToken?: string;
  twilioWhatsAppFrom?: string;
  twilioConnected?: boolean;
}

export interface MessagingLog {
  id: string;
  guestId?: string;
  recipientName: string;
  recipientPhone: string;
  rsvpToken: string;
  status: 'success' | 'failed' | 'queued';
  errorDetails?: string;
  timestamp: string;
  provider: string;
  responsePayload?: string;
}

export interface ActivationRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  requestedPlan: 'Basic' | 'Premium' | 'Luxury';
  amount: number;
  paymentMethod: 'mcx' | 'iban' | 'cash';
  paymentReference: string;
  proofUrl?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
}

export interface UserAccount {
  username: string;
  pass: string;
  clientId: string;
  clientName: string;
  role?: 'superadmin' | 'couple' | 'staff';
  email?: string;
  googleId?: string;
}
