import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, Search, UserCheck, CheckCircle, 
  Clock, ArrowRight, Play, RefreshCw, X, 
  Camera, CameraOff, AlertTriangle, Check, Link2, Copy 
} from 'lucide-react';
import { Guest } from '../types';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCheckInProps {
  guests: Guest[];
  onCheckIn: (id: string, plusOnesCount: number) => void;
  clientId: string;
}

export interface CheckInLog {
  id: string;
  name: string;
  table: string;
  timestamp: string;
  plusOnes: number;
}

export default function QRCheckIn({ guests, onCheckIn, clientId }: QRCheckInProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScanGuestId, setSelectedScanGuestId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Guest | null>(null);
  const [logHistory, setLogHistory] = useState<CheckInLog[]>([]);
  const [errorText, setErrorText] = useState('');
  const [scanMode, setScanMode] = useState<'simulate' | 'camera'>('simulate');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanningError, setScanningError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const checkedIn = guests
      .filter(g => g.checkedIn)
      .map(g => ({
        id: 'l_' + g.id,
        name: g.name,
        table: g.tableNumber,
        timestamp: g.checkedInAt ? new Date(g.checkedInAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
        plusOnes: g.plusOnesConfirmed
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setLogHistory(checkedIn);
  }, [guests]);

  const eligibleGuests = guests.filter(g => g.status === 'Confirmed' && !g.checkedIn);

  useEffect(() => {
    if (scanMode === 'camera') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [scanMode]);

  const startCameraScanner = async () => {
    setErrorText('');
    setScanningError('');
    setIsScanning(true);
    setScanResult(null);
    try {
      const elementId = "qr-reader-viewport-dashboard";
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
        { facingMode: "environment" },
        {
          fps: 20,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            return {
              width: Math.floor(minSize * 0.75),
              height: Math.floor(minSize * 0.75)
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
      setScanningError(err.message || "Dispositivo de vídeo indisponível.");
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
        setErrorText(`Aviso: O convidado "${guest.name}" já realizou check-in!`);
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
      setErrorText('Selecione o convite de um convidado para simular.');
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
    }, 700);
  };

  const handleManualCheckIn = (guest: Guest) => {
    onCheckIn(guest.id, guest.maxPlusOnes);
    setScanResult(guest);
    setErrorText('');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?portaria=true&clientId=${clientId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredManualGuests = guests.filter(g => 
    !g.checkedIn && g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100" id="wedding-event-checkin">
      {/* LINK GENERATOR FOR SECURITY STAFF */}
      <div className="bg-slate-900 dark:bg-slate-950 p-5 rounded-2xl border border-slate-800 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded-full inline-block">
            Link Externo para Portaria
          </span>
          <h4 className="font-bold text-sm">Link Seguro para Recepcionistas & Porteiros</h4>
          <p className="text-xs text-slate-400 max-w-xl">
            Abra diretamente a tela de leitura de passes da portaria em qualquer smartphone.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SCANNING STATION */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Leitor de Portaria</h3>
              <p className="text-xs text-slate-400">Validação instantânea por QR Code ou simulação</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setScanMode('simulate')}
                className={`px-3 py-1 rounded-lg font-bold ${scanMode === 'simulate' ? 'bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-400 shadow-xs' : 'text-slate-500'}`}
              >
                Simulador
              </button>
              <button
                onClick={() => setScanMode('camera')}
                className={`px-3 py-1 rounded-lg font-bold ${scanMode === 'camera' ? 'bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-400 shadow-xs' : 'text-slate-500'}`}
              >
                Câmera Real
              </button>
            </div>
          </div>

          {/* Viewport */}
          <div className="relative aspect-video max-w-md mx-auto w-full bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4 border border-slate-900">
            <div 
              id="qr-reader-viewport-dashboard"
              className={`absolute inset-0 w-full h-full object-cover z-0 ${scanMode === 'camera' && cameraActive ? 'block' : 'hidden'}`}
            />

            {((scanMode === 'simulate' && isScanning) || (scanMode === 'camera' && cameraActive)) && (
              <motion.div
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.8)] z-10 pointer-events-none"
              />
            )}

            <AnimatePresence mode="wait">
              {scanResult ? (
                <motion.div
                  key="result"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="text-center space-y-3 z-10 text-white p-5 w-full bg-slate-950/90 rounded-2xl border border-emerald-500/25 max-w-sm shadow-xl"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-sm">{scanResult.name}</div>
                  <div className="text-[10px] text-emerald-400 font-mono font-bold uppercase">Acesso Liberado ✓</div>
                  <div className="text-xs text-slate-400">Mesa: <strong className="text-white font-mono">{scanResult.tableNumber}</strong></div>
                  <button
                    onClick={() => {
                      setScanResult(null);
                      if (scanMode === 'camera') startCameraScanner();
                    }}
                    className="mt-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Próximo Convidado
                  </button>
                </motion.div>
              ) : !cameraActive && scanMode === 'camera' ? (
                <div className="text-center space-y-2 text-slate-400 p-4">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs">Câmera não iniciada ou sem permissão.</p>
                </div>
              ) : (
                <div className="text-center space-y-2 text-slate-400 p-4">
                  <QrCode className="w-12 h-12 text-slate-700 mx-auto" />
                  <p className="text-xs">Posicione o passe digital do convidado para leitura.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          {scanMode === 'simulate' ? (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Simulador Rápido</label>
              <div className="flex gap-2">
                <select
                  value={selectedScanGuestId}
                  onChange={e => setSelectedScanGuestId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="">-- Selecione convidado --</option>
                  {eligibleGuests.map(g => (
                    <option key={g.id} value={g.id}>{g.name} (Mesa: {g.tableNumber})</option>
                  ))}
                </select>
                <button
                  onClick={handleSimulateScan}
                  disabled={!selectedScanGuestId || isScanning}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  Simular
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>{cameraActive ? 'Câmera conectada' : 'Aguardando câmera'}</span>
              {cameraActive && (
                <button
                  onClick={stopCameraScanner}
                  className="text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  Desligar Câmera
                </button>
              )}
            </div>
          )}

          {errorText && (
            <div className="text-xs text-rose-700 dark:text-rose-400 font-bold">{errorText}</div>
          )}
        </div>

        {/* MANUAL LOOKUP & LOGS */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Check-in Manual
            </h4>
            <input
              type="text"
              placeholder="Buscar nome do convidado..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {filteredManualGuests.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">Nenhum convidado pendente.</div>
              ) : (
                filteredManualGuests.slice(0, 5).map(g => (
                  <div key={g.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <strong className="block text-slate-800 dark:text-white">{g.name}</strong>
                      <span className="text-[10px] text-slate-400">{g.tableNumber}</span>
                    </div>
                    <button
                      onClick={() => handleManualCheckIn(g)}
                      className="px-2.5 py-1 bg-rose-800 text-white rounded text-[10px] font-bold"
                    >
                      Check-in
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Histórico ({logHistory.length} presentes)
            </h4>
            <div className="max-h-52 overflow-y-auto space-y-2 text-xs">
              {logHistory.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">Nenhuma entrada ainda.</div>
              ) : (
                logHistory.map(log => (
                  <div key={log.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg flex justify-between items-center">
                    <div>
                      <strong className="text-slate-900 dark:text-white block">{log.name}</strong>
                      <span className="text-[10px] text-slate-400">{log.table}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
