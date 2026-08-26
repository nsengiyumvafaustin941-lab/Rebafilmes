import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, ChevronLeft, ArrowRight, ShieldCheck, Sparkles, Zap, 
  CheckCircle2, AlertCircle, RefreshCw, Smartphone, 
  CreditCard, ExternalLink, Lock, Gift, Globe
} from 'lucide-react';
import { useVIPModal } from '../contexts/VIPModalContext';
import { useVIP } from '../hooks/useVIP';
import { useAuth } from '../contexts/AuthContext';
import { getDynamicVipPlans } from '../utils/settings';
import './VIPModal.css';

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
      
      const freshPlans = getDynamicVipPlans();
      setVipPlans(freshPlans);

      const targetPlanId = initialPlanId || 'monthly';
      const found = freshPlans.find((p) => p.id === targetPlanId) || freshPlans[1] || freshPlans[0];
      setSelectedPlan(found);

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
                <Sparkles size={20} color="#ffd700" />
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
                <Gift size={14} />
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
                <div className="vip-method-icon-box mtn-bg">
                  <Smartphone size={20} color="#000" />
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
                <div className="vip-method-icon-box airtel-bg">
                  <Smartphone size={20} color="#fff" />
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
                <div className="vip-method-icon-box crypto-bg">
                  <Globe size={20} color="#fff" />
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
                  <Gift size={20} color="#ffd700" />
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
                  💡 You will receive a prompt on your phone to enter your MoMo PIN and authorize payment.
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
                  <span className="vip-method-chip">💳 Visa</span>
                  <span className="vip-method-chip">💳 Mastercard</span>
                  <span className="vip-method-chip"> Apple Pay</span>
                  <span className="vip-method-chip">🌐 Google Pay</span>
                  <span className="vip-method-chip">⚡ USDT</span>
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
                  🔒 A secure checkout page will open to complete payment. VIP activates automatically upon confirmation.
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
                  <Gift size={18} className="vip-phone-icon" />
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
                <strong className="vip-active-text">VIP Active ✅</strong>
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
