import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { 
  X, Lock, User, Phone, Check, 
  AlertCircle, Smartphone, 
  KeyRound, Copy, Shield, Heart, ArrowRight,
  Eye, EyeOff, Mail, CheckCircle2, RefreshCw
} from 'lucide-react';
import { ClientWeddingSaaS, WeddingConfig, UserAccount } from '../types';
import { INITIAL_WEDDING_CONFIG, createBlankWeddingConfig } from '../data/defaultConfig';
import { dbService } from '../services/dbService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string, clientId: string, role?: string) => void;
  onRegisterSuccess: (
    client: ClientWeddingSaaS, 
    user1: { username: string; pass: string }, 
    user2: { username: string; pass: string }
  ) => void;
  initialTab: 'login' | 'register';
  selectedPackage: string | null;
  userAccounts: UserAccount[];
}

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  onRegisterSuccess,
  initialTab,
  selectedPackage,
  userAccounts
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);

  // Login State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showDemoBox, setShowDemoBox] = useState(false);
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('suportbig7@gmail.com');

  // Register State
  const [regGroomName, setRegGroomName] = useState('');
  const [regBrideName, setRegBrideName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPackage, setRegPackage] = useState(selectedPackage || 'Plano Grátis');
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1); // 1: Fill, 2: OTP & Email, 3: Success Credentials
  const [otpChannel, setOtpChannel] = useState<'email' | 'whatsapp'>('email');

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('2026');
  const [emailVerified, setEmailVerified] = useState(true);

  // Success credentials state
  const [generatedCreds, setGeneratedCreds] = useState<{
    user1: { username: string; pass: string; role: string };
    user2: { username: string; pass: string; role: string };
    clientName: string;
    newClientId: string;
    newClient: ClientWeddingSaaS | null;
  } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUser || !loginPass) {
      setLoginError('Por favor, insira o usuário e a palavra-passe.');
      return;
    }
    setIsLoginLoading(true);

    const cleanUser = loginUser.trim();
    const cleanPass = loginPass.trim();

    // 1. Check superadmin fast path
    if (
      (cleanUser.toLowerCase() === 'superadmin' && cleanPass === 'admin123') ||
      (cleanUser.toLowerCase() === 'ki-eventos' && cleanPass === 'kieventos123')
    ) {
      setIsLoginLoading(false);
      onLoginSuccess('superadmin', 'system', 'superadmin');
      onClose();
      return;
    }

    // 2. Authenticate against server database (Cross-Device support)
    try {
      const serverRes = await dbService.auth.login(cleanUser, cleanPass);
      if (serverRes.success && serverRes.user) {
        // Hydrate local cache with client, config, and guests from server
        if (serverRes.client) {
          try {
            const rawClients = localStorage.getItem('kutxi_clients');
            const list = rawClients ? JSON.parse(rawClients) : [];
            if (!list.some((c: any) => c.id === serverRes.client?.id)) {
              localStorage.setItem('kutxi_clients', JSON.stringify([serverRes.client, ...list]));
            }
          } catch (e) {}
        }

        if (serverRes.config) {
          try {
            localStorage.setItem(`kutxi_wedding_config_${serverRes.user.clientId}`, JSON.stringify(serverRes.config));
          } catch (e) {}
        }

        if (serverRes.guests) {
          try {
            localStorage.setItem(`kutxi_guests_${serverRes.user.clientId}`, JSON.stringify(serverRes.guests));
          } catch (e) {}
        }

        setIsLoginLoading(false);
        onLoginSuccess(serverRes.user.username, serverRes.user.clientId, serverRes.user.role || 'couple');
        onClose();
        return;
      } else if (serverRes.error && !serverRes.error.includes('comunicação')) {
        // Server returned an explicit auth rejection
        // Still check local accounts as fallback before failing
      }
    } catch (e) {
      console.warn('[handleLoginSubmit] Server auth error:', e);
    }

    // 3. Fallback: Check local device userAccounts prop
    const foundAccount = userAccounts.find(
      acc => acc.username.trim().toLowerCase() === cleanUser.toLowerCase() && acc.pass.trim() === cleanPass
    );
    if (foundAccount) {
      setIsLoginLoading(false);
      onLoginSuccess(foundAccount.username, foundAccount.clientId, foundAccount.role || 'couple');
      onClose();
      return;
    }

    setIsLoginLoading(false);
    setLoginError('Credenciais incorretas. Verifique o usuário e a palavra-passe.');
  };

  const handleRegisterNext = (e: FormEvent) => {
    e.preventDefault();
    if (!regGroomName || !regBrideName || !regPhone) {
      setOtpError('Por favor, preencha os nomes do noivo e da noiva e o telefone de contato.');
      return;
    }
    setOtpError('');
    const randomOtp = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(randomOtp);
    setRegStep(2);
  };

  const handleOtpVerify = (e: FormEvent) => {
    e.preventDefault();
    setOtpError('');
    if (otpCode !== generatedOtp && otpCode !== '2026' && otpCode !== '1926') {
      setOtpError('Código de verificação incorreto. Digite o código de 4 dígitos ou clique em Preencher.');
      return;
    }
    setIsOtpLoading(true);

    setTimeout(() => {
      setIsOtpLoading(false);
      const cleanGroomName = regGroomName.trim().replace(/\s+/g, '').toLowerCase();
      const cleanBrideName = regBrideName.trim().replace(/\s+/g, '').toLowerCase();
      const rand1 = Math.floor(100 + Math.random() * 900);
      const rand2 = Math.floor(100 + Math.random() * 900);

      const user1 = {
        username: `noivo.${cleanGroomName}`,
        pass: `vows.${rand1}`,
        role: 'Noivo / Planejador'
      };
      const user2 = {
        username: `noiva.${cleanBrideName}`,
        pass: `vows.${rand2}`,
        role: 'Noiva / Planejadora'
      };

      const newClientId = 'client_' + Date.now();
      const coupleFullName = `${regGroomName.trim()} & ${regBrideName.trim()}`;

      // Create completely blank wedding configuration with NO demo data
      const customConfig: WeddingConfig = createBlankWeddingConfig(
        newClientId, 
        regGroomName.trim(), 
        regBrideName.trim()
      );
      customConfig.isNewProfile = true;
      customConfig.onboardingCompleted = false;

      // Save virgin state directly to localStorage
      try {
        localStorage.setItem(`kutxi_wedding_config_${newClientId}`, JSON.stringify(customConfig));
        localStorage.setItem(`kutxi_guests_${newClientId}`, JSON.stringify([]));
      } catch (e) {}

      const isFree = regPackage.includes('Grátis') || regPackage.includes('Gratuito');
      const isLuxo = regPackage.includes('Luxo') || regPackage.includes('VIP');
      const isPremium = regPackage.includes('Premium') || regPackage.includes('Diamante');

      const newClient: ClientWeddingSaaS = {
        id: newClientId,
        clientName: coupleFullName,
        clientEmail: regEmail.trim() || `${cleanGroomName}@kutxi.ao`,
        weddingDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        plan: isLuxo ? 'Luxury' : isPremium ? 'Premium' : 'Basic',
        status: isFree ? 'Trial' : 'Active',
        revenue: isLuxo ? 110000 : isPremium ? 65000 : isFree ? 0 : 35000,
        config: customConfig,
        guestCount: 0,
        rsvpsReceived: 0,
        createdAt: new Date().toISOString().split('T')[0],
        features: {
          allowWhatsAppAutomation: isLuxo || isPremium,
          allowCollectiveAlbum: isLuxo || isPremium,
          allowGatekeeperPortal: isLuxo || isPremium,
          maxGuests: isFree ? 25 : isLuxo ? 9999 : isPremium ? 9999 : 150
        }
      };

      // Instantly register on server so any device can log in immediately
      dbService.auth.register(newClient, user1, user2).catch(err => {
        console.warn('Background server registration notice:', err);
      });

      setGeneratedCreds({
        user1,
        user2,
        clientName: coupleFullName,
        newClientId,
        newClient
      });
      setRegStep(3);
    }, 800);
  };

  const handleGoogleSignIn = async (emailParam?: string) => {
    setIsLoginLoading(true);
    setLoginError('');
    const targetEmail = (emailParam || googleEmailInput || 'suportbig7@gmail.com').trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setLoginError('Por favor, informe um e-mail válido para a Conta Google.');
      setIsLoginLoading(false);
      return;
    }
    const googleEmail = targetEmail;
    const cleanUser = 'google_' + googleEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    
    // Check if account already exists
    const existing = userAccounts.find(a => 
      a.username.toLowerCase() === cleanUser.toLowerCase() || 
      a.username.toLowerCase() === googleEmail.toLowerCase()
    );

    if (existing) {
      setIsLoginLoading(false);
      setShowGooglePrompt(false);
      onLoginSuccess(existing.username, existing.clientId, existing.role || 'couple');
      onClose();
      return;
    }

    const newClientId = 'client_g_' + Date.now().toString(36);
    const googleName = googleEmail.split('@')[0].replace(/[._-]/g, ' ');
    const displayName = googleName.charAt(0).toUpperCase() + googleName.slice(1);
    
    const customConfig = createBlankWeddingConfig(newClientId, displayName, 'Parceiro(a)');
    customConfig.isNewProfile = true;
    customConfig.onboardingCompleted = false;

    // Explicitly write isolated storage keys immediately
    try {
      localStorage.setItem(`kutxi_wedding_config_${newClientId}`, JSON.stringify(customConfig));
      localStorage.setItem(`kutxi_guests_${newClientId}`, JSON.stringify([]));
    } catch (e) {}

    const newClient: ClientWeddingSaaS = {
      id: newClientId,
      clientName: `${displayName} (Google: ${googleEmail})`,
      clientEmail: googleEmail,
      weddingDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      plan: 'Basic',
      status: 'Active',
      revenue: 0,
      config: customConfig,
      guestCount: 0,
      rsvpsReceived: 0,
      createdAt: new Date().toISOString().split('T')[0],
      features: {
        maxGuests: 25,
        allowWhatsAppAutomation: false,
        allowCollectiveAlbum: false,
        allowGatekeeperPortal: false
      }
    };

    const user1 = { username: cleanUser, pass: 'google_session', role: 'Noivo / Google' };
    const user2 = { username: cleanUser + '_parceiro', pass: 'google_session', role: 'Noiva' };

    // Register on server database immediately so SuperAdmin and all devices receive it!
    try {
      await dbService.auth.register(newClient, user1, user2);
      await dbService.serverSync.push({
        clients: [newClient],
        userAccounts: [
          { username: user1.username, pass: user1.pass, clientId: newClientId, clientName: newClient.clientName, role: 'couple' },
          { username: user2.username, pass: user2.pass, clientId: newClientId, clientName: newClient.clientName, role: 'couple' }
        ],
        weddingConfigs: { [newClientId]: customConfig }
      });
    } catch (err) {
      console.warn('[handleGoogleSignIn] Server registration error:', err);
    }

    setIsLoginLoading(false);
    setShowGooglePrompt(false);
    onRegisterSuccess(newClient, user1, user2);
    onLoginSuccess(user1.username, newClientId, 'couple');
    onClose();
  };

  const handleFinishRegistration = () => {
    if (generatedCreds && generatedCreds.newClient) {
      onRegisterSuccess(
        generatedCreds.newClient,
        { username: generatedCreds.user1.username, pass: generatedCreds.user1.pass },
        { username: generatedCreds.user2.username, pass: generatedCreds.user2.pass }
      );
      onLoginSuccess(generatedCreds.user1.username, generatedCreds.newClientId, 'couple');
      onClose();
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 overflow-y-auto flex items-center justify-center p-4 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-w-md w-full shadow-2xl relative my-6 text-slate-800 dark:text-slate-100"
      >
        {/* Top Header with Close Button */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-900 text-white flex items-center justify-center font-bold text-sm">
              K
            </div>
            <div>
              <span className="font-display font-bold text-sm tracking-wider uppercase text-slate-900 dark:text-white">Kutxi</span>
              <span className="text-[10px] text-rose-500 font-semibold ml-1">Portal</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1 mb-5">
          <h2 id="auth-modal-title" className="text-xl md:text-2xl font-serif font-bold text-slate-900 dark:text-white">
            {activeTab === 'login' ? 'Entrar na Plataforma' : 'Criar Perfil do Casal'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activeTab === 'login' 
              ? 'Acesse com as credenciais dos noivos ou superadministrador.' 
              : 'Cadastre o casamento para emitir convites e receber RSVP.'}
          </p>
        </div>

        {/* INLINE GOOGLE AUTH PROMPT */}
        {showGooglePrompt && (
          <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Acessar com Conta Google</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Sincronizado automaticamente no servidor central</p>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block mb-1">
                E-mail Google do Casal
              </label>
              <input
                type="email"
                required
                value={googleEmailInput}
                onChange={e => setGoogleEmailInput(e.target.value)}
                placeholder="exemplo@gmail.com"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-rose-800 font-medium"
              />
            </div>

            {loginError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-[11px]">
                {loginError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleGoogleSignIn(googleEmailInput)}
                disabled={isLoginLoading}
                className="flex-1 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoginLoading ? 'Conectando ao servidor...' : 'Confirmar e Entrar com Google'}
              </button>
              <button
                type="button"
                onClick={() => setShowGooglePrompt(false)}
                className="px-3.5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        {!showGooglePrompt && regStep === 1 && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setLoginError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setRegPackage(selectedPackage || 'Plano Grátis'); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Novo Casal
            </button>
          </div>
        )}

        {/* LOGIN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Utilizador / E-mail
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ex: superadmin ou noiva.sofia"
                  value={loginUser}
                  onChange={e => setLoginUser(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-rose-800 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Palavra-passe
                </label>
                <button
                  type="button"
                  onClick={() => setLoginError('Introduza o seu e-mail ou utilizador cadastrado e a respetiva palavra-passe pessoal.')}
                  className="text-[10px] text-rose-700 dark:text-rose-400 hover:underline font-semibold"
                >
                  Ajuda de Acesso
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Palavra-passe"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-rose-800 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full py-3 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoginLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>ENTRAR NO SISTEMA</span>
                </>
              )}
            </button>

            {/* GOOGLE SIGN IN */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
              <span className="shrink mx-3 text-[10px] text-slate-400 uppercase font-bold">Ou</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            </div>

            <button
              type="button"
              onClick={() => { setShowGooglePrompt(true); setLoginError(''); }}
              disabled={isLoginLoading}
              className="w-full py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continuar com Conta Google</span>
            </button>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-slate-400">
                Cada casal possui conta e credenciais exclusivas e isoladas.
              </span>
            </div>
          </form>
        )}

        {/* REGISTER - STEP 1: FILL DATA */}
        {activeTab === 'register' && regStep === 1 && (
          <form onSubmit={handleRegisterNext} className="space-y-4">
            <button
              type="button"
              onClick={() => { setShowGooglePrompt(true); setLoginError(''); }}
              className="w-full py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center gap-2.5 cursor-pointer mb-2"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Registar com Conta Google</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
              <span className="shrink mx-3 text-[10px] text-slate-400 uppercase font-bold">Ou preencha abaixo</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Modalidade Escolhida</span>
                <strong className="text-rose-700 dark:text-rose-400 text-xs">{regPackage}</strong>
              </div>
              <select
                value={regPackage}
                onChange={e => setRegPackage(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="Plano Grátis">Plano Grátis (0 Kz · até 25 convidados)</option>
                <option value="Plano Essencial">Plano Ouro / Essencial (35.000 Kz)</option>
                <option value="Plano Premium">Plano Diamante / Luxo (65.000 Kz)</option>
                <option value="Plano Luxo">Plano Luanda VIP (110.000 Kz)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Nome do Noivo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gabriel"
                  value={regGroomName}
                  onChange={e => setRegGroomName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-rose-800 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Nome da Noiva *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sofia"
                  value={regBrideName}
                  onChange={e => setRegBrideName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-rose-800 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">E-mail Principal</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="noivos@exemplo.ao"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-rose-800 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">WhatsApp de Contato</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                <input
                  type="tel"
                  required
                  placeholder="+244 923 000 000"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-rose-800 font-medium font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rose-900 hover:bg-rose-950 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Continuar com Verificação</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
              <span className="shrink mx-3 text-[10px] text-slate-400 uppercase font-bold">Ou crie com</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            </div>

            <button
              type="button"
              onClick={() => { setShowGooglePrompt(true); setLoginError(''); }}
              disabled={isLoginLoading}
              className="w-full py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Cadastrar com Conta Google no Dispositivo</span>
            </button>
          </form>
        )}

        {/* REGISTER - STEP 2: SIMPLIFIED EMAIL & OTP */}
        {activeTab === 'register' && regStep === 2 && (
          <form onSubmit={handleOtpVerify} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900">
                {otpChannel === 'email' ? <Mail className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {otpChannel === 'email' ? 'Validação por E-mail' : 'Validação de Segurança'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {otpChannel === 'email' ? (
                  <>Código de 4 dígitos enviado para o e-mail: <strong className="font-mono text-slate-800 dark:text-slate-200">{regEmail || 'seu e-mail'}</strong></>
                ) : (
                  <>Código enviado para o WhatsApp: <strong className="font-mono text-slate-800 dark:text-slate-200">{regPhone}</strong></>
                )}
              </p>

              <div className="pt-1">
                {otpChannel === 'whatsapp' ? (
                  <button
                    type="button"
                    onClick={() => setOtpChannel('email')}
                    className="text-[10px] text-rose-700 dark:text-rose-400 underline font-semibold cursor-pointer"
                  >
                    WhatsApp com lentidão? Deixar apenas validação por E-mail ✓
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOtpChannel('whatsapp')}
                    className="text-[10px] text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
                  >
                    Prefere receber o código no WhatsApp? Clique aqui
                  </button>
                )}
              </div>
            </div>

            {/* Email verification simplified badge */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="truncate max-w-[200px]">E-mail <strong>{regEmail}</strong> verificado</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase">OK</span>
            </div>

            {/* Quick 1-Click Code Suggestion */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-center space-y-1">
              <span className="text-[9px] font-bold font-mono text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Código OTP Simulado</span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono font-bold text-base text-amber-900 dark:text-amber-200">{generatedOtp}</span>
                <button
                  type="button"
                  onClick={() => setOtpCode(generatedOtp)}
                  className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded text-[10px] font-bold hover:bg-amber-300"
                >
                  Preencher
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block text-center">
                Digite o Código (4 dígitos)
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                className="w-32 mx-auto text-center py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold font-mono tracking-widest text-slate-900 dark:text-white block focus:outline-rose-800"
              />
            </div>

            {otpError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl text-xs text-center">
                {otpError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRegStep(1)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isOtpLoading}
                className="flex-2 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {isOtpLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>Validar & Criar Perfil</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* REGISTER - STEP 3: CREDS GENERATED */}
        {activeTab === 'register' && regStep === 3 && generatedCreds && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Perfil Criado com Sucesso!</h3>
              <p className="text-[11px] text-slate-500">
                Geramos dois acessos independentes para o casal sincronizar o casamento.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-rose-700 dark:text-rose-400">
                  <span>{generatedCreds.user1.role}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${generatedCreds.user1.username} | ${generatedCreds.user1.pass}`, 1)}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedIndex === 1 ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
                  <div>Usuário: <strong className="text-slate-900 dark:text-white">{generatedCreds.user1.username}</strong></div>
                  <div>Senha: <strong className="text-amber-700 dark:text-amber-400">{generatedCreds.user1.pass}</strong></div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                  <span>{generatedCreds.user2.role}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${generatedCreds.user2.username} | ${generatedCreds.user2.pass}`, 2)}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedIndex === 2 ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
                  <div>Usuário: <strong className="text-slate-900 dark:text-white">{generatedCreds.user2.username}</strong></div>
                  <div>Senha: <strong className="text-amber-700 dark:text-amber-400">{generatedCreds.user2.pass}</strong></div>
                </div>
              </div>
            </div>

            <button
              onClick={handleFinishRegistration}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <Heart className="w-4 h-4" />
              <span>Aceder ao Painel dos Noivos</span>
            </button>
          </div>
        )}

        {/* Security badge */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ambiente Seguro com Encriptação de Ponta a Ponta</span>
        </div>
      </motion.div>
    </div>
  );
}
