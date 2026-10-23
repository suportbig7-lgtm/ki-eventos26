import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, Search, UserCheck, CheckCircle, 
  Clock, ArrowRight, Play, Shield, RefreshCw, LogOut, Check, Camera, CameraOff, AlertTriangle,
  Minus, Plus, X, Utensils, FileText, Mail, Phone, MapPin 
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Guest } from '../types';

interface GatekeeperPortalProps {
  guests: Guest[];
  onCheckIn: (id: string, plusOnesCount: number) => void;
  clientName: string;
  onExitPortal: () => void;
  isLocked?: boolean;
}

export interface CheckInLog {
  id: string;
  name: string;
  table: string;
  timestamp: string;
  plusOnes: number;
}

export default function GatekeeperPortal({ 
  guests, 
  onCheckIn, 
  clientName,
  onExitPortal,
  isLocked = false 
}: GatekeeperPortalProps) {
  const [mobileTab, setMobileTab] = useState<'scan' | 'search' | 'logs'>('scan');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScanGuestId, setSelectedScanGuestId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Guest | null>(null);
  const [errorText, setErrorText] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanningError, setScanningError] = useState<string>('');
  const [selectedManualGuest, setSelectedManualGuest] = useState<Guest | null>(null);
  const [manualCompanions, setManualCompanions] = useState<number>(0);
  const [logHistory, setLogHistory] = useState<CheckInLog[]>([]);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const checkedInGuests = guests
      .filter(g => g.checkedIn)
      .map(g => ({
        id: 'l_' + g.id,
        name: g.name,
        table: g.tableNumber,
        timestamp: g.checkedInAt ? new Date(g.checkedInAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('pt-AO'),
        plusOnes: g.plusOnesConfirmed || 0
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setLogHistory(checkedInGuests);
  }, [guests]);

  const eligibleGuests = guests.filter(g => g.status === 'Confirmed' && !g.checkedIn);

  const startCameraScanner = async () => {
    setErrorText('');
    setScanningError('');
    setIsScanning(true);
    try {
      const elementId = "qr-reader-viewport";
      const element = document.getElementById(elementId);
      if (!element) return;

      if (qrScannerRef.current) {
        try {
          await qrScannerRef.current.stop();
        } catch (e) {}
      }

      const scanner = new Html5Qrcode(elementId);
      qrScannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            return {
              width: Math.floor(minSize * 0.72),
              height: Math.floor(minSize * 0.72)
            };
          }
        },
        (decodedText) => {
          handleQrDecoded(decodedText);
        },
        () => {}
      );
      setCameraActive(true);
      setIsScanning(false);
    } catch (err: any) {
      setCameraActive(false);
      setIsScanning(false);
      setScanningError(err.message || "Permissão de câmera não concedida.");
    }
  };

  const stopCameraScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
      } catch (e) {}
    }
    setCameraActive(false);
  };

  const handleQrDecoded = (text: string) => {
    let token = text.trim();
    if (token.startsWith('rsvp:')) {
      token = token.replace('rsvp:', '');
    }
    const norm = (t: string) => (t || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const guest = guests.find(g => 
      norm(g.rsvpToken) === norm(token) || 
      g.id.toLowerCase() === token.toLowerCase()
    );

    if (guest) {
      if (guest.checkedIn) {
        setErrorText(`Atenção: Convidado "${guest.name}" já realizou check-in anteriormente!`);
      } else {
        onCheckIn(guest.id, guest.maxPlusOnes);
        setScanResult(guest);
        setErrorText('');
        stopCameraScanner();
      }
    } else {
      setErrorText(`QR Code inválido ou não cadastrado (${token}).`);
    }
  };

  const handleSimulateScan = () => {
    if (!selectedScanGuestId) {
      setErrorText('Por favor, selecione um convite para simular.');
      return;
    }
    setErrorText('');
    setIsScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setIsScanning(false);
      const guest = guests.find(g => g.id === selectedScanGuestId);
      if (guest) {
        onCheckIn(guest.id, guest.maxPlusOnes);
        setScanResult(guest);
        setSelectedScanGuestId('');
      }
    }, 800);
  };

  const handleManualCheckIn = (guest: Guest) => {
    setSelectedManualGuest(guest);
    setManualCompanions(guest.plusOnesConfirmed || 0);
    setErrorText('');
  };

  const handleExecuteManualCheckIn = () => {
    if (!selectedManualGuest) return;
    onCheckIn(selectedManualGuest.id, manualCompanions);
    const updatedGuest = {
      ...selectedManualGuest,
      checkedIn: true,
      plusOnesConfirmed: manualCompanions
    };
    setScanResult(updatedGuest);
    setSelectedManualGuest(null);
    setErrorText('');
  };

  const filteredManualGuests = guests.filter(g => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return !g.checkedIn;
    return (
      (g.name || '').toLowerCase().includes(term) ||
      (g.tableNumber || '').toLowerCase().includes(term) ||
      (g.rsvpToken || '').toLowerCase().includes(term) ||
      (g.phone || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between" id="gatekeeper-portal-section">
      {/* Header bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-800 text-white rounded-xl">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-wide">Portaria do Casamento</h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Casamento: <span className="text-rose-400 font-bold">{clientName}</span>
            </p>
          </div>
        </div>

        {!isLocked && (
          <button
            onClick={onExitPortal}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-800 text-slate-400 hover:text-white bg-slate-900 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>
        )}
      </header>

      {/* Main Grid content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: LIVE SCANNER VIEWPORT */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-rose-400 bg-rose-950/40 border border-rose-900/40 px-2.5 py-0.5 rounded-full">
                Leitura em Tempo Real
              </span>
              <div className="flex gap-2">
                {cameraActive ? (
                  <button 
                    onClick={stopCameraScanner}
                    className="flex items-center gap-1 text-[11px] bg-slate-900 text-slate-400 px-3 py-1 rounded-lg border border-slate-800 cursor-pointer"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Desligar</span>
                  </button>
                ) : (
                  <button 
                    onClick={startCameraScanner}
                    className="flex items-center gap-1 text-[11px] bg-rose-900 text-white px-3 py-1 rounded-lg font-bold cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ligar Câmera</span>
                  </button>
                )}
              </div>
            </div>
            <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-rose-500" />
              Scanner de Passes dos Convidados
            </h2>
            <p className="text-xs text-slate-400">
              Aponte a câmera para o QR Code do bilhete digital do convidado.
            </p>
          </div>

          {/* Viewport */}
          <div className="relative aspect-video max-w-md mx-auto w-full bg-slate-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4 border border-slate-800">
            <div 
              id="qr-reader-viewport"
              className={`absolute inset-0 w-full h-full object-cover z-0 ${cameraActive ? 'block' : 'hidden'}`}
            />

            {cameraActive && (
              <motion.div
                initial={{ top: '5%' }}
                animate={{ top: '95%' }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_15px_3px_rgba(239,68,68,0.9)] z-10 pointer-events-none"
              />
            )}

            <AnimatePresence mode="wait">
              {scanResult ? (
                <motion.div
                  key="result"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="text-center space-y-3 z-20 text-white p-5 w-full max-w-sm bg-slate-950 border border-emerald-500/30 rounded-2xl shadow-2xl"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-1 border border-emerald-500/30">
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-white">{scanResult.name}</div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-full inline-block">
                      Acesso Liberado ✓
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-left text-xs text-slate-400">
                    <div>
                      <span className="text-[9px] block text-slate-500 uppercase font-semibold">Mesa</span>
                      <strong className="text-white font-mono">{scanResult.tableNumber || 'Sem Mesa'}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] block text-slate-500 uppercase font-semibold">Lugares</span>
                      <strong className="text-white font-mono">{1 + (scanResult.plusOnesConfirmed || 0)} Assento(s)</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setScanResult(null);
                      startCameraScanner();
                    }}
                    className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Escanear Próximo
                  </button>
                </motion.div>
              ) : !cameraActive ? (
                <div className="text-center space-y-2 z-10 text-slate-400 p-4">
                  <QrCode className="w-12 h-12 text-slate-700 mx-auto" />
                  <p className="text-xs">Câmera desligada. Ligue a câmera ou utilize o simulador / busca manual abaixo.</p>
                </div>
              ) : null}
            </AnimatePresence>
          </div>

          {errorText && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/40 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Simulator Panel */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <label className="block text-slate-400 font-bold text-[10px] uppercase tracking-wider">
              Simulador de Teste Rápido
            </label>
            <div className="flex gap-2">
              <select
                value={selectedScanGuestId}
                onChange={e => setSelectedScanGuestId(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="">-- Selecione convidado para testar --</option>
                {eligibleGuests.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} · Mesa: {g.tableNumber}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSimulateScan}
                disabled={isScanning || !selectedScanGuestId}
                className="flex items-center gap-1 bg-rose-800 hover:bg-rose-900 disabled:opacity-40 text-white rounded-lg text-xs font-bold px-3 py-1.5 cursor-pointer"
              >
                <Play className="w-3 h-3" />
                Simular
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MANUAL SEARCH & LOGS */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              Busca Rápida & Check-in Manual
            </h3>
            <input
              type="text"
              placeholder="Digite o nome do convidado..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-800 font-medium"
            />
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {filteredManualGuests.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">Nenhum convidado pendente encontrado.</div>
              ) : (
                filteredManualGuests.slice(0, 15).map(guest => (
                  <div key={guest.id} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-white block">{guest.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Mesa: {guest.tableNumber}</span>
                    </div>
                    <button
                      onClick={() => handleManualCheckIn(guest)}
                      className="px-3 py-1 bg-emerald-950/60 text-emerald-300 border border-emerald-900/40 rounded-lg text-xs font-bold hover:bg-emerald-900/60 cursor-pointer"
                    >
                      Check-in
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Histórico de Entradas
              </h3>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded-full">{logHistory.length} presentes</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {logHistory.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">Nenhum check-in registrado ainda.</div>
              ) : (
                logHistory.map(log => (
                  <div key={log.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800/60 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-white block">{log.name}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">Mesa: {log.table}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Manual Check-in Modal */}
      <AnimatePresence>
        {selectedManualGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">Confirmar Entrada Manual</h3>
                <button onClick={() => setSelectedManualGuest(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Convidado</span>
                  <strong className="text-white text-sm">{selectedManualGuest.name}</strong>
                  <span className="text-slate-400 font-mono block mt-0.5">Mesa: {selectedManualGuest.tableNumber}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block text-[10px] uppercase">Acompanhantes Entrando</label>
                  <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setManualCompanions(prev => Math.max(0, prev - 1))}
                      className="w-7 h-7 bg-slate-800 rounded flex items-center justify-center text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold font-mono text-white text-sm flex-1 text-center">{manualCompanions}</span>
                    <button
                      type="button"
                      onClick={() => setManualCompanions(prev => Math.min(selectedManualGuest.maxPlusOnes, prev + 1))}
                      className="w-7 h-7 bg-slate-800 rounded flex items-center justify-center text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleExecuteManualCheckIn}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  Liberar Entrada
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
