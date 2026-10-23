import { WeddingConfig, Guest, ClientWeddingSaaS, SystemAuditLog } from '../types';

export const THEME_PRESETS = [
  {
    id: 'classic-romance',
    name: 'Romance Clássico',
    primaryColor: '#881337', // Rose 900
    secondaryColor: '#fdf2f8', // Rose 50
    accentColor: '#fb7185', // Rose 400
    bgColor: '#fafaf9', // Stone 50
    textColor: '#1c1917', // Stone 900
    fontHeading: 'serif' as const,
    fontBody: 'sans' as const,
    buttonStyle: 'rounded-full' as const,
    glassEffect: true,
    spacing: 'relaxed' as const,
    borderRadius: 'full' as const,
    bgPattern: 'floral',
  },
  {
    id: 'minimal-modern',
    name: 'Mínimo Moderno',
    primaryColor: '#0f172a', // Slate 900
    secondaryColor: '#f8fafc', // Slate 50
    accentColor: '#64748b', // Slate 500
    bgColor: '#ffffff',
    textColor: '#0f172a',
    fontHeading: 'display' as const,
    fontBody: 'sans' as const,
    buttonStyle: 'rounded-none' as const,
    glassEffect: false,
    spacing: 'compact' as const,
    borderRadius: 'none' as const,
    bgPattern: 'minimal',
  },
  {
    id: 'gold-luxury',
    name: 'Ouro Luxuoso',
    primaryColor: '#78350f', // Amber 900
    secondaryColor: '#fffbeb', // Amber 50
    accentColor: '#d97706', // Amber 600
    bgColor: '#fffcf5',
    textColor: '#292524',
    fontHeading: 'serif' as const,
    fontBody: 'serif' as const,
    buttonStyle: 'rounded-md' as const,
    glassEffect: true,
    spacing: 'spacious' as const,
    borderRadius: 'lg' as const,
    bgPattern: 'ornate',
  },
  {
    id: 'forest-boho',
    name: 'Boho Floresta',
    primaryColor: '#14532d', // Green 950
    secondaryColor: '#f0fdf4', // Green 50
    accentColor: '#16a34a', // Green 600
    bgColor: '#fafaf9',
    textColor: '#1c1917',
    fontHeading: 'serif' as const,
    fontBody: 'sans' as const,
    buttonStyle: 'rounded-full' as const,
    glassEffect: true,
    spacing: 'relaxed' as const,
    borderRadius: 'lg' as const,
    bgPattern: 'botanical',
  }
];

export const INITIAL_WEDDING_CONFIG: WeddingConfig = {
  id: 'w_gabriel_sofia',
  slug: 'gabriel-sofia',
  clientId: 'client_1',
  isFirstLogin: false,
  brideGroom: {
    groomName: 'Gabriel',
    groomFullName: 'Gabriel Pureza dos Santos',
    groomBio: 'Apaixonado pelo mar de Luanda e por construir uma vida repleta de cumplicidade e honra ao lado da Sofia.',
    groomParents: 'Sr. Manuel dos Santos & Sra. Rosa dos Santos',
    groomPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
    brideName: 'Sofia',
    brideFullName: 'Sofia Kiala de Oliveira',
    brideBio: 'Arquiteta de interiores com paixão por arte, design e momentos inesquecíveis em família.',
    brideParents: 'Sr. Alberto de Oliveira & Sra. Teresa de Oliveira',
    bridePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    couplePhoto: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200',
  },
  date: '2026-10-25T16:00:00',
  storyTitle: 'Nossa História de Amor',
  storyContent: 'Nos conhecemos num fim de tarde na Baía de Luanda. Três anos de cumplicidade, viagens e sonhos compartilhados nos trouxeram até este dia abençoado, onde celebramos nossa união diante de Deus e de todos vocês.',
  timeline: [
    {
      id: 't1',
      time: '10:30',
      title: 'Cerimónia Civil (Registo)',
      description: 'Celebração civil na Conservatória do Registo Civil com os familiares e testemunhas.',
      icon: 'FileText',
    },
    {
      id: 't2',
      time: '16:00',
      title: 'Cerimónia Religiosa (Igreja)',
      description: 'Bênção matrimonial solene e troca de alianças na Igreja Nossa Senhora do Carmo.',
      icon: 'Heart',
    },
    {
      id: 't3',
      time: '18:00',
      title: 'Copo de Água & Recepção',
      description: 'Coquetel de boas-vindas, banquete nupcial gastronómico e brinde dos noivos.',
      icon: 'Utensils',
    },
    {
      id: 't4',
      time: '21:30',
      title: 'Corte do Bolo & Festa',
      description: 'Primeira dança dos noivos e abertura oficial da pista de dança com DJ.',
      icon: 'Music',
    }
  ],
  venue: {
    // Cerimónia Religiosa / Igreja
    ceremonyName: 'Igreja Nossa Senhora do Carmo',
    ceremonyAddress: 'Largo do Carmo, Ingombota, Luanda, Angola',
    ceremonyTime: '25 de Outubro de 2026, às 16:00h',
    ceremonyMapsUrl: 'https://maps.google.com/?q=Igreja+do+Carmo+Luanda+Angola',
    ceremonyWazeUrl: 'https://waze.com/ul?q=Igreja+do+Carmo+Luanda+Angola',
    churchName: 'Igreja Nossa Senhora do Carmo (Cerimónia Religiosa)',
    churchAddress: 'Largo do Carmo, Ingombota, Luanda, Angola',
    churchTime: 'Sábado, 25 de Outubro de 2026 às 16:00h',
    churchMapsUrl: 'https://maps.google.com/?q=Igreja+do+Carmo+Luanda+Angola',
    
    // Cerimónia Civil
    civilName: 'Conservatória do Registo Civil de Luanda',
    civilAddress: 'Rua Rainha Ginga, Ingombota, Luanda, Angola',
    civilTime: 'Sexta-feira, 24 de Outubro de 2026 às 10:30h',
    civilMapsUrl: 'https://maps.google.com/?q=Conservatoria+Registo+Civil+Luanda',
    
    // Copo de Água / Recepção
    receptionName: 'Espaço Jardins da Welwitschia (Copo de Água & Festa)',
    receptionAddress: 'Via AL 15, Condomínio Welwitschia, Talatona, Luanda, Angola',
    receptionTime: 'Sábado, 25 de Outubro de 2026 a partir das 18:00h',
    receptionMapsUrl: 'https://maps.google.com/?q=Talatona+Luanda+Angola',
    receptionWazeUrl: 'https://waze.com/ul?q=Talatona+Luanda+Angola',
    afterPartyName: 'Sunset Lounge Privativo',
    afterPartyAddress: 'Talatona, Luanda, Angola',
    afterPartyTime: '23:30h - Até ao amanhecer',
    capacity: 250,
    hasParking: true,
    photos: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800'
    ]
  },
  dressCode: {
    title: 'Esporte Fino Elegante & Tons Terrosos Nobres',
    description: 'Convidamos carinhosamente os nossos convidados a vestirem trajes de estilo esporte fino ou formal dentro da nossa paleta de cores harmoniosa.',
    colorPalette: ['#5C4033', '#C19A6B', '#E5A93B', '#8F9779', '#D2B48C'],
  },
  entourage: {
    bridesmaids: ['Dra. Isabella Kiala (Madrinha de Honra)', 'Cláudia dos Santos'],
    groomsmen: ['Eng. Lucas Vance (Padrinho de Honra)', 'Arthur Jenkins']
  },
  faq: [
    {
      id: 'f1',
      question: 'Qual é a data limite para confirmar presença (RSVP)?',
      answer: 'Por favor, confirme a sua presença até 10 dias antes da cerimónia pelo site para organizarmos a sua mesa e os assentos com a equipa de recepção.'
    },
    {
      id: 'f2',
      question: 'Como funciona a entrada na portaria?',
      answer: 'Ao confirmar a presença no site, você terá acesso imediato ao seu Passe Digital com QR Code. Basta apresentá-lo na tela do celular na entrada para validação instantânea.'
    },
    {
      id: 'f3',
      question: 'Existe estacionamento seguro no local da festa?',
      answer: 'Sim, haverá serviço gratuito de valet parking e segurança privada reforçada na entrada principal do Espaço Welwitschia em Talatona.'
    }
  ],
  giftRegistry: {
    pixKey: '+244 923 456 789',
    pixQrCode: '',
    bankName: 'BFA — Banco de Fomento Angola',
    bankAgency: 'Agência Talatona (0042)',
    bankAccount: 'AO06 0006 0042 0001 9472 0090 1',
    iban: 'AO06 0006 0042 0001 9472 0090 1',
    multicaixaPhone: '+244 923 456 789',
    bankRecipient: 'Gabriel dos Santos & Sofia de Oliveira',
    accountHolder: 'Gabriel & Sofia',
    customInstructions: 'As contribuições podem ser efetuadas via Multicaixa Express (MCX) ou transferência por IBAN bancário angolano. Agradecemos do fundo do coração!',
    registryItems: [
      {
        id: 'g_1',
        name: 'Cota de Lua de Mel: Passeio de Lancha no Mussulo',
        price: 85000,
        totalCollected: 85000,
        category: 'lua_de_mel',
        description: 'Passeio romântico de lancha privativa pelas águas do Mussulo.',
        imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=400',
        status: 'recebido',
        claimedBy: 'Madrinha Isabella',
        claimedDate: '12/10/2026',
        guestMessage: 'Desejo que a lua de mel seja um sonho inesquecível! Todo amor do mundo para vocês.',
        contributors: [
          {
            id: 'c_1',
            name: 'Madrinha Isabella',
            amount: 85000,
            date: '12/10/2026',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
            message: 'Desejo que a lua de mel seja um sonho inesquecível! Todo amor do mundo para vocês.'
          }
        ]
      },
      {
        id: 'g_2',
        name: 'Máquina de Café Espresso Automática DeLonghi',
        price: 340000,
        totalCollected: 220000,
        category: 'eletro',
        description: 'Para cafés especiais e manhãs cheias de energia no novo lar.',
        imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400',
        status: 'disponivel',
        contributors: [
          {
            id: 'c_2',
            name: 'Padrinho Lucas Vance',
            amount: 120000,
            date: '13/10/2026',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
            message: 'Parabéns ao lindo casal! Já estou ansioso pelo café na casa nova.'
          },
          {
            id: 'c_3',
            name: 'Tia Eleonora',
            amount: 100000,
            date: '14/10/2026',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
            message: 'Que Deus derrame bênçãos sem medida sobre essa união sagrada.'
          }
        ]
      },
      {
        id: 'g_3',
        name: 'Aparelho de Jantar Porcelana Fina (12 Lugares)',
        price: 380000,
        totalCollected: 190000,
        category: 'cozinha',
        description: 'Conjunto completo para jantares de celebração com os amigos e familiares.',
        imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=400',
        status: 'disponivel',
        contributors: [
          {
            id: 'c_4',
            name: 'Família Mendonça',
            amount: 190000,
            date: '14/10/2026',
            message: 'Com carinho e admiração pela família que vocês estão construindo!'
          }
        ]
      },
      {
        id: 'g_4',
        name: 'Jogo de Panelas Cerâmica Antiaderente Le Creuset',
        price: 310000,
        totalCollected: 0,
        category: 'cozinha',
        description: 'Conjunto durável com caçarolas e frigideiras de alta performance gastronómica.',
        imageUrl: 'https://images.unsplash.com/photo-1584990347449-a29283f3e1b1?auto=format&fit=crop&q=80&w=400',
        status: 'disponivel',
        contributors: []
      }
    ]
  },
  media: {
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1600',
    storyImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
    photos: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1519225495810-7517ccd358ee?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800'
    ]
  },
  accomTrans: {
    accommodationNotes: 'Para os convidados e familiares que chegam de outras províncias ou do exterior, negociamos tarifas exclusivas nos hotéis parceiros em Talatona.',
    transportNotes: 'Serviço de valet parking no local e transfer disponível.',
    recommendedHotels: [
      { name: 'Hotel de Convenções Talatona (HCTA)', stars: 5, phone: '+244 226 424 000', link: 'https://maps.google.com' }
    ]
  },
  spotifyPlaylistUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX50mN7fI63vX',
  theme: THEME_PRESETS[0],
  customFooter: 'Com amor, sempre. — Gabriel & Sofia',
  contactInfo: {
    phone: '+244 923 456 789',
    email: 'casamento@gabrielesofia.ao',
  },
  isActive: true,
  todoList: [
    { id: 'td1', label: 'Cerimónia Civil (Registo) na Conservatória', completed: true, urgency: 'alta' },
    { id: 'td2', label: 'Cerimónia Religiosa na Igreja do Carmo', completed: true, urgency: 'alta' },
    { id: 'td3', label: 'Copo de Água & Salão Welwitschia', completed: true, urgency: 'alta' },
    { id: 'td4', label: 'Habilitação da Lista de Presentes Multicaixa', completed: true, urgency: 'media' },
    { id: 'td5', label: 'Disparo de Convites e Portaria Digital', completed: false, urgency: 'alta' },
  ],
  muralComments: [
    {
      id: 'm1',
      author: 'Madrinha Isabella Kiala',
      message: 'Meus queridos noivos, que alegria imensa ver essa união se concretizar! A lua de mel no Mussulo será inesquecível. Amo vocês!',
      date: '14 de Outubro de 2026',
      giftName: 'Passeio de Lancha no Mussulo',
      amountContributed: 85000,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
    },
    {
      id: 'm2',
      author: 'Padrinho Lucas Vance',
      message: 'Parabéns Gabriel e Sofia! A máquina de café já está garantida para nos receberem em grande estilo. Felicidades eternas!',
      date: '14 de Outubro de 2026',
      giftName: 'Máquina de Café Espresso DeLonghi',
      amountContributed: 120000,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150'
    },
    {
      id: 'm3',
      author: 'Tia Eleonora & Tio Jorge',
      message: 'Que Deus abençoe ricamente a aliança de vocês no altar da Igreja do Carmo e nesta nova linda família que se inicia.',
      date: '13 de Outubro de 2026',
      giftName: 'Máquina de Café Espresso DeLonghi',
      amountContributed: 100000,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
    }
  ]
};

export const INITIAL_GUESTS: Guest[] = [];

export const INITIAL_CLIENTS: ClientWeddingSaaS[] = [];

export const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [
  {
    id: 'l_init_1',
    timestamp: new Date().toISOString(),
    actor: 'Sistema Kutxi',
    action: 'Plataforma Inicializada',
    details: 'Configurações de casamento carregadas.',
    ip: '127.0.0.1',
    type: 'system'
  }
];

/**
 * Creates a completely blank, virgin wedding configuration for new client profiles.
 * Ensures NO demo data (Gabriel & Sofia, fake guests, demo story or photos) leaks into the new profile.
 */
export function createBlankWeddingConfig(clientId: string, brideName = '', groomName = ''): WeddingConfig {
  const cleanId = clientId.replace(/[^a-zA-Z0-9_-]/g, '');
  return {
    id: 'w_' + cleanId,
    slug: cleanId.toLowerCase(),
    clientId: cleanId,
    isNewProfile: true,
    onboardingCompleted: false,
    brideGroom: {
      brideName: brideName.trim(),
      brideFullName: brideName.trim(),
      brideBio: '',
      brideParents: '',
      groomName: groomName.trim(),
      groomFullName: groomName.trim(),
      groomBio: '',
      groomParents: '',
      bridePhoto: '',
      groomPhoto: '',
      couplePhoto: '',
    },
    date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    storyTitle: '',
    storyContent: '',
    timeline: [],
    venue: {
      ceremonyName: '',
      ceremonyAddress: '',
      ceremonyTime: '16:00',
      churchName: '',
      churchAddress: '',
      churchTime: '16:00',
      civilName: '',
      civilAddress: '',
      civilTime: '10:30',
      receptionName: '',
      receptionAddress: '',
      receptionTime: '18:00',
      receptionMapsUrl: '',
    },
    dressCode: {
      title: 'Formal / Passeio Completo',
      description: 'Pedimos aos convidados o uso de traje social elegante.',
      colorPalette: ['#1c1917', '#881337', '#b48e46'],
    },
    entourage: {
      bridesmaids: [],
      groomsmen: [],
    },
    faq: [],
    giftRegistry: {
      pixKey: '',
      pixQrCode: '',
      bankName: 'BFA / BAI',
      bankAgency: '',
      bankAccount: '',
      bankRecipient: '',
      iban: '',
      multicaixaPhone: '',
      registryItems: [],
    },
    media: {
      coverImage: '',
      storyImage: '',
      photos: [],
    },
    accomTrans: {
      accommodationNotes: '',
      transportNotes: '',
      recommendedHotels: [],
    },
    theme: THEME_PRESETS[0],
    customFooter: brideName && groomName ? `Com amor, sempre. — ${groomName} & ${brideName}` : 'Com amor, sempre.',
    contactInfo: {
      phone: '',
      email: '',
    },
    isActive: true,
    todoList: [
      { id: 'td1', label: 'Preencher Dados dos Noivos & Igreja', completed: false, urgency: 'alta' },
      { id: 'td2', label: 'Adicionar Lista de Convidados', completed: false, urgency: 'alta' },
      { id: 'td3', label: 'Configurar Multicaixa Express / IBAN de Presentes', completed: false, urgency: 'media' },
    ],
    muralComments: [],
  };
}
