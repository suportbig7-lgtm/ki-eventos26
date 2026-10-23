import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image as ImageIcon, MessageSquare, Trash2, Sparkles, 
  Heart, Calendar, CheckCircle2, Clock, Check, X 
} from 'lucide-react';
import { WeddingConfig, SharedPhoto } from '../types';
import { safeSetItem } from '../utils/storage';

interface SharedAlbumManagerProps {
  config: WeddingConfig;
}

interface AffectionMessage {
  id: string;
  clientName: string;
  text: string;
  timestamp: string;
}

export default function SharedAlbumManager({ config }: SharedAlbumManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'photos' | 'messages'>('photos');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);
  const [messages, setMessages] = useState<AffectionMessage[]>([]);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadedPhotos = localStorage.getItem(`kutxi_photos_${config.id}`);
    if (loadedPhotos) {
      try {
        const parsed = JSON.parse(loadedPhotos);
        setPhotos(parsed);
      } catch (e) {
        setPhotos([]);
      }
    } else {
      setPhotos([]);
    }

    const loadedMsgs = localStorage.getItem(`kutxi_affection_msgs_${config.id}`);
    if (loadedMsgs) {
      try {
        setMessages(JSON.parse(loadedMsgs));
      } catch (e) {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [config.id]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleDeletePhoto = (id: string) => {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    safeSetItem(`kutxi_photos_${config.id}`, JSON.stringify(updated));
    showNotification('Foto removida com sucesso!');
  };

  const handleApprovePhoto = (id: string) => {
    const updated = photos.map(p => p.id === id ? { ...p, approved: true } : p);
    setPhotos(updated);
    safeSetItem(`kutxi_photos_${config.id}`, JSON.stringify(updated));
    showNotification('Foto aprovada e publicada no mural!');
  };

  const handleDeleteMessage = (id: string) => {
    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);
    safeSetItem(`kutxi_affection_msgs_${config.id}`, JSON.stringify(updated));
    showNotification('Mensagem removida com sucesso!');
  };

  return (
    <div className="space-y-6 text-stone-800 dark:text-stone-100" id="shared-album-manager-root">
      {/* Banner - Luminous Airy Design */}
      <div className="bg-gradient-to-br from-[#FFFDFB] via-[#FAF6F2] to-[#FFF8F7] dark:from-stone-900 dark:via-stone-850 dark:to-stone-900 p-6 rounded-2xl text-stone-900 dark:text-stone-100 space-y-4 shadow-2xs border border-[#EFE5D5] dark:border-stone-800">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-serif font-light text-stone-900 dark:text-white">
            Álbum Partilhado dos Noivos & Fotos do Evento
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-2xl leading-relaxed font-light">
            As fotos enviadas por convidados com presença confirmada são publicadas diretamente no site sem necessidade de aprovação prévia. Os convidados podem reagir às fotos com o seu Token de Convidado. Aqui os noivos podem gerir o acervo e remover qualquer foto indesejada.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 pt-3 border-t border-[#EFE7DC] dark:border-stone-800 text-xs">
          <div className="bg-white/80 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700 p-3 rounded-xl flex items-center gap-3 shadow-2xs">
            <ImageIcon className="w-5 h-5 text-[#8E2840] dark:text-rose-400" />
            <div>
              <span className="text-[10px] block text-stone-400 uppercase font-medium">Fotos Coletadas</span>
              <strong className="text-stone-900 dark:text-white font-mono text-base">{photos.length}</strong>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700 p-3 rounded-xl flex items-center gap-3 shadow-2xs">
            <MessageSquare className="w-5 h-5 text-[#9E7A36] dark:text-amber-300" />
            <div>
              <span className="text-[10px] block text-stone-400 uppercase font-medium">Mensagens Recebidas</span>
              <strong className="text-stone-900 dark:text-white font-mono text-base">{messages.length}</strong>
            </div>
          </div>
          <div className="col-span-2 md:col-span-1 bg-[#FAF6EE] dark:bg-amber-950/30 border border-[#E9DEC6] dark:border-amber-900/40 p-3 rounded-xl flex items-center gap-3 shadow-2xs">
            <Calendar className="w-5 h-5 text-[#9E7A36] dark:text-amber-300 shrink-0" />
            <div className="text-[11px] text-[#9E7A36] dark:text-amber-200 font-medium">
              Mural ativado para o dia do evento
            </div>
          </div>
        </div>
      </div>

      {alertMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex bg-stone-100 dark:bg-stone-850 p-1 rounded-xl max-w-sm text-xs border border-stone-200/70 dark:border-stone-800">
        <button
          onClick={() => setActiveSubTab('photos')}
          className={`flex-1 py-2 font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'photos' ? 'bg-white dark:bg-stone-900 text-[#8E2840] dark:text-rose-400 shadow-2xs font-semibold' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Mural de Fotos</span>
        </button>
        <button
          onClick={() => setActiveSubTab('messages')}
          className={`flex-1 py-2 font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'messages' ? 'bg-white dark:bg-stone-900 text-[#8E2840] dark:text-rose-400 shadow-2xs font-semibold' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Mensagens ({messages.length})</span>
        </button>
      </div>

      {/* Content */}
      {activeSubTab === 'photos' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Fotos do Álbum Coletivo</span>
              <span className="text-[10px] text-slate-400">Fotos enviadas por convidados confirmados entram diretamente no álbum</span>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPhotoFilter('all')}
                className={`px-3 py-1 rounded-md font-bold cursor-pointer ${photoFilter === 'all' ? 'bg-slate-900 dark:bg-slate-700 text-white' : 'text-slate-500'}`}
              >
                Todas ({photos.length})
              </button>
              <button
                type="button"
                onClick={() => setPhotoFilter('approved')}
                className={`px-3 py-1 rounded-md font-bold cursor-pointer ${photoFilter === 'approved' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
              >
                Ativas ({photos.filter(p => p.approved !== false).length})
              </button>
              {photos.some(p => p.approved === false) && (
                <button
                  type="button"
                  onClick={() => setPhotoFilter('pending')}
                  className={`px-3 py-1 rounded-md font-bold cursor-pointer ${photoFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-slate-500'}`}
                >
                  Pendentes ({photos.filter(p => p.approved === false).length})
                </button>
              )}
            </div>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400">Nenhuma foto compartilhada pelos convidados ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.filter(p => {
                if (photoFilter === 'pending') return p.approved === false;
                if (photoFilter === 'approved') return p.approved !== false;
                return true;
              }).map(photo => (
                <div key={photo.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="aspect-square bg-slate-100 relative">
                      <img src={photo.imageUrl} alt={photo.guestName} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3 space-y-1.5">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{photo.guestName}</div>
                      {photo.caption && <p className="text-[10px] text-slate-500 italic line-clamp-2">"{photo.caption}"</p>}
                      
                      {/* Reactions badges */}
                      {photo.reactions && Object.keys(photo.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {Object.entries(photo.reactions).map(([emoji, tokens]) => {
                            const list = tokens as string[];
                            return list && list.length > 0 ? (
                              <span key={emoji} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-mono flex items-center gap-0.5">
                                <span>{emoji}</span>
                                <span className="font-bold">{list.length}</span>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 pt-0 flex gap-1.5">
                    {photo.approved === false && (
                      <button
                        onClick={() => handleApprovePhoto(photo.id)}
                        className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Aprovar
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="w-full py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remover</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              Nenhuma mensagem de carinho registrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {messages.map(msg => (
                <div key={msg.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-white">{msg.clientName}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-1">"{msg.text}"</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
