import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, Building, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle, ArrowRight, Zap, FileText } from 'lucide-react';
import { ClientWeddingSaaS, RecurringSubscription, OrderValidationResult } from '../types';

interface BillingGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientWeddingSaaS;
  onSubscriptionUpdated?: (subscription: RecurringSubscription) => void;
}

export const BillingGatewayModal: React.FC<BillingGatewayModalProps> = ({
  isOpen,
  onClose,
  client,
  onSubscriptionUpdated
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'Basic' | 'Premium' | 'Luxury'>(
    client.plan === 'Basic' || client.plan === 'Premium' || client.plan === 'Luxury' ? client.plan : 'Luxury'
  );
  const [paymentMethod, setPaymentMethod] = useState<'multicaixa_express' | 'credit_card' | 'bank_reference'>('multicaixa_express');
  const [mcxPhone, setMcxPhone] = useState(client.config?.contactInfo?.phone || '+244 923 888 777');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState(client.clientName);
  const [autoRenew, setAutoRenew] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<OrderValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<RecurringSubscription | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const planPrices: Record<'Basic' | 'Premium' | 'Luxury', number> = {
    Basic: 35000,
    Premium: 65000,
    Luxury: 110000
  };

  // Fetch current subscription from server
  const fetchSubscription = async () => {
    try {
      const res = await fetch(`/api/billing/subscriptions/${client.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.subscription) {
          setCurrentSubscription(data.subscription);
          if (data.subscription.plan) {
            setSelectedPlan(data.subscription.plan);
          }
          if (data.subscription.paymentMethod) {
            setPaymentMethod(data.subscription.paymentMethod);
          }
          if (data.subscription.paymentPhone) {
            setMcxPhone(data.subscription.paymentPhone);
          }
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen && client.id) {
      fetchSubscription();
      validateCurrentOrder();
    }
  }, [isOpen, client.id]);

  // Pre-validate order via API before proceeding
  const validateCurrentOrder = async (targetPlan = selectedPlan) => {
    setIsValidating(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/orders/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          requestedAction: 'subscription_renewal',
          guestCount: client.guestCount || 0
        })
      });
      const data: OrderValidationResult = await res.json();
      setValidationResult(data);
    } catch (err: any) {
      setValidationResult({
        valid: false,
        code: 'LIMIT_EXCEEDED',
        message: 'Falha ao conectar com o validador de pedidos da API.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Process recurring subscription checkout
  const handleProcessPayment = async () => {
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // 1. Mandatory order validation
    try {
      const valRes = await fetch('/api/orders/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          requestedAction: 'process_checkout',
          guestCount: client.guestCount || 0
        })
      });
      const valData: OrderValidationResult = await valRes.json();
      if (!valData.valid) {
        setErrorMessage(valData.message || 'Pedido rejeitado pela validação de cotas do SaaS.');
        setIsLoading(false);
        return;
      }
    } catch (e) {
      setErrorMessage('Erro de validação preliminar do pedido.');
      setIsLoading(false);
      return;
    }

    // 2. Submit payment and setup recurring subscription
    try {
      const checkoutRes = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          plan: selectedPlan,
          paymentMethod,
          paymentPhone: mcxPhone,
          paymentReference: paymentMethod === 'bank_reference' ? `REF-${Math.floor(10000000 + Math.random() * 90000000)}` : undefined,
          autoRenew
        })
      });

      const result = await checkoutRes.json();

      if (result.success && result.subscription) {
        setCurrentSubscription(result.subscription);
        setSuccessMessage(`Assinatura mensal do plano ${selectedPlan} ativada com sucesso! Próxima fatura em ${result.subscription.nextBillingDate}.`);
        onSubscriptionUpdated?.(result.subscription);
      } else {
        setErrorMessage(result.error || 'Falha ao processar pagamento.');
      }
    } catch (err: any) {
      setErrorMessage(`Erro ao processar pagamento: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate automated webhook recurring charge
  const handleSimulateWebhook = async () => {
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/webhooks/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kutxi-webhook-secret': 'kutxi_billing_secret_2026'
        },
        body: JSON.stringify({
          event: 'invoice.payment_succeeded',
          type: 'recurring_monthly_charge',
          data: {
            clientId: client.id,
            plan: selectedPlan,
            amount: planPrices[selectedPlan],
            paymentMethod,
            phone: mcxPhone,
            transaction_id: `TX-MCX-${Date.now()}`
          }
        })
      });

      const data = await res.json();
      if (data.received && data.subscription) {
        setCurrentSubscription(data.subscription);
        setSuccessMessage(`Webhook de cobrança mensal executado! Licença renovada automaticamente.`);
        onSubscriptionUpdated?.(data.subscription);
      } else {
        setErrorMessage(data.message || 'Falha na resposta do webhook.');
      }
    } catch (err: any) {
      setErrorMessage(`Erro no webhook: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-stone-900 dark:text-white">
                Assinatura & Gateway de Cobrança Mensal
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                Casamento de <strong>{client.clientName}</strong> · Faturação Recorrente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Subscription Status Badge */}
        {currentSubscription && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Assinatura <strong>{currentSubscription.status.toUpperCase()}</strong>: Plano <strong>{currentSubscription.plan}</strong> ({currentSubscription.amountMonthly.toLocaleString('pt-AO')} AOA/mês)
              </span>
            </div>
            <div className="text-stone-600 dark:text-stone-300 font-mono text-[11px]">
              Próxima Cobrança: <strong>{currentSubscription.nextBillingDate}</strong>
            </div>
          </div>
        )}

        {/* Order Pre-Validation Indicator */}
        <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-stone-700 dark:text-stone-300">
              {isValidating ? 'Validando pedido na API...' : (
                validationResult?.valid 
                  ? 'Pedido validado: sem pendências contratuais ou limites excedidos.'
                  : validationResult?.message || 'Conferência de limites ativa.'
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => validateCurrentOrder()}
            disabled={isValidating}
            className="text-[11px] font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isValidating ? 'animate-spin' : ''}`} />
            <span>Verificar</span>
          </button>
        </div>

        {/* Plan Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
            Escolha o Plano de Assinatura Mensal
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['Basic', 'Premium', 'Luxury'] as const).map(p => {
              const isSelected = selectedPlan === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setSelectedPlan(p);
                    validateCurrentOrder(p);
                  }}
                  className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#8E2840] bg-rose-50/60 dark:bg-rose-950/40 shadow-xs'
                      : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-stone-900 dark:text-white">{p}</span>
                    {p === 'Luxury' && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        VIP
                      </span>
                    )}
                  </div>
                  <div className="text-base font-bold text-[#8E2840] dark:text-rose-400 font-mono">
                    {planPrices[p].toLocaleString('pt-AO')} <span className="text-[10px] font-normal text-stone-600 dark:text-stone-300">AOA/mês</span>
                  </div>
                  <div className="text-[11px] text-stone-600 dark:text-stone-300 mt-1">
                    {p === 'Basic' ? 'Até 150 convidados' : 'Convidados ilimitados & WhatsApp'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
            Canal de Pagamento / Gateway
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'multicaixa_express', label: 'Multicaixa Express', icon: Smartphone },
              { id: 'credit_card', label: 'Cartão de Crédito', icon: CreditCard },
              { id: 'bank_reference', label: 'Ref. Multicaixa', icon: Building },
            ].map(m => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#8E2840] bg-[#8E2840] text-white shadow-xs'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px]">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Payment Method Inputs */}
          {paymentMethod === 'multicaixa_express' && (
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-2">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Número de Telemóvel Multicaixa Express
              </label>
              <input
                type="tel"
                value={mcxPhone}
                onChange={e => setMcxPhone(e.target.value)}
                placeholder="+244 9XX XXX XXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#8E2840]"
              />
              <p className="text-[11px] text-stone-600 dark:text-stone-300">
                Uma notificação de autorização push será enviada ao seu telemóvel para debitar {planPrices[selectedPlan].toLocaleString('pt-AO')} AOA.
              </p>
            </div>
          )}

          {paymentMethod === 'credit_card' && (
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Número do Cartão</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#8E2840]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Titular do Cartão</label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={e => setCardHolder(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#8E2840]"
                />
              </div>
            </div>
          )}

          {paymentMethod === 'bank_reference' && (
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
              <div className="flex justify-between font-mono">
                <span className="text-stone-600 dark:text-stone-300">Entidade:</span>
                <span className="font-bold">00142 (EMIS Angola)</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-stone-600 dark:text-stone-300">Referência Mensal:</span>
                <span className="font-bold text-[#8E2840] dark:text-rose-400">987 213 456</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-stone-600 dark:text-stone-300">Valor a Pagar:</span>
                <span className="font-bold">{planPrices[selectedPlan].toLocaleString('pt-AO')} AOA</span>
              </div>
            </div>
          )}
        </div>

        {/* Auto-renew checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-stone-700 dark:text-stone-300 select-none">
          <input
            type="checkbox"
            checked={autoRenew}
            onChange={e => setAutoRenew(e.target.checked)}
            className="w-4 h-4 rounded text-[#8E2840] focus:ring-[#8E2840] border-stone-300 dark:border-stone-700"
          />
          <span>Renovação automática mensal (cobrada a cada 30 dias com emissão de recibo digital)</span>
        </label>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleSimulateWebhook}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Simula disparo automático do webhook do gateway para renovar a cobrança recorrente"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Simular Webhook Recorrente</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleProcessPayment}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#8E2840] hover:bg-[#782236] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Conferindo Pedido...</span>
                </>
              ) : (
                <>
                  <span>Subscrever ({planPrices[selectedPlan].toLocaleString('pt-AO')} AOA)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
