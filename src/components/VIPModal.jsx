import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, ChevronLeft, ArrowRight, ShieldCheck, Zap, 
  CheckCircle2, AlertCircle, RefreshCw, Smartphone, 
  CreditCard, ExternalLink, Lock, Ticket
} from 'lucide-react';
import { useVIPModal } from '../contexts/VIPModalContext';
import { useVIP } from '../hooks/useVIP';
import { useAuth } from '../contexts/AuthContext';
import { getDynamicVipPlans, fetchServerSettings } from '../utils/settings';
import logo from '../assets/logo.jpg';
import './VIPModal.css';

/* ── Branded Payment Method SVG Logos (Zero Generic Emojis) ── */

const MtnLogo = ({ size = 36 }) => (
  <svg viewBox="0 0 36 36" width={size} height={size} className="vip-brand-svg">
    <rect width="36" height="36" rx="8" fill="#FFCC00" />
    <ellipse cx="18" cy="18" rx="13" ry="8.5" fill="none" stroke="#000" strokeWidth="2.2" />
    <text x="18" y="21.5" textAnchor="middle" fill="#000" fontSize="9" fontWeight="900" fontFamily="Arial Black, Impact, sans-serif">MTN</text>
  </svg>
);

const AirtelLogo = ({ size = 36 }) => (
  <svg viewBox="0 0 36 36" width={size} height={size} className="vip-brand-svg">
    <rect width="36" height="36" rx="8" fill="#E40000" />
    <path d="M12 24C12 17.5 17 12 23.5 12C24.5 12 25 12.5 25 13.5C25 14.5 24.2 15 23.5 15C18.8 15 15 18.8 15 24H12Z" fill="#FFF"/>
    <circle cx="22" cy="20" r="3" fill="#FFF"/>
    <text x="18" y="30" textAnchor="middle" fill="#FFF" fontSize="6.5" fontWeight="800" fontFamily="sans-serif">airtel</text>
  </svg>
);

const VisaChipLogo = () => (
  <svg viewBox="0 0 36 12" width="28" height="10" className="vip-chip-svg" fill="none">
    <path d="M14.05 11.2H11.7L13.16 2.37H15.51L14.05 11.2ZM24.47 2.59C24.01 2.42 23.29 2.24 22.4 2.24C20.08 2.24 18.45 3.47 18.44 5.23C18.42 6.54 19.59 7.27 20.48 7.71C21.4 8.16 21.71 8.45 21.71 8.85C21.7 9.47 20.97 9.74 20.29 9.74C19.34 9.74 18.8 9.59 18.06 9.25L17.74 9.1L17.4 11.19C18.01 11.47 19.12 11.71 20.27 11.72C22.75 11.72 24.38 10.5 24.4 8.7C24.41 7.6 23.73 6.76 22.25 6.05C21.36 5.6 20.82 5.33 20.83 4.86C20.84 4.44 21.3 3.99 22.28 3.99C23.09 3.97 23.69 4.14 24.16 4.35L24.39 4.46L24.71 2.47L24.47 2.59ZM31.42 2.37H29.61C29.05 2.37 28.63 2.53 28.39 3.12L24.23 11.2H26.7L27.19 9.85H30.21L30.5 11.2H32.68L30.77 2.37H31.42ZM27.87 8.01L29.11 4.63L29.83 8.01H27.87ZM9.56 2.37L7.33 8.41L7.09 7.19C6.67 5.76 5.33 4.22 3.86 3.44L5.95 11.2H8.43L12.11 2.37H9.56ZM4.44 2.37H0.69L0.64 2.6C3.59 3.35 5.56 5.16 6.36 7.19L5.47 2.68C5.31 2.05 4.96 2.39 4.44 2.37Z" fill="#1A1F71"/>
  </svg>
);

const MastercardChipLogo = () => (
  <svg viewBox="0 0 24 16" width="20" height="13" className="vip-chip-svg" fill="none">
    <circle cx="8" cy="8" r="7" fill="#EB001B" />
    <circle cx="16" cy="8" r="7" fill="#F79E1B" fillOpacity="0.85" />
  </svg>
);

const ApplePayChipLogo = () => (
  <svg viewBox="0 0 34 16" width="26" height="12" className="vip-chip-svg" fill="#FFF">
    <path d="M5.38 6.55c-.26.31-.67.55-1.12.55-.06 0-.12 0-.17-.01.03-.36.19-.74.45-1.02.26-.29.68-.52 1.09-.54.02.05.03.11.03.18-.01.33-.13.63-.28.84zm1.18 1.4c-.65 0-1.19-.39-1.63-.39-.46 0-1.05.37-1.57.37-.81 0-1.74-.69-1.74-2.02 0-1.35.88-2.05 1.71-2.05.47 0 .93.31 1.25.31.3 0 .85-.33 1.45-.33.25 0 .98.02 1.48.74-.04.03-.88.51-.88 1.54 0 1.22 1.07 1.63 1.11 1.65-.01.03-.17.58-.57 1.16-.36.52-.73 1.02-1.21 1.02zM12.44 4.02h2.24c1.19 0 1.94.81 1.94 1.94 0 1.14-.76 1.95-1.95 1.95h-1.09v2.04h-1.14V4.02zm1.14 2.92h.93c.69 0 1.09-.38 1.09-.98 0-.59-.4-.97-1.09-.97h-.93v1.95zm5.72 3.05c-.17 0-.39-.06-.55-.18-.24-.18-.34-.49-.34-.84 0-.69.52-1.08 1.45-1.13l.89-.05v-.26c0-.44-.31-.69-.87-.69-.42 0-.75.14-.88.35l-.83-.49c.27-.47.88-.74 1.76-.74 1.25 0 1.93.59 1.93 1.65v2.29h-1.08v-.51c-.32.37-.8.55-1.48.55zm.22-.88c.49 0 .92-.25 1.14-.65v-.46l-.77.05c-.52.03-.83.21-.83.56 0 .32.22.5.46.5zm4.84 2.76l1.24-3.88h1.2l-1.91 5.25c-.39 1.07-.84 1.48-1.77 1.48-.28 0-.58-.04-.73-.09l.19-.88c.11.03.26.05.42.05.46 0 .72-.21.9-.68l.12-.34-1.75-4.79h1.21l1.13 3.88z"/>
  </svg>
);

const GooglePayChipLogo = () => (
  <svg viewBox="0 0 34 16" width="28" height="12" className="vip-chip-svg" fill="none">
    <path d="M5.5 3.5v7.2H3.7V3.5h1.8z" fill="#4285F4"/>
    <path d="M12.8 7.3c0 2.2-1.6 3.7-3.7 3.7-2.1 0-3.7-1.5-3.7-3.7s1.6-3.7 3.7-3.7c2.1 0 3.7 1.5 3.7 3.7zm-1.8 0c0-1.3-.9-2.2-2-2.2-1.1 0-2 .9-2 2.2 0 1.3.9 2.2 2 2.2 1.1 0 2-.9 2-2.2z" fill="#EA4335"/>
    <path d="M19.8 8.6c0 1.8-1.5 2.4-2.8 2.4-1.2 0-2.4-.6-2.8-1.7l1.5-.6c.2.6.7.9 1.3.9.7 0 1.2-.4 1.2-.9 0-.6-.5-.8-1.3-1-1.1-.3-2.1-.8-2.1-2 0-1.2 1.1-2.1 2.5-2.1 1.1 0 2 .5 2.4 1.4l-1.5.6c-.2-.4-.5-.6-1-.6-.5 0-.9.3-.9.7 0 .5.4.7 1.1.9 1.4.4 2.4.9 2.4 2.4z" fill="#FBBC05"/>
    <text x="21" y="9.5" fill="#FFF" fontSize="6.5" fontWeight="700" fontFamily="system-ui, sans-serif">Pay</text>
  </svg>
);

const UsdtLogo = ({ size = 36 }) => (
  <svg viewBox="0 0 36 36" width={size} height={size} className="vip-brand-svg" fill="none">
    <rect width="36" height="36" rx="8" fill="#1b2838" stroke="rgba(38,161,123,0.4)" strokeWidth="1"/>
    <circle cx="18" cy="18" r="12" fill="#26A17B" />
    <path d="M19 18.5c-.07 0-.5.04-1 .04-.5 0-.93-.04-1-.04-2.4-.1-4.2-.6-4.2-1.2s1.8-1.1 4.2-1.2v1.5c.3.02.66.03 1 .03.35 0 .72-.01 1-.03v-1.5c2.4.1 4.2.6 4.2 1.2s-1.8 1.1-4.2 1.2zm0-2.8V13.5h3.6V11.5H13.4v2h3.6v2.2c-2.8.13-4.9.76-4.9 1.5s2.1 1.37 4.9 1.5v5.3h2v-5.3c2.8-.13 4.9-.76 4.9-1.5s-2.1-1.37-4.9-1.5z" fill="#FFF"/>
  </svg>
);

const UsdtChipLogo = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" className="vip-chip-svg" fill="none">
    <circle cx="10" cy="10" r="9" fill="#26A17B" />
    <path d="M10.8 10.3c-.05 0-.4.03-.8.03-.38 0-.7-.03-.76-.03-1.8-.08-3.15-.46-3.15-.92s1.35-.84 3.15-.92v1.14c.23.02.5.02.77.02.28 0 .58 0 .79-.02V8.46c1.8.08 3.15.46 3.15.92s-1.35.84-3.15.92zm0-2.16V6.5h2.8V5H6.4v1.5h2.8v1.64c-2.1.1-3.7.57-3.7 1.14 0 .57 1.6 1.04 3.7 1.14v3.98h1.6V10.42c2.1-.1 3.7-.57 3.7-1.14 0-.57-1.6-1.04-3.7-1.14z" fill="#FFF"/>
  </svg>
);

export const VIPModal = () => {
  const { isOpen, closeVIPModal, initialPlanId } = useVIPModal();
  const { 
    isVip, daysRemaining, expiresAt, 
    initiatePayment, initiateCryptoPayment, 
    startOrderPolling, activateVip, deactivateVip 
  } = useVIP();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vipPlans, setVipPlans] = useState(() => getDynamicVipPlans());

  // Navigation step state: 'plan' | 'method' | 'details' | 'waiting' | 'success'
  const [step, setStep] = useState('plan');
  const [selectedPlan, setSelectedPlan] = useState(() => vipPlans[1] || vipPlans[0]);
  // Payment method: 'mtn' | 'airtel' | 'card' | 'crypto' | 'voucher'
  const [selectedMethod, setSelectedMethod] = useState('mtn');

  // Input states
  const [phone, setPhone] = useState(() => user?.phone || localStorage.getItem('rebafilme_last_momo_phone') || '');
  const [email, setEmail] = useState(() => user?.email || '');
  const [passcode, setPasscode] = useState('');
  
  // Async states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [orderRef, setOrderRef] = useState('');

  // Handle opening and automatic return to payment step after login
  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      setIsSubmitting(false);
      
      const currentPlans = getDynamicVipPlans();
      setVipPlans(currentPlans);

      const targetPlanId = initialPlanId || 'monthly';
      const found = currentPlans.find((p) => p.id === targetPlanId) || currentPlans[1] || currentPlans[0];
      setSelectedPlan(found);

      // Asynchronously fetch fresh live settings from Cloudflare server
      fetchServerSettings().then((serverSettings) => {
        if (serverSettings) {
          const freshPlans = getDynamicVipPlans(serverSettings);
          setVipPlans(freshPlans);
          setSelectedPlan((prev) => {
            const match = freshPlans.find((p) => p.id === (prev?.id || targetPlanId));
            return match || freshPlans[1] || freshPlans[0];
          });
        }
      });

      // If returning from login redirect, open directly at payment method selection
      try {
        const pendingStep = sessionStorage.getItem('rebafilme_pending_step');
        if (pendingStep && user) {
          setStep(pendingStep);
          sessionStorage.removeItem('rebafilme_pending_step');
        } else {
          setStep('plan');
        }
      } catch {
        setStep('plan');
      }
    }
  }, [isOpen, initialPlanId, user]);

  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone);
    if (user?.email && !email) setEmail(user.email);
  }, [user, phone, email]);

  if (!isOpen) return null;

  // Handles clicking Continue on Step 1 (Plan Selection)
  const handlePlanContinue = () => {
    setFeedback(null);
    if (!user) {
      // User is not logged in: save chosen plan and redirect to login page
      try {
        sessionStorage.setItem('rebafilme_pending_plan', selectedPlan.id);
        sessionStorage.setItem('rebafilme_pending_step', 'method');
        sessionStorage.setItem('rebafilme_auto_open_vip', 'true');
      } catch {}
      closeVIPModal();
      navigate(`/login?redirect=vip&plan=${encodeURIComponent(selectedPlan.id)}`);
      return;
    }

    // User is logged in: advance straight to payment methods
    setStep('method');
  };

  // 1-Click Paypack Instant MoMo Trigger
  const handleMoMoSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      try {
        sessionStorage.setItem('rebafilme_pending_plan', selectedPlan.id);
        sessionStorage.setItem('rebafilme_pending_step', 'details');
        sessionStorage.setItem('rebafilme_auto_open_vip', 'true');
      } catch {}
      closeVIPModal();
      navigate(`/login?redirect=vip&plan=${encodeURIComponent(selectedPlan.id)}`);
      return;
    }

    if (!phone || phone.trim().length < 10) {
      setFeedback({ type: 'error', text: 'Please enter a valid phone number (e.g. 078xxxxxxx or 073xxxxxxx)' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await initiatePayment({
      phone: phone.trim(),
      amount: selectedPlan.amountRwf,
      planType: selectedPlan.id,
    });

    setIsSubmitting(false);

    if (res.success) {
      setOrderRef(res.ref);
      setStep('waiting');

      // Start background polling
      startOrderPolling(
        res.ref,
        () => {
          setStep('success');
          setFeedback(null);
        },
        () => {
          setFeedback({
            type: 'error',
            text: 'Confirmation timed out. If you already approved on your phone, click Check Status or contact support.'
          });
        }
      );
    } else {
      setFeedback({ type: 'error', text: res.error || 'Payment request failed. Please try again.' });
    }
  };

  // NOWPayments Hosted Checkout Trigger
  const handleCardCryptoSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const res = await initiateCryptoPayment({
      planType: selectedPlan.id,
      amountUsd: selectedPlan.amountUsd,
      email: email.trim() || user?.email || undefined
    });

    setIsSubmitting(false);

    if (res.success && res.invoiceUrl) {
      setOrderRef(res.orderId);
      setInvoiceUrl(res.invoiceUrl);
      setStep('waiting');

      // Open hosted checkout in popup or tab
      const win = window.open(res.invoiceUrl, '_blank', 'width=520,height=750');

      // Detect popup-blocked state and show a manual fallback link
      if (!win || win.closed || typeof win.closed === 'undefined') {
        setFeedback({
          type: 'warning',
          text: 'Your browser blocked the checkout popup. Click the link below to open it manually:',
          link: res.invoiceUrl,
          linkText: 'Open Secure Checkout →'
        });
      }

      // Start background polling
      startOrderPolling(
        res.orderId,
        () => {
          setStep('success');
          setFeedback(null);
        },
        () => {
          setFeedback({
            type: 'info',
            text: 'Awaiting payment confirmation. If you already completed payment, please wait a moment.'
          });
        }
      );
    } else {
      setFeedback({ type: 'error', text: res.error || 'Could not initialize secure checkout. Please try again.' });
    }
  };

  // Voucher Code Trigger
  const handleVoucherSubmit = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setFeedback({ type: 'error', text: 'Please enter your voucher code.' });
      return;
    }
    setFeedback(null);
    setIsSubmitting(true);
    const res = await activateVip(passcode.trim());
    setIsSubmitting(false);

    if (res.success) {
      setStep('success');
      setPasscode('');
    } else {
      setFeedback({ type: 'error', text: res.error });
    }
  };

  return (
    <div className="vip-modal-overlay" onClick={closeVIPModal}>
      <div className="vip-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Bar */}
        <div className="vip-modal-header">
          <div className="vip-header-left">
            {step !== 'plan' && step !== 'success' && (
              <button 
                type="button" 
                className="vip-back-btn" 
                onClick={() => {
                  setFeedback(null);
                  if (step === 'waiting') setStep('details');
                  else if (step === 'details') setStep('method');
                  else if (step === 'method') setStep('plan');
                }}
                title="Go Back"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="vip-title-wrap">
              <div className="vip-crown-icon">
                <img src={logo} alt="RebaFilme" className="vip-header-logo-img" />
              </div>
              <div>
                <h3 className="vip-modal-title">RebaFilme VIP &amp; Premium</h3>
                <span className="vip-step-indicator">
                  {step === 'plan' && 'Choose Your Plan'}
                  {step === 'method' && 'Select Payment Method'}
                  {step === 'details' && 'Payment Details'}
                  {step === 'waiting' && 'Authorize on Your Phone'}
                  {step === 'success' && 'Payment Successful!'}
                </span>
              </div>
            </div>
          </div>
          <button className="vip-close-btn" onClick={closeVIPModal} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Active VIP Status Card (if already VIP) */}
        {isVip && step === 'plan' && (
          <div className="vip-active-card">
            <div className="vip-active-info">
              <CheckCircle2 size={22} color="#00e676" />
              <div>
                <span className="vip-badge-active">VIP IS ACTIVE</span>
                <p className="vip-status-desc">
                  Remaining: <strong>{daysRemaining} Days</strong> {expiresAt ? `(Expires: ${new Date(expiresAt).toLocaleDateString()})` : ''}
                </p>
              </div>
            </div>
            <button className="vip-cancel-btn" onClick={deactivateVip}>
              Cancel VIP
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 1: CHOOSE PLAN (Minimalist - Only Day, Month, Year & Prices)
        ══════════════════════════════════════════════════════════ */}
        {step === 'plan' && (
          <div className="vip-step-content vip-fade-in">
            {/* Plan Cards */}
            <div className="vip-plans-selector">
              {vipPlans.map((plan) => {
                const isSelected = selectedPlan.id === plan.id;
                return (
                  <div 
                    key={plan.id}
                    className={`vip-plan-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    {plan.badge && (
                      <span 
                        className="vip-plan-badge" 
                        style={plan.badgeColor ? { background: plan.badgeColor, color: '#000' } : {}}
                      >
                        {plan.badge}
                      </span>
                    )}
                    <div className="vip-plan-item-left">
                      <div className={`vip-custom-radio ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <div className="vip-radio-inner" />}
                      </div>
                      <div className="vip-plan-name">{plan.name}</div>
                    </div>
                    <div className="vip-plan-item-right">
                      <div className="vip-plan-price">{plan.priceRwf}</div>
                      <div className="vip-plan-price-usd">{plan.priceUsd}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Continue CTA */}
            <button 
              type="button" 
              className="vip-primary-btn"
              onClick={handlePlanContinue}
            >
              <span>Continue ({selectedPlan.priceRwf} / {selectedPlan.priceUsd})</span>
              <ArrowRight size={18} />
            </button>

            {/* Direct Voucher Access */}
            <div className="vip-voucher-jump">
              <button 
                type="button" 
                className="vip-link-btn"
                onClick={() => {
                  setSelectedMethod('voucher');
                  setStep('details');
                }}
              >
                <Ticket size={15} />
                <span>Have a Voucher / Promo Code? Click here</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 2: SELECT PAYMENT METHOD
        ══════════════════════════════════════════════════════════ */}
        {step === 'method' && (
          <div className="vip-step-content vip-fade-in">
            {/* Selected Plan Summary Banner */}
            <div className="vip-summary-banner">
              <div>
                <span className="vip-summary-label">Selected Plan:</span>
                <span className="vip-summary-value">{selectedPlan.name} Pass</span>
              </div>
              <div className="vip-summary-price">
                <strong>{selectedPlan.priceRwf}</strong>
                <span className="vip-summary-sub"> / {selectedPlan.priceUsd}</span>
              </div>
            </div>

            <p className="vip-section-label">Choose your preferred payment method:</p>

            {/* Payment Method Cards */}
            <div className="vip-methods-list">
              {/* Option 1: MTN MoMo */}
              <div 
                className="vip-method-card"
                onClick={() => {
                  setSelectedMethod('mtn');
                  setFeedback(null);
                  setStep('details');
                }}
              >
                <div className="vip-method-icon-box">
                  <MtnLogo />
                </div>
                <div className="vip-method-info">
                  <div className="vip-method-title">MTN Mobile Money</div>
                  <div className="vip-method-desc">Instant USSD PIN Prompt (Rwanda)</div>
                </div>
                <div className="vip-method-tag">MoMo 078/079</div>
              </div>

              {/* Option 2: Airtel Money */}
              <div 
                className="vip-method-card"
                onClick={() => {
                  setSelectedMethod('airtel');
                  setFeedback(null);
                  setStep('details');
                }}
              >
                <div className="vip-method-icon-box">
                  <AirtelLogo />
                </div>
                <div className="vip-method-info">
                  <div className="vip-method-title">Airtel Money</div>
                  <div className="vip-method-desc">Instant USSD PIN Prompt (Rwanda)</div>
                </div>
                <div className="vip-method-tag">Airtel 073/072</div>
              </div>

              {/* Option 3: Credit / Debit Cards & Apple Pay */}
              <div 
                className="vip-method-card"
                onClick={() => {
                  setSelectedMethod('card');
                  setFeedback(null);
                  setStep('details');
                }}
              >
                <div className="vip-method-icon-box card-bg">
                  <CreditCard size={20} color="#fff" />
                </div>
                <div className="vip-method-info">
                  <div className="vip-method-title">Cards &amp; Apple Pay</div>
                  <div className="vip-method-desc">Visa, Mastercard, Apple Pay, Google Pay</div>
                </div>
                <div className="vip-method-tag usd-tag">{selectedPlan.priceUsd}</div>
              </div>

              {/* Option 4: Crypto USDT */}
              <div 
                className="vip-method-card"
                onClick={() => {
                  setSelectedMethod('crypto');
                  setFeedback(null);
                  setStep('details');
                }}
              >
                <div className="vip-method-icon-box">
                  <UsdtLogo />
                </div>
                <div className="vip-method-info">
                  <div className="vip-method-title">Crypto (USDT / TON)</div>
                  <div className="vip-method-desc">USDT (TRC20/Polygon), TON, BTC</div>
                </div>
                <div className="vip-method-tag usd-tag">{selectedPlan.priceUsd}</div>
              </div>

              {/* Option 5: Voucher Code */}
              <div 
                className="vip-method-card"
                onClick={() => {
                  setSelectedMethod('voucher');
                  setFeedback(null);
                  setStep('details');
                }}
              >
                <div className="vip-method-icon-box voucher-bg">
                  <Ticket size={20} color="#ffd700" />
                </div>
                <div className="vip-method-info">
                  <div className="vip-method-title">Voucher / Promo Code</div>
                  <div className="vip-method-desc">Redeem a pre-paid VIP code</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 3: ENTER DETAILS & PAY
        ══════════════════════════════════════════════════════════ */}
        {step === 'details' && (
          <div className="vip-step-content vip-fade-in">
            {/* Selected Method & Plan summary */}
            <div className="vip-summary-banner">
              <div>
                <span className="vip-summary-label">Payment For:</span>
                <span className="vip-summary-value">{selectedPlan.name} Pass</span>
              </div>
              <div className="vip-summary-price">
                <strong>
                  {selectedMethod === 'card' || selectedMethod === 'crypto' 
                    ? selectedPlan.priceUsd 
                    : selectedPlan.priceRwf}
                </strong>
              </div>
            </div>

            {/* SUB-FORM A: MTN / Airtel MoMo */}
            {(selectedMethod === 'mtn' || selectedMethod === 'airtel') && (
              <form onSubmit={handleMoMoSubmit} className="vip-details-form">
                <label className="vip-input-label">
                  Enter your {selectedMethod === 'mtn' ? 'MTN' : 'Airtel'} phone number:
                </label>
                <div className="vip-phone-wrapper">
                  <Smartphone size={18} className="vip-phone-icon" />
                  <input
                    type="tel"
                    placeholder={selectedMethod === 'mtn' ? '078xxxxxxx or 079xxxxxxx' : '073xxxxxxx or 072xxxxxxx'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="vip-phone-input"
                    autoFocus
                    required
                  />
                </div>
                <p className="vip-input-hint">
                  You will receive a USSD prompt on your phone to enter your MoMo PIN and authorize payment.
                </p>

                <button 
                  type="submit" 
                  className="vip-primary-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="vip-btn-spinner-wrap">
                      <RefreshCw size={18} className="spin" />
                      <span>Sending USSD Prompt...</span>
                    </span>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Pay {selectedPlan.priceRwf}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* SUB-FORM B: Cards / Apple Pay / Crypto */}
            {(selectedMethod === 'card' || selectedMethod === 'crypto') && (
              <form onSubmit={handleCardCryptoSubmit} className="vip-details-form">
                {/* Method Badges */}
                <div className="vip-badges-row">
                  <span className="vip-method-chip"><VisaChipLogo /> Visa</span>
                  <span className="vip-method-chip"><MastercardChipLogo /> Mastercard</span>
                  <span className="vip-method-chip"><ApplePayChipLogo /> Apple Pay</span>
                  <span className="vip-method-chip"><GooglePayChipLogo /> Google Pay</span>
                  <span className="vip-method-chip"><UsdtChipLogo /> USDT</span>
                </div>

                <label className="vip-input-label">
                  Email (Optional, for payment receipt):
                </label>
                <div className="vip-phone-wrapper">
                  <CreditCard size={18} className="vip-phone-icon" />
                  <input
                    type="email"
                    placeholder={user?.email || "your-email@gmail.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="vip-phone-input"
                    autoFocus
                  />
                </div>
                <p className="vip-input-hint">
                  A secure checkout page will open to complete payment. VIP activates automatically upon confirmation.
                </p>

                <button 
                  type="submit" 
                  className="vip-primary-btn card-pay-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="vip-btn-spinner-wrap">
                      <RefreshCw size={18} className="spin" />
                      <span>Opening Secure Checkout...</span>
                    </span>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Pay {selectedPlan.priceUsd} Securely</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* SUB-FORM C: Voucher */}
            {selectedMethod === 'voucher' && (
              <form onSubmit={handleVoucherSubmit} className="vip-details-form">
                <label className="vip-input-label">
                  Enter your VIP voucher code:
                </label>
                <div className="vip-phone-wrapper">
                  <Ticket size={18} className="vip-phone-icon" />
                  <input
                    type="text"
                    placeholder="e.g. REBAVIP-2026"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="vip-phone-input"
                    autoFocus
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="vip-primary-btn"
                >
                  <Zap size={16} />
                  <span>Activate Voucher</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 4: WAITING / USSD PIN PROMPT
        ══════════════════════════════════════════════════════════ */}
        {step === 'waiting' && (
          <div className="vip-step-content vip-waiting-step vip-fade-in">
            <div className="vip-pulse-ring">
              <RefreshCw size={36} className="spin" color="#ffd700" />
            </div>

            <h4 className="vip-waiting-title">
              {selectedMethod === 'card' || selectedMethod === 'crypto' 
                ? 'Awaiting Payment Confirmation'
                : 'Approve on Your Phone'}
            </h4>

            <p className="vip-waiting-desc">
              {selectedMethod === 'card' || selectedMethod === 'crypto' ? (
                <>Please complete payment in the checkout window. Once confirmed, this screen will update automatically.</>
              ) : (
                <>We sent a USSD prompt to <strong>{phone}</strong>. Please enter your MoMo PIN on your phone to complete payment.</>
              )}
            </p>

            {invoiceUrl && (
              <a 
                href={invoiceUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="vip-reopen-link"
              >
                <ExternalLink size={16} />
                <span>Open Checkout Window</span>
              </a>
            )}

            {orderRef && (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                Order Ref: <code style={{ color: '#ffd700' }}>{orderRef}</code>
              </div>
            )}

            <div className="vip-waiting-status-badge">
              <span className="vip-live-dot" />
              <span>Real-time automatic activation listening...</span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 5: PAYMENT SUCCESS
        ══════════════════════════════════════════════════════════ */}
        {step === 'success' && (
          <div className="vip-step-content vip-success-step vip-fade-in">
            <div className="vip-success-icon-wrap">
              <CheckCircle2 size={54} color="#00e676" />
            </div>

            <h4 className="vip-success-title">Payment Successful!</h4>
            <p className="vip-success-desc">
              Thank you! Your VIP membership has been activated instantly. You now have unlimited 4K streaming with zero ads and direct downloads.
            </p>

            <div className="vip-success-summary">
              <div className="vip-summary-row">
                <span>Status:</span>
                <strong className="vip-active-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} color="#00e676" /> VIP Active
                </strong>
              </div>
              <div className="vip-summary-row">
                <span>Plan:</span>
                <strong>{selectedPlan.name} Pass</strong>
              </div>
            </div>

            <button 
              type="button" 
              className="vip-primary-btn vip-start-watching-btn"
              onClick={closeVIPModal}
            >
              <span>Start Watching Movies</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div className={`vip-feedback-alert ${feedback.type}`}>
            {feedback.type === 'error'   && <AlertCircle size={18} />}
            {feedback.type === 'warning' && <AlertCircle size={18} />}
            {feedback.type === 'success' && <CheckCircle2 size={18} />}
            {feedback.type === 'info'    && <RefreshCw size={18} className="spin" />}
            <span>{feedback.text}</span>
            {feedback.link && (
              <a
                href={feedback.link}
                target="_blank"
                rel="noreferrer"
                className="vip-feedback-link"
                style={{ display: 'block', marginTop: '8px', textDecoration: 'underline', fontWeight: 600 }}
              >
                {feedback.linkText || 'Open Checkout'}
              </a>
            )}
          </div>
        )}

        {/* Trust Badges Footer */}
        <div className="vip-modal-footer">
          <div className="vip-trust-item">
            <ShieldCheck size={14} color="#ffd700" />
            <span>100% Safe &amp; Encrypted</span>
          </div>
          <div className="vip-trust-item">
            <Zap size={14} color="#00e676" />
            <span>Instant Auto-Activation</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VIPModal;
