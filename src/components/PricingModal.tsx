import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PRICING_PLANS, PricingPlan, PlanType, BillingCycle } from '../types';
import {
  Check,
  Zap,
  Crown,
  Sparkles,
  Smartphone,
  MessageCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan?: PlanType;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, targetPlan }) => {
  const { user, profile } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(targetPlan || 'Flow');
  const [paymentStep, setPaymentStep] = useState<'plans' | 'instructions'>('plans');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedUssd, setCopiedUssd] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  if (!isOpen) return null;

  const currentActivePlan = profile?.plan || 'Focus';

  const handleSelectPlan = (plan: PricingPlan) => {
    if (plan.id === 'Focus') {
      onClose();
      return;
    }
    setSelectedPlan(plan.id);
    setPaymentStep('instructions');
  };

  const getAmount = () => {
    const plan = PRICING_PLANS.find((p) => p.id === selectedPlan);
    if (!plan) return 0;
    return billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const copyToClipboard = (text: string, type: 'number' | 'ussd') => {
    navigator.clipboard.writeText(text);
    if (type === 'number') {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } else {
      setCopiedUssd(true);
      setTimeout(() => setCopiedUssd(false), 2000);
    }
  };

  // Complete Purchase -> WhatsApp redirection
  const handleCompletePurchaseAndRedirect = () => {
    const userEmail = user?.email || profile?.email || 'Teacher';
    const amountStr = `$${getAmount().toFixed(2)} USD`;
    const planLabel = selectedPlan.toUpperCase();
    const cycleLabel = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';

    // Exact requested format:
    // HEY CRAYNE SAKALA L JUST PAID FOR FLOW OR FULL DEPENDING ON WHAT THEY CLICKED HERES MY EMAIL AND MY ECOCASH CONFIRMATION MESSAGE BELOW
    const whatsappMessage = `HEY CRAYNE SAKALA L JUST PAID FOR ${planLabel} (${cycleLabel} - ${amountStr}) HERES MY EMAIL AND MY ECOCASH CONFIRMATION MESSAGE BELOW:

Email: ${userEmail}
Package: ${planLabel}
Amount: ${amountStr}
EcoCash Confirmation:
${confirmationCode.trim() ? confirmationCode.trim() : '[Paste your EcoCash SMS confirmation message here]'}`;

    const phoneInt = '263788849965';
    const encodedMsg = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/${phoneInt}?text=${encodedMsg}`;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <div
      id="pricing-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="pricing-modal-card"
        className="w-full max-w-4xl bg-[#0F172A] text-slate-100 rounded-2xl shadow-2xl border border-amber-500/30 overflow-hidden my-6"
      >
        {/* Modal Top Header */}
        <div className="relative bg-gradient-to-r from-slate-950 via-[#0d1527] to-slate-950 p-6 md:p-8 border-b border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.8)]"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-300 font-display">
                Marking Scheme Generator • Teacher Tiers
              </span>
            </div>
            <button
              id="pricing-modal-close"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl font-light transition-colors"
            >
              &times;
            </button>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-white mt-3">
            {paymentStep === 'plans' ? 'Curriculum Excellence Packages' : 'EcoCash Direct Payment Instructions'}
          </h2>
          <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-2xl font-light">
            {paymentStep === 'plans'
              ? 'Empower your academic marking with official curriculum guidelines. Start on Focus, or elevate to Flow and Full plans.'
              : 'Follow the on-screen steps to send EcoCash to CRAIN TINOMUDA SAKALA (+263788849965), then complete via WhatsApp for instant activation.'}
          </p>

          {/* Billing Cycle Toggle */}
          {paymentStep === 'plans' && (
            <div className="mt-5 inline-flex items-center bg-slate-900/90 p-1 rounded-xl border border-amber-500/30">
              <button
                type="button"
                id="toggle-monthly"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Plan
              </button>
              <button
                type="button"
                id="toggle-yearly"
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Yearly Plan (Discounted)
                <span className="bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  All 3 Terms
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8">
          {paymentStep === 'plans' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PRICING_PLANS.map((plan) => {
                const isCurrent = currentActivePlan === plan.id;
                const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

                return (
                  <div
                    key={plan.id}
                    id={`card-plan-${plan.id.toLowerCase()}`}
                    className={`relative rounded-2xl p-6 transition-all flex flex-col justify-between ${
                      plan.popular
                        ? 'border-2 border-amber-400/80 bg-gradient-to-b from-[#131E38] to-[#0D1527] shadow-[0_0_25px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/30'
                        : 'border border-slate-800 bg-[#0B1222] hover:border-slate-700'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-widest py-1 px-3.5 rounded-full shadow-md flex items-center gap-1.5 font-display">
                        <Crown className="w-3.5 h-3.5" /> Full Plan (Max)
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg font-display text-white">{plan.name}</h3>
                        {plan.id === 'Focus' && (
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                            Free
                          </span>
                        )}
                        {plan.id === 'Flow' && (
                          <span className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded font-mono">
                            $1.66 / mo
                          </span>
                        )}
                        {plan.id === 'Full' && (
                          <span className="text-[10px] bg-amber-900/60 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded font-mono font-bold">
                            $5.33 / mo
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 min-h-[36px] mb-4 font-light">
                        {plan.tagline}
                      </p>

                      <div className="mb-5 pb-4 border-b border-slate-800/80">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold font-display text-white">
                            ${price === 0 ? '0' : price.toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {price === 0 ? 'free' : `/${billingCycle === 'yearly' ? 'year' : 'month'}`}
                          </span>
                        </div>
                        {billingCycle === 'yearly' && price > 0 && (
                          <p className="text-[11px] text-amber-400 font-medium mt-1">
                            Billed annually for all academic terms
                          </p>
                        )}
                      </div>

                      {/* Unique features */}
                      {plan.exclusiveFeatures.length > 0 && (
                        <div className="mb-4 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                          <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest mb-1.5 flex items-center gap-1 font-display">
                            <Zap className="w-3 h-3 text-amber-400" /> Exclusive to {plan.id} Plan:
                          </p>
                          <ul className="space-y-1">
                            {plan.exclusiveFeatures.map((feat, idx) => (
                              <li key={idx} className="text-xs text-amber-100/90 flex items-center gap-1.5 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                {feat}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      id={`choose-plan-${plan.id.toLowerCase()}`}
                      type="button"
                      disabled={isCurrent && plan.id === 'Focus'}
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2 font-display ${
                        isCurrent
                          ? 'bg-slate-800 text-slate-500 cursor-default border border-slate-700'
                          : plan.popular
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold shadow-amber-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      {isCurrent ? (
                        'Active Plan'
                      ) : (
                        <>
                          {plan.ctaText} <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* On-Screen EcoCash Instructions */
            <div className="max-w-xl mx-auto space-y-6">
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 rounded-xl border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-display">
                    Selected Package
                  </span>
                  <h4 className="text-lg font-bold text-white font-display">
                    {selectedPlan} Plan ({billingCycle})
                  </h4>
                  <p className="text-xs text-slate-400">
                    Recipient: Crayne Sakala (+263788849965)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-amber-400 font-display">
                    ${getAmount().toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 block font-mono">USD</span>
                </div>
              </div>

              {/* Step-by-Step Box */}
              <div className="bg-[#0B1222] p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300 font-display border-b border-slate-800 pb-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>On-Screen EcoCash Payment Guide</span>
                </div>

                <ol className="space-y-3.5 text-xs text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0 border border-amber-500/40">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-white">Go to your EcoCash mobile phone</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono bg-slate-950 px-2.5 py-1 rounded text-amber-400 border border-slate-800 text-xs font-bold">
                          *151#
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('*151#', 'ussd')}
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 underline"
                        >
                          <Copy className="w-3 h-3" /> {copiedUssd ? 'Copied' : 'Copy Code'}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1">Dial *151# on your registered EcoCash line.</p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0 border border-amber-500/40">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-white">Send Money / Pay using EcoCash</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Select Send Money, enter recipient number:
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="font-mono bg-slate-950 px-3 py-1.5 rounded-lg text-emerald-400 border border-emerald-500/30 text-xs font-bold tracking-wider">
                          0788849965
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">(+263788849965)</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('0788849965', 'number')}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] flex items-center gap-1 border border-slate-700"
                        >
                          <Copy className="w-3 h-3" /> {copiedNumber ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1">
                        Registered Name: <strong>CRAIN TINOMUDA SAKALA</strong>
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0 border border-amber-500/40">
                      3
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-white">Enter Amount: ${getAmount().toFixed(2)} USD</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Confirm transfer and authorize with your EcoCash PIN.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0 border border-amber-500/40">
                      4
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-white">Paste EcoCash SMS / Confirmation (Optional)</p>
                      <input
                        type="text"
                        placeholder="e.g. Approval Code MP2609... or Approval SMS"
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value)}
                        className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                  </li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  id="btn-back-to-tiers"
                  onClick={() => setPaymentStep('plans')}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 text-xs font-semibold transition-colors"
                >
                  Back to Packages
                </button>

                <button
                  type="button"
                  id="btn-complete-purchase-whatsapp"
                  onClick={handleCompletePurchaseAndRedirect}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs md:text-sm tracking-wide uppercase transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 font-display"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  Complete Purchase (Open WhatsApp)
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-500">
                When you click <strong>Complete Purchase</strong>, you will be redirected to WhatsApp at <strong>0788849965</strong> to confirm with CRAIN TINOMUDA SAKALA.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Official Examination Assessment Engine</span>
          <span className="font-medium text-slate-400 font-display">Curriculum Evaluation Standard</span>
        </div>
      </div>
    </div>
  );
};
