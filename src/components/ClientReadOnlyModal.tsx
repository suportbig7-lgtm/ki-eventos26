import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, CheckCircle2, 
  Key, Copy, Check, ExternalLink, 
  Gift, ListTodo, Building, Lock, X, FileText 
} from 'lucide-react';
import { ClientWeddingSaaS, Guest, WeddingConfig } from '../types';

interface ClientReadOnlyModalProps {
  client: ClientWeddingSaaS | null;
  isOpen: boolean;
  onClose: () => void;
  userAccounts?: { username: string; pass: string; clientId: string; clientName: string }[];
}

export default function ClientReadOnlyModal({ client, isOpen, onClose, userAccounts = [] }: ClientReadOnlyModalProps) {
  if (!isOpen || !client) return null;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'guests' | 'venue' | 'tasks' | 'gifts'>('summary');

  const config: WeddingConfig = client.config;

  const savedGuestsRaw = localStorage.getItem(`kutxi_guests_${client.id}`) ||
                          (client.id === 'client_1' ? localStorage.getItem('kutxi_guests') : null);
  const clientGuests: Guest[] = savedGuestsRaw ? JSON.parse(savedGuestsRaw) : [];
  const confirmedGuests = clientGuests.filter(g => g.status === 'Confirmed');
  const pendingGuests = clientGuests.filter(g => g.status === 'Pending');
  const totalAttending = confirmedGuests.reduce((acc, g) => acc + 1 + (g.plusOnesConfirmed ?? g.maxPlusOnes ?? 0), 0);

  const clientCreds = userAccounts.filter(acc => acc.clientId === client.id);
  const todoList = config?.todoList || [];
  const completedTasks = todoList.filter(t => t.completed);
  const registryItems = config?.giftRegistry?.registryItems || [];

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const weddingDateFormatted = new Date(client.weddingDate || config?.date || Date.now()).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="readonly-client-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-4xl w-full overflow-hidden my-8 flex flex-col max-h-[90vh]"
      >
        {/* Read-Only Mode Security Banner */}
        <div className="bg-slate-900 text-slate-100 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Modo Somente Leitura (Super Administrador)</span>
            <span className="hidden sm:inline text-slate-400 font-normal ml-1">
              — Acesso de consulta irrestrita sem permissão de alteração
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Client Identity Header */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 p-6 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 font-serif font-bold text-xl">
              {config?.brideGroom?.groomName?.charAt(0) || config?.brideGroom?.brideName?.charAt(0) || client.clientName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="readonly-client-title" className="text-xl md:text-2xl font-display font-bold text-white">
                  {client.clientName}
                </h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  client.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  client.status === 'Trial' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  client.status === 'Suspended' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                }`}>
                  {client.status === 'Active' ? '✓ Ativo / Liberado' : 
                   client.status === 'Trial' ? '⏱ Aguardando Pagamento' : 
                   client.status === 'Suspended' ? '🚫 Acesso Suspenso' : 'Expirado'}
                </span>
              </div>
              <p className="text-xs text-rose-200/80 font-medium mt-0.5">
                Data do Casamento: {weddingDateFormatted} · Plano: <strong>{client.plan}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`?clientId=${client.id}&invite=preview`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-rose-300" />
              Ver Convite Público
            </a>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 overflow-x-auto">
          {[
            { id: 'summary', label: 'Visão Geral & Login', icon: FileText },
            { id: 'guests', label: `Convidados (${clientGuests.length})`, icon: Users },
            { id: 'venue', label: 'Espaço & Local', icon: Building },
            { id: 'tasks', label: `Tarefas (${todoList.length})`, icon: ListTodo },
            { id: 'gifts', label: `Presentes (${registryItems.length})`, icon: Gift }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === tab.id 
                  ? 'border-rose-800 text-rose-800 dark:text-rose-400 bg-white dark:bg-slate-900 shadow-2xs rounded-t-lg' 
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-800 dark:text-slate-200 text-xs">
          {/* TAB: SUMMARY & LOGIN */}
          {activeSubTab === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Convidados</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{clientGuests.length}</div>
                  <span className="text-[10px] text-slate-500">{totalAttending} presentes esperados</span>
                </div>
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-2xl">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase block">Confirmados (RSVP)</span>
                  <div className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">{confirmedGuests.length}</div>
                  <span className="text-[10px] text-emerald-600">Presenças garantidas</span>
                </div>
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 rounded-2xl">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase block">Pendentes</span>
                  <div className="text-xl font-bold text-amber-800 dark:text-amber-300 mt-1">{pendingGuests.length}</div>
                  <span className="text-[10px] text-amber-600">Aguardando resposta</span>
                </div>
                <div className="p-4 bg-rose-50/60 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800 rounded-2xl">
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold uppercase block">Tarefas Concluídas</span>
                  <div className="text-xl font-bold text-rose-800 dark:text-rose-300 mt-1">
                    {todoList.length > 0 ? `${Math.round((completedTasks.length / todoList.length) * 100)}%` : '100%'}
                  </div>
                  <span className="text-[10px] text-rose-600">{completedTasks.length} de {todoList.length} itens</span>
                </div>
              </div>

              {/* Login Credentials */}
              <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-rose-800 dark:text-rose-400" />
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Credenciais de Acesso do Casal</h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Contas geradas no cadastro</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clientCreds.length > 0 ? clientCreds.map((cred, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                        <span>Usuário {idx + 1}</span>
                        <button
                          onClick={() => handleCopy(`Usuário: ${cred.username} | Senha: ${cred.pass}`, `cred_${idx}`)}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-sans"
                        >
                          {copiedKey === `cred_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === `cred_${idx}` ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <div className="font-mono text-xs">
                        <div className="text-slate-800 dark:text-slate-200">
                          <strong className="font-semibold text-slate-500">Login:</strong> {cred.username}
                        </div>
                        <div className="text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                          <strong className="font-semibold text-slate-500">Senha:</strong> {cred.pass}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-slate-400 italic p-3">Nenhuma credencial gerada separadamente.</div>
                  )}
                </div>
              </div>

              {/* Ceremony Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-2xl space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs">Informações da Cerimônia</h4>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <div><strong>Noivo:</strong> {config?.brideGroom?.groomName || 'Não definido'}</div>
                    <div><strong>Noiva:</strong> {config?.brideGroom?.brideName || 'Não definido'}</div>
                    <div><strong>Data & Hora:</strong> {config?.date ? new Date(config.date).toLocaleString('pt-BR') : 'A definir'}</div>
                    <div><strong>E-mail:</strong> {client.clientEmail}</div>
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-2xl space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs">Configuração Visual</h4>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <div><strong>Tema Ativo:</strong> {config?.theme?.name || 'Romance Clássico'}</div>
                    <div><strong>Mensagem aos Convidados:</strong> "{config?.customFooter || 'Com amor, sempre.'}"</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GUESTS LIST */}
          {activeSubTab === 'guests' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Lista Completa de Convidados</h4>
                <span className="text-[10px] text-slate-400">{clientGuests.length} convidados no cadastro</span>
              </div>
              {clientGuests.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic">O casal ainda não adicionou convidados.</div>
              ) : (
                <div className="border border-slate-150 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-150 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Convidado</th>
                        <th className="p-3">Mesa / Categoria</th>
                        <th className="p-3">Status RSVP</th>
                        <th className="p-3">Acompanhantes</th>
                        <th className="p-3">Check-In Portaria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {clientGuests.map(g => (
                        <tr key={g.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white">{g.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{g.phone || g.email || 'Sem contato'}</div>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-semibold">{g.group}</span>
                            <div className="text-[10px] text-slate-400 mt-0.5">Mesa: {g.tableNumber || 'Não atribuída'}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              g.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              g.status === 'Declined' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {g.status === 'Confirmed' ? 'Confirmado' : g.status === 'Declined' ? 'Recusado' : 'Pendente'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            +{g.plusOnesConfirmed ?? g.maxPlusOnes ?? 0}
                          </td>
                          <td className="p-3">
                            {g.checkedIn ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: VENUE */}
          {activeSubTab === 'venue' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-150 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-rose-800 dark:text-rose-400" />
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{config?.venue?.ceremonyName || 'Espaço do Evento'}</h4>
                      <p className="text-xs text-slate-400">{config?.venue?.ceremonyAddress || 'Localização a definir'}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300">
                    Capacidade: {config?.venue?.capacity || 200} convidados
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TASKS */}
          {activeSubTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Lista de Afazeres</h4>
                <span className="text-[10px] text-slate-400">{completedTasks.length} de {todoList.length} concluídas</span>
              </div>
              {todoList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic">Nenhuma tarefa criada.</div>
              ) : (
                <div className="space-y-2">
                  {todoList.map(task => (
                    <div 
                      key={task.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        task.completed ? 'bg-slate-50 dark:bg-slate-800/60 opacity-60' : 'bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 dark:text-white">{task.label}</div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{task.urgency}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: GIFTS */}
          {activeSubTab === 'gifts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Lista de Presentes do Casal</h4>
                <span className="text-[10px] text-slate-400">{registryItems.length} presentes cadastrados</span>
              </div>
              {registryItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic">Nenhum presente cadastrado pelo casal.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {registryItems.map(item => (
                    <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                      <img src={item.imageUrl} alt={item.name} referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg object-cover bg-white" />
                      <div className="flex-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-white">{item.name}</div>
                        <div className="text-rose-800 dark:text-rose-400 font-bold text-xs">{item.price.toLocaleString('pt-AO')} Kz</div>
                        {item.claimedBy && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">Presenteado por: {item.claimedBy}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fechar Visualização
          </button>
        </div>
      </motion.div>
    </div>
  );
}
