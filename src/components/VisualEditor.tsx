import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, Check, BookOpen, Music, Map, Palette, Layout, Heart, Camera, 
  Trash2, Plus, Monitor, Tablet, Smartphone, CheckCircle2,
  FileText, QrCode, Printer, Download, Sparkles, Columns, Eye
} from 'lucide-react';
import { WeddingConfig } from '../types';
import { THEME_PRESETS } from '../data/defaultConfig';
import { compressImage } from '../utils/imageCompressor';
import { downloadPhysicalCardQrPdf } from '../utils/pdfGenerator';
import { downloadQrCodeImage } from '../utils/qrCodeHelper';
import PublicInvite from './PublicInvite';

interface VisualEditorProps {
  config: WeddingConfig;
  onSave: (updatedConfig: WeddingConfig) => void;
}

type EditorSectionTab = 'couple' | 'event' | 'story' | 'media' | 'theme' | 'music_pdf' | 'sections';
type ViewMode = 'split' | 'editor-only' | 'preview-only';

export default function VisualEditor({ config, onSave }: VisualEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorSectionTab>('couple');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
  const [editorConfig, setEditorConfig] = useState<WeddingConfig>({ ...config });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    setEditorConfig({ ...config });
  }, [config]);

  const updateConfig = (updater: (prev: WeddingConfig) => WeddingConfig) => {
    setEditorConfig(prev => {
      const next = updater(prev);
      onSave(next);
      return next;
    });
  };

  const [visibleSections, setVisibleSections] = useState({
    story: true,
    timeline: true,
    venue: true,
    dressCode: true,
    registry: true,
    playlist: true,
    faq: true,
    guestCheckIn: true,
  });

  const handlePresetSelect = (preset: typeof THEME_PRESETS[0]) => {
    updateConfig(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        ...preset
      }
    }));
  };

  const handleSave = () => {
    onSave(editorConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleImageUpload = async (file: File, callback: (base64: string) => void) => {
    try {
      if (!file) return;
      setIsCompressing(true);
      const compressed = await compressImage(file, 1400, 0.82);
      if (compressed) callback(compressed);
    } catch (e) {
      console.warn("handleImageUpload error:", e);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleAddGalleryPhoto = (url: string) => {
    if (!url.trim()) return;
    updateConfig(prev => ({
      ...prev,
      media: {
        ...prev.media,
        photos: [...(prev.media?.photos || []), url.trim()]
      }
    }));
    setNewGalleryUrl('');
  };

  const handleRemoveGalleryPhoto = (index: number) => {
    updateConfig(prev => ({
      ...prev,
      media: {
        ...prev.media,
        photos: (prev.media?.photos || []).filter((_, i) => i !== index)
      }
    }));
  };

  const tabs: { id: EditorSectionTab; label: string; icon: any }[] = [
    { id: 'couple', label: 'Noivos & Casal', icon: Heart },
    { id: 'event', label: 'Data & Locais', icon: Map },
    { id: 'story', label: 'História do Casal', icon: BookOpen },
    { id: 'media', label: 'Capa & Fotos', icon: Camera },
    { id: 'theme', label: 'Cores & Temas', icon: Palette },
    { id: 'music_pdf', label: 'Músicas, PDF & QR', icon: Music },
    { id: 'sections', label: 'Seções Ativas', icon: Layout }
  ];

  const inputClass = "w-full px-4 py-3 bg-white dark:bg-stone-900 border-2 border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-[#8E2840] dark:focus:border-rose-400 focus:bg-white dark:focus:bg-stone-850 focus:ring-2 focus:ring-[#8E2840]/15 text-xs sm:text-sm font-medium transition-all shadow-2xs outline-none";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 block mb-1.5";
  const cardGroupClass = "p-4 sm:p-5 bg-stone-50/80 dark:bg-stone-900/60 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4";

  return (
    <div className="space-y-4" id="wedding-visual-editor">
      {/* TOP CONTROL BAR: TITLE, VIEW MODES & QUICK SAVE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8E2840] dark:text-rose-400" />
            <span>Personalizar Convite & Tema</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-light mt-0.5">
            Todos os campos são sincronizados instantaneamente com o link do convite dos seus convidados.
          </p>
        </div>

        {/* View Mode Switcher + Save Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Layout Mode Selector */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'split' 
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs' 
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
              title="Editor e Prévia Divididos Lado a Lado"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dividido</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('editor-only')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'editor-only' 
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs' 
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
              title="Apenas Formulário de Edição (Mais Espaço)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Apenas Edição</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview-only')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'preview-only' 
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs' 
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
              title="Apenas Prévia em Tela Cheia"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Apenas Prévia</span>
            </button>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Salvo e Sincronizado!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN / SINGLE-COLUMN VIEW */}
      <div className={`grid gap-6 items-start ${
        viewMode === 'split' ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'
      }`}>
        {/* LEFT COLUMN: EDITOR FORM */}
        {viewMode !== 'preview-only' && (
          <div className={`${
            viewMode === 'split' ? 'xl:col-span-6 2xl:col-span-5' : 'w-full max-w-4xl mx-auto'
          } bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 rounded-3xl shadow-sm flex flex-col overflow-hidden`}>
            {/* TABS SELECTOR */}
            <div className="border-b-2 border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70 p-2 sm:p-3 overflow-x-auto">
              <div className="flex items-center gap-1.5 min-w-max">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[#8E2840] text-white shadow-xs' 
                          : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TAB CONTENT WITH CLEAR, PROMINENT FIELDS */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[750px]">
              <AnimatePresence mode="wait">
                {/* 1. NOIVOS & CASAL */}
                {activeTab === 'couple' && (
                  <motion.div
                    key="couple-tab"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-5"
                  >
                    <div className="space-y-1">
                      <h3 className="font-serif font-bold text-base text-stone-900 dark:text-white">
                        Identificação e Nomes dos Noivos
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-light">
                        Estes nomes são exibidos no topo do convite, no bilhete VIP e na confirmação de presença.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Primeiro Nome do Noivo *</label>
                        <input
                          type="text"
                          required
                          value={editorConfig.brideGroom?.groomName || ''}
                          onChange={e => updateConfig(prev => ({
                            ...prev,
                            brideGroom: { ...prev.brideGroom, groomName: e.target.value }
                          }))}
                          placeholder="Ex: Gabriel"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Primeiro Nome da Noiva *</label>
                        <input
                          type="text"
                          required
                          value={editorConfig.brideGroom?.brideName || ''}
                          onChange={e => updateConfig(prev => ({
                            ...prev,
                            brideGroom: { ...prev.brideGroom, brideName: e.target.value }
                          }))}
                          placeholder="Ex: Sofia"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Nome Completo do Noivo</label>
                        <input
                          type="text"
                          value={editorConfig.brideGroom?.groomFullName || ''}
                          onChange={e => updateConfig(prev => ({
                            ...prev,
                            brideGroom: { ...prev.brideGroom, groomFullName: e.target.value }
                          }))}
                          placeholder="Ex: Gabriel Manuel dos Santos"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Nome Completo da Noiva</label>
                        <input
                          type="text"
                          value={editorConfig.brideGroom?.brideFullName || ''}
                          onChange={e => updateConfig(prev => ({
                            ...prev,
                            brideGroom: { ...prev.brideGroom, brideFullName: e.target.value }
                          }))}
                          placeholder="Ex: Sofia de Oliveira e Sousa"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* FOTO DO CASAL & FOTOS INDIVIDUAIS */}
                    <div className={cardGroupClass}>
                      <span className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider block">
                        Fotos de Perfil dos Noivos
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Foto Oficial do Casal */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">Foto Oficial do Casal</span>
                          <div className="w-full h-32 rounded-xl overflow-hidden border-2 border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800">
                            {editorConfig.brideGroom?.couplePhoto ? (
                              <img src={editorConfig.brideGroom.couplePhoto} alt="Casal" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">Sem foto</div>
                            )}
                          </div>
                          <label className="block text-center py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200 cursor-pointer transition-colors">
                            <span>{isCompressing ? 'Processando...' : 'Carregar Foto Casal'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(file, base64 => {
                                    updateConfig(prev => ({
                                      ...prev,
                                      brideGroom: { ...prev.brideGroom, couplePhoto: base64 }
                                    }));
                                  });
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Foto do Noivo */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">Foto do Noivo</span>
                          <div className="w-full h-32 rounded-xl overflow-hidden border-2 border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800">
                            {editorConfig.brideGroom?.groomPhoto ? (
                              <img src={editorConfig.brideGroom.groomPhoto} alt="Noivo" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">Sem foto</div>
                            )}
                          </div>
                          <label className="block text-center py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200 cursor-pointer transition-colors">
                            <span>{isCompressing ? 'Processando...' : 'Carregar Foto Noivo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(file, base64 => {
                                    updateConfig(prev => ({
                                      ...prev,
                                      brideGroom: { ...prev.brideGroom, groomPhoto: base64 }
                                    }));
                                  });
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Foto da Noiva */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">Foto da Noiva</span>
                          <div className="w-full h-32 rounded-xl overflow-hidden border-2 border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800">
                            {editorConfig.brideGroom?.bridePhoto ? (
                              <img src={editorConfig.brideGroom.bridePhoto} alt="Noiva" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">Sem foto</div>
                            )}
                          </div>
                          <label className="block text-center py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200 cursor-pointer transition-colors">
                            <span>{isCompressing ? 'Processando...' : 'Carregar Foto Noiva'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(file, base64 => {
                                    updateConfig(prev => ({
                                      ...prev,
                                      brideGroom: { ...prev.brideGroom, bridePhoto: base64 }
                                    }));
                                  });
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Mensagem de Rodapé */}
                    <div>
                      <label className={labelClass}>Mensagem Final de Rodapé</label>
                      <input
                        type="text"
                        value={editorConfig.customFooter || ''}
                        onChange={e => updateConfig(prev => ({ ...prev, customFooter: e.target.value }))}
                        placeholder="Ex: Com amor, sempre. — Gabriel & Sofia"
                        className={inputClass}
                      />
                      <span className="text-[11px] text-stone-400 font-light mt-1 block">
                        Assinatura calorosa exibida no encerramento da página do convite.
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* 2. DATA & LOCAIS */}
                {activeTab === 'event' && (
                  <motion.div
                    key="event-tab"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-6"
                  >
                    <div>
                      <label className={labelClass}>Data & Horário Principal do Casamento *</label>
                      <input
                        type="datetime-local"
                        required
                        value={editorConfig.date?.slice(0, 16) || ''}
                        onChange={e => updateConfig(prev => ({ ...prev, date: e.target.value }))}
                        className={inputClass + " font-mono"}
                      />
                      <span className="text-[11px] text-stone-400 font-light mt-1 block">
                        Utilizado para o contador regressivo de dias, horas e minutos.
                      </span>
                    </div>

                    {/* 1. CERIMÓNIA RELIGIOSA */}
                    <div className="p-4 sm:p-5 bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-3">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        ⛪ 1. Cerimónia Religiosa (Igreja)
                      </span>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Nome da Igreja</label>
                          <input
                            type="text"
                            placeholder="Ex: Igreja Nossa Senhora do Carmo"
                            value={editorConfig.venue?.churchName || editorConfig.venue?.ceremonyName || ''}
                            onChange={e => updateConfig(prev => ({
                              ...prev,
                              venue: { ...prev.venue, churchName: e.target.value, ceremonyName: e.target.value }
                            }))}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Endereço da Igreja</label>
                          <input
                            type="text"
                            placeholder="Ex: Largo do Carmo, Ingombota, Luanda"
                            value={editorConfig.venue?.churchAddress || editorConfig.venue?.ceremonyAddress || ''}
                            onChange={e => updateConfig(prev => ({
                              ...prev,
                              venue: { ...prev.venue, churchAddress: e.target.value, ceremonyAddress: e.target.value }
                            }))}
                            className={inputClass}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Horário</label>
                            <input
                              type="text"
                              placeholder="Ex: 16:00h"
                              value={editorConfig.venue?.churchTime || editorConfig.venue?.ceremonyTime || ''}
                              onChange={e => updateConfig(prev => ({
                                ...prev,
                                venue: { ...prev.venue, churchTime: e.target.value, ceremonyTime: e.target.value }
                              }))}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Link Google Maps</label>
                            <input
                              type="text"
                              placeholder="Ex: https://maps.app.goo.gl/..."
                              value={editorConfig.venue?.churchMapsUrl || editorConfig.venue?.ceremonyMapsUrl || ''}
                              onChange={e => updateConfig(prev => ({
                                ...prev,
                                venue: { ...prev.venue, churchMapsUrl: e.target.value, ceremonyMapsUrl: e.target.value }
                              }))}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. CERIMÓNIA CIVIL */}
                    <div className="p-4 sm:p-5 bg-stone-50/80 dark:bg-stone-900/60 border-2 border-stone-200 dark:border-stone-800 rounded-2xl space-y-3">
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                        📜 2. Cerimónia Civil (Registo)
                      </span>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Nome do Local Civil</label>
                          <input
                            type="text"
                            placeholder="Ex: Conservatória do Registo Civil"
                            value={editorConfig.venue?.civilName || ''}
                            onChange={e => updateConfig(prev => ({
                              ...prev,
                              venue: { ...prev.venue, civilName: e.target.value }
                            }))}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Endereço Civil</label>
                          <input
                            type="text"
                            placeholder="Ex: Rua Rainha Ginga, Ingombota, Luanda"
                            value={editorConfig.venue?.civilAddress || ''}
                            onChange={e => updateConfig(prev => ({
                              ...prev,
                              venue: { ...prev.venue, civilAddress: e.target.value }
                            }))}
                            className={inputClass}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Horário</label>
                            <input
                              type="text"
                              placeholder="Ex: Sexta-feira, às 10:30h"
                              value={editorConfig.venue?.civilTime || ''}
                              onChange={e => updateConfig(prev => ({
                                ...prev,
                                venue: { ...prev.venue, civilTime: e.target.value }
                              }))}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Link Google Maps</label>
                            <input
                              type="text"
                              placeholder="Ex: https://maps.app.goo.gl/..."
                              value={editorConfig.venue?.civilMapsUrl || ''}
                              onChange={e => updateConfig(prev => ({
                                ...prev,
                                venue: { ...prev.venue, civilMapsUrl: e.target.value }
                              }))}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. COPO DE ÁGUA / FESTA */}
                    <div className="p-4 sm:p-5 bg-rose-50/50 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-3">
                      <span className="text-xs font-bold text-[#8E2840] dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                        🥂 3. Copo de Água & Recepção (Festa)
                      </span>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Nome do Salão/Espaço</label>
                          <input
                            type="text"
                            placeholder="Ex: Espaço Jardins da Welwitschia"
                            value={editorConfig.venue?.receptionName || ''}
                            onChange={e => updateConfig(prev => ({
                              ...prev,
                              venue: { ...prev.venue, receptionName: e.target.value }
                            }))}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Endereço da Festa</label>
                          <input
                            type="text"
                            placeholder="Ex: Via AL 15, Talatona, Luanda"
                            value={editorConfig.venue?.receptionAddress || ''}
                            onChange={e => updateConfig(prev => ({
                              ...prev,
                              venue: { ...prev.venue, receptionAddress: e.target.value }
                            }))}
                            className={inputClass}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Horário</label>
                            <input
                              type="text"
                              placeholder="Ex: A partir das 18:00h"
                              value={editorConfig.venue?.receptionTime || ''}
                              onChange={e => updateConfig(prev => ({
                                ...prev,
                                venue: { ...prev.venue, receptionTime: e.target.value }
                              }))}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">Link Google Maps</label>
                            <input
                              type="text"
                              placeholder="Ex: https://maps.app.goo.gl/..."
                              value={editorConfig.venue?.receptionMapsUrl || ''}
                              onChange={e => updateConfig(prev => ({
                                ...prev,
                                venue: { ...prev.venue, receptionMapsUrl: e.target.value }
                              }))}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. HISTÓRIA DO CASAL */}
                {activeTab === 'story' && (
                  <motion.div
                    key="story-tab"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className={labelClass}>Título da Seção de História</label>
                      <input
                        type="text"
                        value={editorConfig.storyTitle || ''}
                        onChange={e => updateConfig(prev => ({ ...prev, storyTitle: e.target.value }))}
                        placeholder="Ex: Como o Nosso Amor Começou"
                        className={inputClass}
                      />
                    </div>

                    <div className={cardGroupClass}>
                      <span className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider block">
                        Foto de Destaque da História
                      </span>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <img 
                          src={editorConfig.media?.storyImage || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=400'} 
                          alt="Story" 
                          className="w-24 h-24 rounded-2xl object-cover border-2 border-stone-200 dark:border-stone-700 shrink-0" 
                        />
                        <div className="space-y-2 text-center sm:text-left">
                          <label className="inline-block px-4 py-2 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                            <span>{isCompressing ? 'Processando...' : 'Substituir Foto'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(file, base64 => {
                                    updateConfig(prev => ({
                                      ...prev,
                                      media: { ...prev.media, storyImage: base64 }
                                    }));
                                  });
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[11px] text-stone-400">Dimensão recomendada: 800x600px ou superior.</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Narrativa Completa do Casal</label>
                      <textarea
                        rows={6}
                        value={editorConfig.storyContent || ''}
                        onChange={e => updateConfig(prev => ({ ...prev, storyContent: e.target.value }))}
                        placeholder="Escreva como se conheceram, o pedido de casamento e o que este momento representa para vocês..."
                        className={inputClass + " resize-y leading-relaxed"}
                      />
                    </div>
                  </motion.div>
                )}

                {/* 4. CAPA & GALERIA DE FOTOS */}
                {activeTab === 'media' && (
                  <motion.div
                    key="media-tab"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-5"
                  >
                    <div className={cardGroupClass}>
                      <span className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider block">
                        Foto de Capa Principal do Convite
                      </span>
                      <div className="space-y-3">
                        <div className="w-full h-44 rounded-2xl overflow-hidden border-2 border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800">
                          <img 
                            src={editorConfig.media?.coverImage || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200'} 
                            alt="Capa" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-stone-400 font-light">Foto em destaque na tela inicial do convite.</span>
                          <label className="px-4 py-2 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                            <span>{isCompressing ? 'Processando...' : 'Trocar Foto de Capa'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(file, base64 => {
                                    updateConfig(prev => ({
                                      ...prev,
                                      media: { ...prev.media, coverImage: base64 }
                                    }));
                                  });
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className={cardGroupClass}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider block">
                            Galeria de Fotos do Casal ({(editorConfig.media?.photos || []).length})
                          </span>
                          <span className="text-[11px] text-stone-400 font-light">Fotos para os convidados admirarem no site.</span>
                        </div>
                        <label className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 border-2 border-stone-300 dark:border-stone-600 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(file, base64 => handleAddGalleryPhoto(base64));
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                        {(editorConfig.media?.photos || []).map((p, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-stone-200 dark:border-stone-700 group">
                            <img src={p} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryPhoto(idx)}
                              className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                              title="Remover foto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 5. CORES & TEMAS */}
                {activeTab === 'theme' && (
                  <motion.div
                    key="theme-tab"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-5"
                  >
                    <div>
                      <label className={labelClass}>Paletas de Cores & Temas Visuais Pré-Configurados</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {THEME_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handlePresetSelect(preset)}
                            className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                              editorConfig.theme?.primaryColor === preset.primaryColor
                                ? 'border-[#8E2840] dark:border-rose-400 bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-[#8E2840]/20'
                                : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-white dark:bg-stone-900'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="w-5 h-5 rounded-full border border-white shadow-xs" style={{ backgroundColor: preset.primaryColor }} />
                              <strong className="text-xs font-bold text-stone-900 dark:text-white">{preset.name}</strong>
                            </div>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-light block">
                              Cores nobres com contraste e tipografia elegante.
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 6. MÚSICAS, PDF & QR */}
                {activeTab === 'music_pdf' && (
                  <motion.div
                    key="music-pdf-tab"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-5"
                  >
                    <div>
                      <label className={labelClass}>Link de Trilha Sonora do Spotify</label>
                      <input
                        type="text"
                        value={editorConfig.spotifyUrl || ''}
                        onChange={e => updateConfig(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                        placeholder="Ex: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
                        className={inputClass}
                      />
                      <span className="text-[11px] text-stone-400 font-light mt-1 block">
                        Os convidados podem ouvir a canção oficial do casal ao navegar pelo convite.
                      </span>
                    </div>

                    {/* QR Code para Convites Físicos e Gráfica */}
                    <div className="p-4 sm:p-5 bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-[#9E7A36] dark:text-amber-400" />
                        <strong className="block text-amber-950 dark:text-amber-200 text-xs font-bold uppercase tracking-wider">
                          QR Code para Gráfica & Convites em Papel
                        </strong>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-300 font-light">
                        Baixe o QR Code em alta resolução (1200x1200px) para imprimir nos envelopes em papel, lacres ou cartões de presença.
                      </p>
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const origin = typeof window !== 'undefined' ? window.location.origin : '';
                            const link = `${origin}/?invite=convite&clientId=${editorConfig.clientId || 'client_1'}`;
                            const groom = editorConfig.brideGroom?.groomName || 'Noivo';
                            const bride = editorConfig.brideGroom?.brideName || 'Noiva';
                            downloadQrCodeImage(link, `QRCode_Grafica_${groom}_e_${bride}.png`, 1200, '#1c1917');
                          }}
                          className="px-4 py-2.5 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar QR em PNG (1200px)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const origin = typeof window !== 'undefined' ? window.location.origin : '';
                            const link = `${origin}/?invite=convite&clientId=${editorConfig.clientId || 'client_1'}`;
                            downloadPhysicalCardQrPdf(editorConfig, link);
                          }}
                          className="px-4 py-2.5 bg-white dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-50 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#9E7A36]" />
                          <span>Baixar Cartão A6 em PDF</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 7. SEÇÕES ATIVAS */}
                {activeTab === 'sections' && (
                  <motion.div
                    key="sections-tab"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-3"
                  >
                    <span className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider block">
                      Blocos Visíveis na Página do Convite
                    </span>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-light mb-3">
                      Ligue ou desligue módulos específicos conforme o estilo da sua festa.
                    </p>

                    {[
                      { key: 'story', label: 'Nossa História de Amor' },
                      { key: 'timeline', label: 'Cronograma da Recepção' },
                      { key: 'venue', label: 'Localização & Mapa Interativo' },
                      { key: 'dressCode', label: 'Dress Code & Traje Recomendado' },
                      { key: 'registry', label: 'Lista de Presentes & Quotas IBAN' },
                      { key: 'playlist', label: 'Trilha Sonora do Spotify' },
                      { key: 'faq', label: 'Perguntas Frequentes (FAQ)' }
                    ].map(block => (
                      <div key={block.key} className="flex justify-between items-center p-3.5 bg-stone-50 dark:bg-stone-850/60 rounded-xl border-2 border-stone-200 dark:border-stone-700">
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">{block.label}</span>
                        <input
                          type="checkbox"
                          checked={(visibleSections as any)[block.key]}
                          onChange={e => setVisibleSections(prev => ({ ...prev, [block.key]: e.target.checked }))}
                          className="w-4 h-4 rounded text-[#8E2840] focus:ring-[#8E2840] cursor-pointer"
                        />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FORM FOOTER WITH INSTANT SYNC BADGE & SAVE */}
            <div className="p-4 border-t-2 border-stone-100 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/90 flex items-center justify-between">
              <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 font-light">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sincronização em tempo real ativa
              </span>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 bg-[#8E2840] hover:bg-[#782236] text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Guardado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: INTERACTIVE LIVE PREVIEW */}
        {viewMode !== 'editor-only' && (
          <div className={`${
            viewMode === 'split' ? 'xl:col-span-6 2xl:col-span-7' : 'w-full'
          } bg-stone-100 dark:bg-stone-950 border-2 border-stone-200 dark:border-stone-800 rounded-3xl p-4 flex flex-col justify-between shadow-xs`}>
            {/* PREVIEW TOP BAR */}
            <div className="flex justify-between items-center bg-white dark:bg-stone-900 p-3 rounded-2xl border-2 border-stone-200 dark:border-stone-800 mb-4 shadow-2xs">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#8E2840]" />
                <span>Prévia ao Vivo do Convite</span>
              </span>
              
              {/* Responsive Device Switcher */}
              <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl border border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  onClick={() => setViewport('desktop')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewport === 'desktop' ? 'bg-white dark:bg-stone-900 text-[#8E2840] dark:text-rose-400 shadow-2xs font-bold' : 'text-stone-400 hover:text-stone-700'}`}
                  title="Visão Computador"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('tablet')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewport === 'tablet' ? 'bg-white dark:bg-stone-900 text-[#8E2840] dark:text-rose-400 shadow-2xs font-bold' : 'text-stone-400 hover:text-stone-700'}`}
                  title="Visão Tablet"
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('mobile')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewport === 'mobile' ? 'bg-white dark:bg-stone-900 text-[#8E2840] dark:text-rose-400 shadow-2xs font-bold' : 'text-stone-400 hover:text-stone-700'}`}
                  title="Visão Smartphone"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PREVIEW FRAME */}
            <div className="flex items-center justify-center overflow-hidden min-h-[600px] max-h-[750px]">
              <div 
                className={`bg-white dark:bg-stone-900 shadow-xl border-2 border-stone-200 dark:border-stone-800 overflow-y-auto h-[680px] transition-all duration-300 ${
                  viewport === 'mobile' ? 'w-[375px] max-w-full rounded-[36px] ring-8 ring-stone-900/10 dark:ring-stone-800' :
                  viewport === 'tablet' ? 'w-[768px] max-w-full rounded-2xl' :
                  'w-full rounded-2xl'
                }`}
              >
                <PublicInvite
                  config={editorConfig}
                  simulatedOnly={true}
                  visibleBlocks={visibleSections}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
