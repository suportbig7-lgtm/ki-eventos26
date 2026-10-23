import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, Plus, Search, Check, Clock, CheckCircle2, 
  Smartphone, FileText, Edit2, Trash2, MessageCircle, 
  Sparkles, X, Download, LayoutGrid, List, 
  Upload, Image as ImageIcon 
} from 'lucide-react';
import { WeddingConfig, WeddingRegistryItem } from '../types';

interface GiftRegistryProps {
  config: WeddingConfig;
  onUpdateConfig: (config: WeddingConfig) => void;
}

const GIFT_CATEGORIES = [
  { id: 'all', label: 'Todas Categorias' },
  { id: 'lua_de_mel', label: '🏖️ Cotas de Lua de Mel' },
  { id: 'eletro', label: '⚡ Eletrodomésticos' },
  { id: 'cozinha', label: '🍳 Cozinha & Mesa' },
  { id: 'sala_quarto', label: '🛋️ Decoração & Conforto' },
  { id: 'experiencias', label: '✨ Experiências & Lazer' },
  { id: 'outro', label: '🎁 Outros Presentes' },
];

const PRESET_GIFTS: Omit<WeddingRegistryItem, 'id'>[] = [
  {
    name: 'Cota de Lua de Mel: Passeio de Barco no Mussulo',
    price: 85000,
    category: 'lua_de_mel',
    description: 'Passeio romântico privativo de lancha pela costa marítima de Luanda.',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Cota de Lua de Mel: Jantar Romântico à Beira-Mar',
    price: 75000,
    category: 'lua_de_mel',
    description: 'Jantar à luz de velas a dois com degustação gastronômica na Ilha do Cabo.',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Máquina de Café Espresso DeLonghi Magnifica',
    price: 490000,
    category: 'eletro',
    description: 'Para manhãs cheias de energia e cafés especiais para receber os convidados.',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Batedeira Planetária KitchenAid Artisan',
    price: 250000,
    category: 'eletro',
    description: 'Perfeita para preparar doces, bolos e massas especiais.',
    imageUrl: 'https://images.unsplash.com/photo-1594385208974-2e75f9d8a8be?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Aparelho de Jantar Porcelana Fina (12 Lugares)',
    price: 380000,
    category: 'cozinha',
    description: 'Conjunto completo com pratos rasos, fundos, sobremesa e xícaras de café.',
    imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Jogo de Panelas Antiaderente Cerâmica Le Creuset',
    price: 310000,
    category: 'cozinha',
    description: 'Conjunto durável com caçarolas e frigideiras de alta performance.',
    imageUrl: 'https://images.unsplash.com/photo-1584990347449-a29283f3e1b1?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  }
];

export default function GiftRegistry({ config, onUpdateConfig }: GiftRegistryProps) {
  const registryItems = config.giftRegistry?.registryItems || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'disponivel' | 'reservado' | 'recebido'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WeddingRegistryItem | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<WeddingRegistryItem | null>(null);
  const [showBankSettingsModal, setShowBankSettingsModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'eletro',
    description: '',
    imageUrl: '',
    status: 'disponivel' as 'disponivel' | 'reservado' | 'recebido',
    claimedBy: '',
    claimedPhone: '',
    guestMessage: '',
    claimedDate: ''
  });

  const [bankFormData, setBankFormData] = useState({
    multicaixaPhone: config.giftRegistry?.multicaixaPhone || '+244 923 000 000',
    iban: config.giftRegistry?.iban || 'AO06 0006 0042 0001 9472 0090 1',
    bankName: config.giftRegistry?.bankName || 'BFA - Banco de Fomento Angola',
    bankAccount: config.giftRegistry?.bankAccount || '194720090',
    accountHolder: config.giftRegistry?.accountHolder || `${config.brideGroom?.groomName || 'Noivo'} & ${config.brideGroom?.brideName || 'Noiva'}`,
    pixKey: config.giftRegistry?.pixKey || '+244 923 000 000',
    customInstructions: config.giftRegistry?.customInstructions || 'As transferências podem ser efetuadas via Multicaixa Express ou IBAN bancário direto.'
  });

  const getItemStatus = (item: WeddingRegistryItem): 'disponivel' | 'reservado' | 'recebido' => {
    if (item.status) return item.status;
    if (item.paymentStatus === 'received') return 'recebido';
    if (item.claimedBy) return 'reservado';
    return 'disponivel';
  };

  const formatAOA = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val) + ' Kz';
  };

  const stats = useMemo(() => {
    const totalItems = registryItems.length;
    let totalValue = 0;
    let receivedValue = 0;
    let reservedValue = 0;
    let availableCount = 0;
    let reservedCount = 0;
    let receivedCount = 0;

    registryItems.forEach(item => {
      const price = Number(item.price) || 0;
      totalValue += price;
      const status = getItemStatus(item);
      if (status === 'recebido') {
        receivedValue += price;
        receivedCount += 1;
      } else if (status === 'reservado') {
        reservedValue += price;
        reservedCount += 1;
      } else {
        availableCount += 1;
      }
    });

    const completionRate = totalValue > 0 ? Math.round(((receivedValue + reservedValue) / totalValue) * 100) : 0;
    return {
      totalItems,
      totalValue,
      receivedValue,
      reservedValue,
      availableCount,
      reservedCount,
      receivedCount,
      completionRate
    };
  }, [registryItems]);

  const filteredItems = useMemo(() => {
    return registryItems.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.claimedBy && item.claimedBy.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || 
        item.category === selectedCategory ||
        (selectedCategory === 'lua_de_mel' && (item.category === 'Lua de Mel' || item.category === 'cotas_dinheiro'));

      const currentStatus = getItemStatus(item);
      const matchesStatus = selectedStatus === 'all' || currentStatus === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [registryItems, searchTerm, selectedCategory, selectedStatus]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      price: '',
      category: 'eletro',
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1584990347449-a29283f3e1b1?auto=format&fit=crop&q=80&w=400',
      status: 'disponivel',
      claimedBy: '',
      claimedPhone: '',
      guestMessage: '',
      claimedDate: ''
    });
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (item: WeddingRegistryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      category: item.category || 'eletro',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      status: getItemStatus(item),
      claimedBy: item.claimedBy || '',
      claimedPhone: item.claimedPhone || '',
      guestMessage: item.guestMessage || '',
      claimedDate: item.claimedDate || ''
    });
    setShowAddEditModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const priceNum = parseFloat(formData.price.replace(/[^0-9.]/g, '')) || 0;
    if (priceNum <= 0) return;

    const updatedItem: WeddingRegistryItem = {
      id: editingItem ? editingItem.id : `gift_${Date.now()}`,
      name: formData.name.trim(),
      price: priceNum,
      category: formData.category,
      description: formData.description.trim(),
      imageUrl: formData.imageUrl.trim() || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=400',
      status: formData.status,
      claimedBy: formData.status !== 'disponivel' ? formData.claimedBy.trim() || 'Convidado' : undefined,
      claimedPhone: formData.status !== 'disponivel' ? formData.claimedPhone.trim() : undefined,
      guestMessage: formData.status !== 'disponivel' ? formData.guestMessage.trim() : undefined,
      claimedDate: formData.status !== 'disponivel' ? (formData.claimedDate || new Date().toISOString().split('T')[0]) : undefined,
      paymentStatus: formData.status === 'recebido' ? 'received' : 'pending',
      contributors: editingItem?.contributors || [],
      totalCollected: editingItem?.totalCollected || (formData.status === 'recebido' ? priceNum : 0),
      isQuota: editingItem?.isQuota || formData.category === 'lua_de_mel'
    };

    let newItems: WeddingRegistryItem[];
    if (editingItem) {
      newItems = registryItems.map(it => it.id === editingItem.id ? updatedItem : it);
    } else {
      newItems = [updatedItem, ...registryItems];
    }

    onUpdateConfig({
      ...config,
      giftRegistry: {
        ...config.giftRegistry,
        registryItems: newItems
      }
    });
    setShowAddEditModal(false);
  };

  const handleDeleteItem = (id: string) => {
    const newItems = registryItems.filter(it => it.id !== id);
    onUpdateConfig({
      ...config,
      giftRegistry: {
        ...config.giftRegistry,
        registryItems: newItems
      }
    });
  };

  const handleImportPreset = (preset: Omit<WeddingRegistryItem, 'id'>) => {
    const newItem: WeddingRegistryItem = {
      ...preset,
      id: `gift_preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    onUpdateConfig({
      ...config,
      giftRegistry: {
        ...config.giftRegistry,
        registryItems: [newItem, ...registryItems]
      }
    });
  };

  const handleSaveBankInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      giftRegistry: {
        ...config.giftRegistry,
        multicaixaPhone: bankFormData.multicaixaPhone,
        iban: bankFormData.iban,
        bankName: bankFormData.bankName,
        bankAccount: bankFormData.bankAccount,
        accountHolder: bankFormData.accountHolder,
        pixKey: bankFormData.pixKey,
        customInstructions: bankFormData.customInstructions
      }
    });
    setShowBankSettingsModal(false);
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100" id="gift-registry-dashboard">
      {/* HEADER WITH ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900 flex items-center justify-center text-rose-800 dark:text-rose-300 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
              Lista de Presentes & Cotas de Casamento
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Itens em Kwanzas (AOA), acompanhamento de reservas e dados Multicaixa Express / IBAN.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBankSettingsModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
            <span>Dados Bancários (AOA)</span>
          </button>
          <button
            onClick={() => setShowPresetModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sugestões Prontas</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-800 hover:bg-rose-900 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Presente</span>
          </button>
        </div>
      </div>

      {/* FINANCIAL & PROGRESS KPI SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total de Itens</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalItems}</div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{stats.availableCount} disponíveis</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Meta Total da Lista</span>
          <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white truncate">
            {formatAOA(stats.totalValue)}
          </div>
          <span className="text-[11px] text-slate-400">Soma de todos os presentes</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-900 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-400 uppercase tracking-wider block">Recebido / Confirmado</span>
          <div className="text-xl md:text-2xl font-bold text-rose-900 dark:text-rose-200 truncate">
            {formatAOA(stats.receivedValue)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{stats.receivedCount} presentes</span>
            <span className="font-bold text-rose-800 dark:text-rose-400">{stats.completionRate}% da meta</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">Reservado</span>
          <div className="text-xl md:text-2xl font-bold text-amber-900 dark:text-amber-200 truncate">
            {formatAOA(stats.reservedValue)}
          </div>
          <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{stats.reservedCount} em andamento</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar presentes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-rose-800 text-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            {[
              { id: 'all', label: 'Todos', count: stats.totalItems },
              { id: 'disponivel', label: 'Disponíveis', count: stats.availableCount },
              { id: 'reservado', label: 'Reservados', count: stats.reservedCount },
              { id: 'recebido', label: 'Recebidos', count: stats.receivedCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedStatus === tab.id
                    ? 'bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] ml-1 opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-rose-800' : 'text-slate-400'}`}
              title="Grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-rose-800' : 'text-slate-400'}`}
              title="Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ITEMS LIST */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <Gift className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Nenhum presente na lista</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Comece adicionando itens ou carregue as sugestões prontas em Kwanzas.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Adicionar Presente
            </button>
            <button
              onClick={() => setShowPresetModal(true)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Carregar Sugestões
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const status = getItemStatus(item);
            return (
              <div 
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        status === 'recebido' ? 'bg-rose-900 text-white' :
                        status === 'reservado' ? 'bg-amber-500 text-white' :
                        'bg-emerald-700 text-white'
                      }`}>
                        {status === 'recebido' ? 'Recebido' : status === 'reservado' ? 'Reservado' : 'Disponível'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">{item.name}</h3>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{item.description}</p>
                    )}

                    {/* Progress Bar in Gift Card */}
                    {(() => {
                      const collected = item.totalCollected || (item.paymentStatus === 'received' ? item.price : 0);
                      const price = item.price || 1;
                      const pct = Math.min(100, Math.round((collected / price) * 100));
                      const isCompleted = collected >= price || status === 'recebido';
                      return (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Arrecadado: {formatAOA(collected)}</span>
                            <span className="font-bold text-rose-800 dark:text-rose-400">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-rose-800'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {isCompleted && (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 pt-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Meta Atingida / Concluída</span>
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {item.claimedBy && (
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-[11px] text-slate-600 dark:text-slate-300">
                        Presenteado por: <strong>{item.claimedBy}</strong>
                        {item.guestMessage && (
                          <p className="italic text-[10px] text-slate-400 mt-0.5">"{item.guestMessage}"</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Preço / Meta</span>
                      <span className="text-base font-bold text-rose-900 dark:text-rose-400">
                        {formatAOA(item.price)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-slate-400 hover:text-rose-600"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT ITEM */}
      <AnimatePresence>
        {showAddEditModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden my-6"
            >
              <div className="bg-slate-950 p-5 text-white flex justify-between items-center border-b border-slate-800">
                <h3 className="font-bold text-sm">
                  {editingItem ? 'Editar Presente' : 'Novo Presente na Lista'}
                </h3>
                <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-6 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Nome do Presente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jogo de Taças de Cristal"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">Valor em Kwanzas (AOA) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Ex: 85000"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">Categoria</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                    >
                      <option value="lua_de_mel">Cotas de Lua de Mel</option>
                      <option value="eletro">Eletrodomésticos</option>
                      <option value="cozinha">Cozinha & Mesa</option>
                      <option value="sala_quarto">Sala & Quarto</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">URL da Imagem</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.imageUrl}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEditModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl font-bold shadow-md"
                  >
                    Salvar Presente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PRESETS */}
      <AnimatePresence>
        {showPresetModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden my-6"
            >
              <div className="bg-slate-950 p-5 text-white flex justify-between items-center border-b border-slate-800">
                <h3 className="font-bold text-sm">Sugestões de Presentes Prontos</h3>
                <button onClick={() => setShowPresetModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
                {PRESET_GIFTS.map((preset, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <strong className="text-xs text-slate-900 dark:text-white block">{preset.name}</strong>
                      <span className="text-[11px] text-rose-800 dark:text-rose-400 font-bold">{formatAOA(preset.price)}</span>
                    </div>
                    <button
                      onClick={() => handleImportPreset(preset)}
                      className="px-3 py-1 bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      + Adicionar
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowPresetModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: BANK DETAILS */}
      <AnimatePresence>
        {showBankSettingsModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden my-6"
            >
              <div className="bg-slate-950 p-5 text-white flex justify-between items-center border-b border-slate-800">
                <h3 className="font-bold text-sm">Dados Bancários para Recebimento</h3>
                <button onClick={() => setShowBankSettingsModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBankInfo} className="p-6 space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Número Multicaixa Express (Telefone)</label>
                  <input
                    type="text"
                    required
                    value={bankFormData.multicaixaPhone}
                    onChange={e => setBankFormData({ ...bankFormData, multicaixaPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">IBAN Angola</label>
                  <input
                    type="text"
                    required
                    value={bankFormData.iban}
                    onChange={e => setBankFormData({ ...bankFormData, iban: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Nome do Banco</label>
                  <input
                    type="text"
                    value={bankFormData.bankName}
                    onChange={e => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Titular da Conta</label>
                  <input
                    type="text"
                    value={bankFormData.accountHolder}
                    onChange={e => setBankFormData({ ...bankFormData, accountHolder: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBankSettingsModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl font-bold shadow-md"
                  >
                    Salvar Dados
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
