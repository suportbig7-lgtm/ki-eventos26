import { WeddingConfig, Guest, ClientWeddingSaaS, SystemAuditLog, UserAccount } from '../types';

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

export const CONFIG_JOAO_ALICE: WeddingConfig = {
  id: 'client_joao_alice',
  slug: 'joao-alice',
  clientId: 'client_joao_alice',
  isFirstLogin: false,
  isNewProfile: false,
  onboardingCompleted: true,
  brideGroom: {
    groomName: 'João',
    groomFullName: 'João dos Santos',
    groomBio: 'Apaixonado pela vida e grato por celebrar este momento tão especial ao lado da Alice.',
    groomParents: 'Sr. Mateus dos Santos & Sra. Helena dos Santos',
    groomPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
    brideName: 'Alice',
    brideFullName: 'Alice de Oliveira',
    brideBio: 'Com o coração transbordando de gratidão e amor por iniciar este lindo capítulo ao lado do João.',
    brideParents: 'Sr. Domingos de Oliveira & Sra. Maria de Oliveira',
    bridePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
    couplePhoto: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200',
  },
  date: '2026-11-14T16:00:00',
  storyTitle: 'Nossa História de Amor',
  storyContent: 'Nos conhecemos num fim de tarde na Baía de Luanda. O que começou como uma conversa leve logo se transformou numa parceria inseparável de cumplicidade, viagens e sonhos compartilhados. Hoje celebramos nossa união com quem mais amamos.',
  timeline: [
    {
      id: 't1_ja',
      time: '10:30',
      title: 'Cerimónia Civil (Registo)',
      description: 'Assinatura oficial na Conservatória do Registo Civil com os padrinhos e testemunhas.',
      icon: 'FileText'
    },
    {
      id: 't2_ja',
      time: '15:30',
      title: 'Celebração Religiosa',
      description: 'Bênção nupcial na Sé Catedral de Luanda.',
      icon: 'Heart'
    },
    {
      id: 't3_ja',
      time: '18:00',
      title: 'Copo de Água & Recepção',
      description: 'Jantar de gala, brinde aos noivos e corte do bolo no Espaço Jardins de Talatona.',
      icon: 'UtensilsCrossed'
    },
    {
      id: 't4_ja',
      time: '21:30',
      title: 'Abertura da Pista & Festa',
      description: 'Música, celebração e momentos inesquecíveis.',
      icon: 'Music'
    }
  ],
  venue: {
    ceremonyName: 'Sé Catedral de Luanda',
    ceremonyAddress: 'Largo da Sé, Cidade Alta, Luanda',
    ceremonyTime: '15:30',
    churchName: 'Sé Catedral de Luanda',
    churchAddress: 'Largo da Sé, Cidade Alta, Luanda',
    churchTime: '15:30',
    civilName: 'Conservatória do Registo Civil',
    civilAddress: 'Luanda, Angola',
    civilTime: '10:30',
    receptionName: 'Espaço de Eventos Jardins de Talatona',
    receptionAddress: 'Via AL 15, Talatona, Luanda',
    receptionTime: '18:00',
    receptionMapsUrl: 'https://maps.google.com'
  },
  dressCode: {
    title: 'Passeio Completo / Traje a Rigor & Tradicional Gala',
    description: 'Solicitamos aos nossos estimados convidados trajes elegantes para honrar esta celebração.',
    colorPalette: ['#881337', '#1c1917', '#b48e46']
  },
  entourage: {
    bridesmaids: ['Dra. Carmen dos Santos', 'Sofia Kiala', 'Isabella Mendonça'],
    groomsmen: ['Eng. Marcos Silva', 'Lucas Vance', 'Dr. Manuel Neto']
  },
  faq: [
    { id: 'f1', question: 'Qual é o horário recomendado de chegada?', answer: 'Recomendamos que todos cheguem à Sé Catedral com 30 minutos de antecedência (às 15:00).' },
    { id: 'f2', question: 'Há estacionamento no local da recepção?', answer: 'Sim, o Espaço Jardins de Talatona dispõe de estacionamento privado e serviço de valet parking gratuito.' }
  ],
  giftRegistry: {
    pixKey: '',
    pixQrCode: '',
    bankName: 'Banco BAI / BFA',
    bankAgency: '0040',
    bankAccount: '123456789',
    bankRecipient: 'João dos Santos & Alice de Oliveira',
    iban: 'AO06 0040 0000 1234 5678 9012 3',
    multicaixaPhone: '+244 923 888 777',
    registryItems: [
      {
        id: 'g_ja_1',
        name: 'Jogo de Jantar Porcelana Vista Alegre (12 Pessoas)',
        price: 280000,
        totalCollected: 140000,
        category: 'mesa',
        description: 'Conjunto completo de porcelana fina para os jantares de celebração com os amigos e família.',
        imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=400',
        status: 'disponivel',
        contributors: []
      },
      {
        id: 'g_ja_2',
        name: 'Cota Lua de Mel no Mussulo & Benguela',
        price: 350000,
        totalCollected: 200000,
        category: 'viagem',
        description: 'Experiência inesquecível de descanso e celebração à beira-mar.',
        imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=400',
        status: 'disponivel',
        contributors: []
      },
      {
        id: 'g_ja_3',
        name: 'Máquina de Café Espresso Automática DeLonghi',
        price: 195000,
        totalCollected: 195000,
        category: 'eletro',
        description: 'Para nos receberem sempre com um café de excelência.',
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400',
        status: 'recebido',
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
      'https://images.unsplash.com/photo-1519225495810-7517ccd358ee?auto=format&fit=crop&q=80&w=800'
    ]
  },
  accomTrans: {
    accommodationNotes: 'Tarifas corporativas exclusivas no Hotel de Convenções de Talatona.',
    transportNotes: 'Serviço de valet parking no local e transfer exclusivo para convidados.',
    recommendedHotels: [
      { name: 'Hotel Talatona HCTA', stars: 5, phone: '+244 226 424 000', link: 'https://maps.google.com' }
    ]
  },
  spotifyPlaylistUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX50mN7fI63vX',
  theme: THEME_PRESETS[0],
  customFooter: 'Com amor, sempre. — João & Alice',
  contactInfo: {
    phone: '+244 923 888 777',
    email: 'jhonkutxi@gmail.com'
  },
  isActive: true,
  todoList: [
    { id: 'td1', label: 'Cerimónia Civil (Registo) na Conservatória', completed: true, urgency: 'alta' },
    { id: 'td2', label: 'Celebração Religiosa na Sé Catedral', completed: true, urgency: 'alta' },
    { id: 'td3', label: 'Copo de Água & Salão Talatona', completed: true, urgency: 'alta' }
  ],
  muralComments: [
    {
      id: 'm1_ja',
      author: 'Madrinha Sofia',
      message: 'João e Alice, meus grandes amigos! Que alegria ver essa união tão abençoada. Toda a felicidade do mundo!',
      date: '14 de Outubro de 2026',
      giftName: 'Máquina de Café Espresso',
      amountContributed: 95000,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
      status: 'approved'
    }
  ]
};

export const CONFIG_PEDRO_PUREZA: WeddingConfig = {
  id: 'client_pedro_pureza',
  slug: 'pedro-pureza',
  clientId: 'client_pedro_pureza',
  isFirstLogin: false,
  isNewProfile: false,
  onboardingCompleted: true,
  brideGroom: {
    groomName: 'Pedro',
    groomFullName: 'Pedro Miguel',
    groomBio: 'Um coração apaixonado e grato por construir uma linda família ao lado da Pureza.',
    groomParents: 'Sr. António Miguel & Sra. Joana Miguel',
    groomPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
    brideName: 'Pureza',
    brideFullName: 'Pureza Kiala',
    brideBio: 'Vivendo a realização de um sonho de amor, respeito e cumplicidade com o Pedro.',
    brideParents: 'Sr. Bernardo Kiala & Sra. Rosa Kiala',
    bridePhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
    couplePhoto: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=1200',
  },
  date: '2027-04-22T15:00:00',
  storyTitle: 'Nossa História de Amor',
  storyContent: 'Uma linda amizade que floresceu com os anos e se tornou um amor inabalável. Convidamos você para celebrar conosco este grande dia!',
  timeline: [
    { id: 't1_pp', time: '11:00', title: 'Registo Civil', description: 'Assinatura civil oficial.', icon: 'FileText' },
    { id: 't2_pp', time: '15:00', title: 'Bênção Matrimonial', description: 'Cerimônia na Paróquia Sagrada Família.', icon: 'Heart' },
    { id: 't3_pp', time: '17:30', title: 'Recepção dos Convidados', description: 'Brinde e jantar no Salão Luanda Miramar.', icon: 'UtensilsCrossed' }
  ],
  venue: {
    ceremonyName: 'Paróquia Sagrada Família',
    ceremonyAddress: 'Av. Deolinda Rodrigues, Luanda',
    ceremonyTime: '15:00',
    churchName: 'Paróquia Sagrada Família',
    churchAddress: 'Av. Deolinda Rodrigues, Luanda',
    churchTime: '15:00',
    civilName: 'Conservatória do Registo Civil',
    civilAddress: 'Luanda, Angola',
    civilTime: '11:00',
    receptionName: 'Salão Luanda Miramar',
    receptionAddress: 'Miramar, Luanda',
    receptionTime: '17:30',
    receptionMapsUrl: 'https://maps.google.com'
  },
  dressCode: {
    title: 'Formal / Traje de Festa',
    description: 'Traje formal para todos os convidados.',
    colorPalette: ['#0f172a', '#78350f', '#fb7185']
  },
  entourage: {
    bridesmaids: ['Teresa Kiala', 'Ana Miguel'],
    groomsmen: ['Carlos Miguel', 'José Silva']
  },
  faq: [],
  giftRegistry: {
    pixKey: '',
    pixQrCode: '',
    bankName: 'Banco BFA / BAI',
    bankAgency: '0006',
    bankAccount: '987654321',
    bankRecipient: 'Pedro Miguel & Pureza Kiala',
    iban: 'AO06 0006 0000 9876 5432 1012 4',
    multicaixaPhone: '+244 923 111 222',
    registryItems: [
      {
        id: 'g_pp_1',
        name: 'Conjunto de Eletrodomésticos Cozinha',
        price: 220000,
        totalCollected: 50000,
        category: 'eletro',
        description: 'Eletroportáteis para o lar.',
        imageUrl: 'https://images.unsplash.com/photo-1584990347449-a29283f3e1b1?auto=format&fit=crop&q=80&w=400',
        status: 'disponivel',
        contributors: []
      }
    ]
  },
  media: {
    coverImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=1600',
    storyImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    photos: [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800'
    ]
  },
  accomTrans: {
    accommodationNotes: 'Hotéis próximos em Miramar e Ingombota.',
    transportNotes: 'Estacionamento livre no local.',
    recommendedHotels: []
  },
  theme: THEME_PRESETS[1],
  customFooter: 'Com amor, sempre. — Pedro & Pureza',
  contactInfo: {
    phone: '+244 923 111 222',
    email: 'suportbig7@gmail.com'
  },
  isActive: true,
  todoList: [],
  muralComments: []
};

export const CONFIG_OSVALDO_NICIDIA: WeddingConfig = {
  id: 'client_osvaldo_nicidia',
  slug: 'osvaldo-nicidia',
  clientId: 'client_osvaldo_nicidia',
  isFirstLogin: false,
  isNewProfile: false,
  onboardingCompleted: true,
  brideGroom: {
    groomName: 'Osvaldo',
    groomFullName: 'Osvaldo Vagabo',
    groomBio: 'O homem mais feliz por ter encontrado na Nicidia a sua eterna companheira e parceira de vida.',
    groomParents: 'Sr. Gaspar Vagabo & Sra. Maria Vagabo',
    groomPhoto: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800',
    brideName: 'Nicidia',
    brideFullName: 'Nicidia Manuel',
    brideBio: 'Com imenso amor no coração e a bênção de Deus para o nosso matrimônio.',
    brideParents: 'Sr. Pedro Manuel & Sra. Esperança Manuel',
    bridePhoto: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800',
    couplePhoto: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=1200',
  },
  date: '2027-07-25T16:00:00',
  storyTitle: 'Nossa História de Amor',
  storyContent: 'O destino uniu nossos caminhos sob a luz de Luanda. Hoje damos o passo mais importante das nossas vidas rumo à eternidade.',
  timeline: [
    { id: 't1_on', time: '10:00', title: 'Registo Civil', description: 'Celebração civil na Conservatória.', icon: 'FileText' },
    { id: 't2_on', time: '16:00', title: 'Celebração Religiosa', description: 'Bênção das alianças na Igreja da Sagrada Família.', icon: 'Heart' },
    { id: 't3_on', time: '18:30', title: 'Banquete & Recepção', description: 'Jantar de gala no Centro de Convenções de Talatona.', icon: 'UtensilsCrossed' }
  ],
  venue: {
    ceremonyName: 'Igreja da Sagrada Família',
    ceremonyAddress: 'Luanda, Angola',
    ceremonyTime: '16:00',
    churchName: 'Igreja da Sagrada Família',
    churchAddress: 'Luanda, Angola',
    churchTime: '16:00',
    civilName: 'Conservatória do Registo Civil',
    civilAddress: 'Luanda, Angola',
    civilTime: '10:00',
    receptionName: 'Centro de Convenções de Talatona',
    receptionAddress: 'Talatona, Luanda',
    receptionTime: '18:30',
    receptionMapsUrl: 'https://maps.google.com'
  },
  dressCode: {
    title: 'Gala & Black Tie',
    description: 'Vestimenta de gala ou traje tradicional solene.',
    colorPalette: ['#14532d', '#78350f', '#fafaf9']
  },
  entourage: {
    bridesmaids: ['Beatriz Manuel', 'Rosa Vagabo'],
    groomsmen: ['Filipe Vagabo', 'Mateus Manuel']
  },
  faq: [],
  giftRegistry: {
    pixKey: '',
    pixQrCode: '',
    bankName: 'Banco BAI / Sol',
    bankAgency: '0055',
    bankAccount: '456789012',
    bankRecipient: 'Osvaldo Vagabo & Nicidia Manuel',
    iban: 'AO06 0055 0000 4567 8901 2345 6',
    multicaixaPhone: '+244 923 555 666',
    registryItems: [
      {
        id: 'g_on_1',
        name: 'Conjunto Faqueiro Dourado de Luxo (72 Peças)',
        price: 240000,
        totalCollected: 120000,
        category: 'mesa',
        description: 'Faqueiro de gala em aço inox com acabamento dourado.',
        imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400',
        status: 'disponivel',
        contributors: []
      }
    ]
  },
  media: {
    coverImage: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=1600',
    storyImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    photos: [
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800'
    ]
  },
  accomTrans: {
    accommodationNotes: 'Hospedagem sugerida em Talatona.',
    transportNotes: 'Serviço de valet parking no local.',
    recommendedHotels: []
  },
  theme: THEME_PRESETS[3],
  customFooter: 'Com amor, sempre. — Osvaldo & Nicidia',
  contactInfo: {
    phone: '+244 923 555 666',
    email: 'osvaldovagabo@gmail.com'
  },
  isActive: true,
  todoList: [],
  muralComments: []
};

export const INITIAL_GUESTS: Guest[] = [];

export const INITIAL_CLIENTS: ClientWeddingSaaS[] = [
  {
    id: 'client_osvaldo_nicidia',
    clientName: 'OSvlado & Nicidia',
    clientEmail: 'osvaldovagabo@gmail.com',
    weddingDate: '2027-07-25',
    plan: 'Luxury',
    status: 'Active',
    revenue: 110000,
    config: CONFIG_OSVALDO_NICIDIA,
    guestCount: 120,
    rsvpsReceived: 85,
    createdAt: '2026-10-20',
    features: {
      maxGuests: 9999,
      allowWhatsAppAutomation: true,
      allowCollectiveAlbum: true,
      allowGatekeeperPortal: true
    }
  },
  {
    id: 'client_pedro_pureza',
    clientName: 'Pedro & Pureza',
    clientEmail: 'suportbig7@gmail.com',
    weddingDate: '2027-04-22',
    plan: 'Basic',
    status: 'Active',
    revenue: 35000,
    config: CONFIG_PEDRO_PUREZA,
    guestCount: 65,
    rsvpsReceived: 42,
    createdAt: '2026-10-21',
    features: {
      maxGuests: 150,
      allowWhatsAppAutomation: false,
      allowCollectiveAlbum: false,
      allowGatekeeperPortal: false
    }
  },
  {
    id: 'client_joao_alice',
    clientName: 'João & Alice',
    clientEmail: 'jhonkutxi@gmail.com',
    weddingDate: '2026-11-14',
    plan: 'Luxury',
    status: 'Active',
    revenue: 110000,
    config: CONFIG_JOAO_ALICE,
    guestCount: 180,
    rsvpsReceived: 140,
    createdAt: '2026-10-22',
    features: {
      maxGuests: 9999,
      allowWhatsAppAutomation: true,
      allowCollectiveAlbum: true,
      allowGatekeeperPortal: true
    }
  }
];

export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    username: 'superadmin',
    pass: 'admin123',
    clientId: 'system',
    clientName: 'Super Administrador',
    role: 'superadmin'
  },
  {
    username: 'ki-eventos',
    pass: 'kieventos123',
    clientId: 'system',
    clientName: 'Super Administrador (Ki-Eventos)',
    role: 'superadmin'
  },
  {
    username: 'noiva.novo',
    pass: 'vows.496',
    clientId: 'client_osvaldo_nicidia',
    clientName: 'OSvlado & Nicidia',
    role: 'couple',
    email: 'osvaldovagabo@gmail.com'
  },
  {
    username: 'noivo.osvaldo',
    pass: 'vows.496',
    clientId: 'client_osvaldo_nicidia',
    clientName: 'OSvlado & Nicidia',
    role: 'couple',
    email: 'osvaldovagabo@gmail.com'
  },
  {
    username: 'google_suportbig7',
    pass: 'google_session',
    clientId: 'client_pedro_pureza',
    clientName: 'Pedro & Pureza',
    role: 'couple',
    email: 'suportbig7@gmail.com',
    googleId: 'google_suportbig7'
  },
  {
    username: 'noivo.pedro',
    pass: 'vows.2027',
    clientId: 'client_pedro_pureza',
    clientName: 'Pedro & Pureza',
    role: 'couple',
    email: 'suportbig7@gmail.com'
  },
  {
    username: 'noivo.joão',
    pass: 'vows.2026',
    clientId: 'client_joao_alice',
    clientName: 'João & Alice',
    role: 'couple',
    email: 'jhonkutxi@gmail.com'
  },
  {
    username: 'noiva.alice',
    pass: 'vows.2026',
    clientId: 'client_joao_alice',
    clientName: 'João & Alice',
    role: 'couple',
    email: 'jhonkutxi@gmail.com'
  }
];

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
export function createBlankWeddingConfig(clientId: string, groomName = '', brideName = ''): WeddingConfig {
  const cleanId = clientId.replace(/[^a-zA-Z0-9_-]/g, '');
  return {
    id: 'w_' + cleanId,
    slug: cleanId.toLowerCase(),
    clientId: cleanId,
    isNewProfile: true,
    onboardingCompleted: false,
    brideGroom: {
      groomName: groomName.trim(),
      groomFullName: groomName.trim(),
      groomBio: '',
      groomParents: '',
      brideName: brideName.trim(),
      brideFullName: brideName.trim(),
      brideBio: '',
      brideParents: '',
      groomPhoto: '',
      bridePhoto: '',
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
    customFooter: groomName && brideName ? `Com amor, sempre. — ${groomName} & ${brideName}` : 'Com amor, sempre.',
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

export interface SaaSPlanConfig {
  id: string;
  name: string;
  price: number;
  period: string;
  guestLimit: number | 'Ilimitado';
  storageGB: number;
  badge?: string;
  popular?: boolean;
  desc?: string;
  perk?: string;
  exclusivePerks: string[];
  features: string[];
  support: string;
}

export const DEFAULT_PLANS: SaaSPlanConfig[] = [
  {
    id: 'free',
    name: 'Plano Grátis (Degustação)',
    price: 0,
    period: 'degustação',
    guestLimit: 20,
    storageGB: 0.5,
    desc: 'Ideal para experimentar a plataforma e criar o seu convite.',
    perk: 'Até 20 Convites Digitais',
    exclusivePerks: ['Ideal para testar ou mini-wedding no civil', 'Passe com QR Code básico'],
    features: [
      'Até 20 convites digitais incluídos',
      'Página do convite interativo ativa',
      'Confirmação de presença (RSVP simples)',
      'Acesso restrito a funções avançadas (sem scanner de portaria QR, sem trilha ilimitada)'
    ],
    support: 'Comunidade Online'
  },
  {
    id: 'basic',
    name: 'Plano Essencial',
    price: 45000,
    period: 'único',
    guestLimit: 100,
    storageGB: 1,
    desc: 'Para celebrações intimistas e familiares.',
    perk: 'Download do Convite em PDF',
    exclusivePerks: ['Passe VIP Mobile em PDF', 'Lista Multicaixa Express & IBAN', 'Mural de Recados'],
    features: [
      'Até 100 convidados na lista',
      '1 GB de armazenamento',
      'Download do convite em PDF formato A5',
      'Suporte por e-mail'
    ],
    support: 'E-mail Comercial (48h)'
  },
  {
    id: 'premium',
    name: 'Plano Premium',
    price: 135000,
    period: 'único',
    guestLimit: 300,
    storageGB: 5,
    popular: true,
    badge: 'Mais Recomendado',
    desc: 'O mais querido para casamentos tradicionais.',
    perk: 'Mural de Fotos & Trilha Spotify',
    exclusivePerks: ['Até 300 Convidados', 'Mural de Fotos & Mensagens', 'Trilha Sonora Spotify'],
    features: [
      'Até 300 convidados na lista',
      '5 GB de fotos em alta resolução',
      'Trilha sonora Spotify incorporada',
      'Moderação de mensagens do mural',
      'Suporte prioritário WhatsApp'
    ],
    support: 'Suporte Prioritário WhatsApp (24h)'
  },
  {
    id: 'luxury',
    name: 'Plano Luxo VIP',
    price: 225000,
    period: 'único',
    guestLimit: 'Ilimitado',
    storageGB: 25,
    badge: 'Mais Escolhido',
    popular: true,
    desc: 'A experiência completa e sem limites.',
    perk: 'Convidados Ilimitados & Scanner QR',
    exclusivePerks: ['Convidados Ilimitados', 'Scanner de Portaria com QR Code', 'Multi-Eventos Sincronizados', 'Assessoria VIP 24/7'],
    features: [
      'Convidados ilimitados na lista',
      'Portaria inteligente com scanner QR',
      'Disparo automático via Webhook / WhatsApp',
      'Múltiplos recepcionistas na portaria em tempo real',
      'Assessoria VIP WhatsApp 24/7'
    ],
    support: 'Assessoria VIP WhatsApp 24/7'
  }
];
