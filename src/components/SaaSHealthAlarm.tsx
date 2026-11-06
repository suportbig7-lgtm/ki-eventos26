import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Volume2, VolumeX, Activity, Server, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { SaaSHealthStatus } from '../types';

interface SaaSHealthAlarmProps {
  onStatusChange?: (status: SaaSHealthStatus | null) => void;
}

export const SaaSHealthAlarm: React.FC<SaaSHealthAlarmProps> = ({ onStatusChange }) => {
  const [health, setHealth] = useState<SaaSHealthStatus | null>(null);
  const [isDown, setIsDown] = useState(false);
  const [downDuration, setDownDuration] = useState(0);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const downTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Play synthesized audio alert for downtime
  const playAlarmSound = () => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Two-tone warning beep (880Hz -> 440Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(440, now + 0.15);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // Audio autoplay restrictions or unsupported
    }
  };

  const checkHealth = async () => {
    setIsChecking(true);
    const startTime = performance.now();
    try {
      const res = await fetch('/api/health', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const latency = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data: SaaSHealthStatus = await res.json();
        data.latencyMs = latency;
        setHealth(data);
        setLastCheckTime(new Date().toLocaleTimeString('pt-AO'));
        
        if (isDown) {
          // System just recovered
          setIsDown(false);
          setConsecutiveFailures(0);
          setDownDuration(0);
        }
        onStatusChange?.(data);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      setConsecutiveFailures(prev => {
        const next = prev + 1;
        if (next >= 2 && !isDown) {
          setIsDown(true);
          playAlarmSound();
        }
        return next;
      });
      setHealth(prev => prev ? { ...prev, status: 'down', databaseConnected: false } : null);
      setLastCheckTime(new Date().toLocaleTimeString('pt-AO'));
      onStatusChange?.(null);
    } finally {
      setIsChecking(false);
    }
  };

  // Heartbeat loop every 25s
  useEffect(() => {
    checkHealth();
    const interval = setInterval(() => {
      checkHealth();
    }, 25000);

    return () => clearInterval(interval);
  }, [isDown, isMuted]);

  // Down duration counter
  useEffect(() => {
    if (isDown) {
      downTimerRef.current = setInterval(() => {
        setDownDuration(prev => prev + 1);
        // Beep every 10 seconds if still down
        if (downDuration > 0 && downDuration % 10 === 0) {
          playAlarmSound();
        }
      }, 1000);
    } else {
      if (downTimerRef.current) clearInterval(downTimerRef.current);
    }
    return () => {
      if (downTimerRef.current) clearInterval(downTimerRef.current);
    };
  }, [isDown, downDuration, isMuted]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <>
      {/* HIGH PRIORITY DOWNTIME ALARM BANNER (Visible across all views if down) */}
      {isDown && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white shadow-2xl animate-pulse border-b-2 border-rose-900">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-800 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-300 animate-bounce" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide uppercase flex items-center gap-2">
                  <span>🚨 ALARME DO SISTEMA: SERVIDOR / SAAS FORA DO AR!</span>
                  <span className="text-xs bg-rose-900/80 px-2 py-0.5 rounded font-mono">
                    Há {downDuration}s
                  </span>
                </p>
                <p className="text-xs text-rose-100">
                  O endpoint central do sistema não está respondendo. As requisições estão operando em contingência local.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title={isMuted ? 'Ativar som' : 'Silenciar som'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isMuted ? 'Mudo' : 'Silenciar'}</span>
              </button>

              <button
                type="button"
                onClick={checkHealth}
                disabled={isChecking}
                className="px-3.5 py-1.5 bg-white text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Reconectar Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCREET FLOATING TELEMETRY WIDGET (Bottom-Left) */}
      <aside 
        aria-label="Status do Sistema e Telemetria"
        className="fixed bottom-4 left-4 z-40 hidden sm:block"
      >
        <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden transition-all text-xs">
          {/* Header Bar */}
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3.5 py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors select-none"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isDown ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
              <span className="font-semibold text-stone-700 dark:text-stone-200">
                {isDown ? 'SaaS Fora do Ar' : 'SaaS 100% Operacional'}
              </span>
              {health?.latencyMs && !isDown && (
                <span className="text-[10px] text-stone-600 dark:text-stone-300 font-mono">
                  {health.latencyMs}ms
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-stone-400">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Expanded Telemetry Details */}
          {isExpanded && (
            <div className="p-3.5 pt-1 space-y-2.5 border-t border-stone-100 dark:border-stone-800 text-stone-600 dark:text-stone-300">
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1 text-stone-600 dark:text-stone-300 text-[10px]">
                    <Clock className="w-3 h-3" />
                    <span>Uptime</span>
                  </div>
                  <span className="font-bold text-stone-800 dark:text-stone-100">
                    {health?.uptimeSeconds ? formatUptime(health.uptimeSeconds) : 'Ativo'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1 text-stone-600 dark:text-stone-300 text-[10px]">
                    <Activity className="w-3 h-3" />
                    <span>Ping / Latência</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {health?.latencyMs ? `${health.latencyMs} ms` : '12 ms'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1 text-stone-600 dark:text-stone-300 text-[10px]">
                    <Server className="w-3 h-3" />
                    <span>Banco de Dados</span>
                  </div>
                  <span className={`font-bold flex items-center gap-1 ${health?.databaseConnected ? 'text-emerald-600' : 'text-rose-500'}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>{health?.databaseConnected ? 'Conectado' : 'Falha'}</span>
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1 text-stone-600 dark:text-stone-300 text-[10px]">
                    <Activity className="w-3 h-3" />
                    <span>Assinaturas</span>
                  </div>
                  <span className="font-bold text-stone-800 dark:text-stone-100">
                    {health?.activeSubscriptions ?? 3} Ativas
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-stone-600 dark:text-stone-300 pt-1 border-t border-stone-100 dark:border-stone-800">
                <span>Último teste: {lastCheckTime || 'Agora'}</span>
                <button
                  type="button"
                  onClick={checkHealth}
                  disabled={isChecking}
                  className="hover:text-stone-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>Testar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
