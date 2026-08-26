import { useState, useEffect, useCallback, useRef } from 'react';
import { VIP_KEY } from '../utils/constants';
import { useAuth } from '../contexts/AuthContext';

const LAST_PHONE_KEY = 'rebafilme_last_momo_phone';

export function useVIP() {
  const { user } = useAuth();

  const [localVip, setLocalVip] = useState(() => {
    try {
      const raw = localStorage.getItem(VIP_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.expiresAt && Date.now() > data.expiresAt) {
        localStorage.removeItem(VIP_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  });

  const [serverVip, setServerVip] = useState(null);
  const [pendingSubscription, setPendingSubscription] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const pollIntervalRef = useRef(null);

  // Sync with localStorage & custom events
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const raw = localStorage.getItem(VIP_KEY);
        if (!raw) {
          setLocalVip(null);
          return;
        }
        const data = JSON.parse(raw);
        if (data.expiresAt && Date.now() > data.expiresAt) {
          localStorage.removeItem(VIP_KEY);
          setLocalVip(null);
        } else {
          setLocalVip(data);
        }
      } catch {
        setLocalVip(null);
      }
    };

    const handleStorage = (e) => {
      if (e.key === VIP_KEY) handleUpdate();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('rebafilme_vip_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('rebafilme_vip_updated', handleUpdate);
    };
  }, []);

  // Fetch server-side status
  const refreshVipStatus = useCallback(async (customRef = null) => {
    try {
      setLoadingStatus(true);
      const phone = user?.phone || localStorage.getItem(LAST_PHONE_KEY) || '';
      let url = '/api/vip/status';
      const params = new URLSearchParams();
      if (phone) params.append('phone', phone);
      if (customRef) params.append('ref', customRef);
      if (params.toString()) url += '?' + params.toString();

      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return null;

      const data = await res.json();
      setServerVip(data);

      if (data.isVip) {
        const localData = {
          active: true,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 30 * 86400000,
          serverSynced: true,
        };
        localStorage.setItem(VIP_KEY, JSON.stringify(localData));
        setLocalVip(localData);
        setPendingSubscription(null);
        window.dispatchEvent(new Event('rebafilme_vip_updated'));
      } else if (data.pendingSubscription) {
        setPendingSubscription(data.pendingSubscription);
      }

      return data;
    } catch (err) {
      console.warn('Failed to fetch VIP status:', err);
      return null;
    } finally {
      setLoadingStatus(false);
    }
  }, [user]);

  // Initial fetch on mount
  useEffect(() => {
    refreshVipStatus();
  }, [refreshVipStatus]);

  // 1-Click Paypack MoMo Payment Initiator
  const initiatePayment = useCallback(async ({ phone, amount = 1000, planType = 'monthly' }) => {
    try {
      if (phone) {
        localStorage.setItem(LAST_PHONE_KEY, phone);
      }

      const res = await fetch('/api/vip/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, amount, planType }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to initiate payment prompt' };
      }

      return {
        success: true,
        ref: data.ref,
        message: data.message,
        ussdSent: data.ussdSent,
      };
    } catch {
      return { success: false, error: 'Network connection error. Please try again.' };
    }
  }, []);

  // NOWPayments Card & Crypto Payment Initiator
  const initiateCryptoPayment = useCallback(async ({ planType = 'monthly', amountUsd = 3.99, email = '' }) => {
    try {
      const res = await fetch('/api/vip/crypto-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType, amountUsd, email }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to generate card/crypto invoice' };
      }

      return {
        success: true,
        orderId: data.orderId,
        invoiceUrl: data.invoiceUrl,
        amountUsd: data.amountUsd,
      };
    } catch {
      return { success: false, error: 'Network connection error. Please try again.' };
    }
  }, []);

  // Real-time Polling Loop (polls every 2.5s until webhook approves)
  const startOrderPolling = useCallback((ref, onApproved, onTimeout) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    let count = 0;
    const maxAttempts = 288; // ~12 minutes total at 2.5s interval (covers USDT TRC-20 / Polygon confirmations)

    pollIntervalRef.current = setInterval(async () => {
      count++;
      const data = await refreshVipStatus(ref);

      if (data && data.isVip) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        if (onApproved) onApproved(data);
      }

      if (count >= maxAttempts) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        if (onTimeout) onTimeout();
      }
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [refreshVipStatus]);

  // Passcode / Voucher Activation via Server-Authoritative API
  const activateVip = useCallback(async (inputCode) => {
    if (!inputCode) return { success: false, error: 'Please enter a VIP code' };
    const clean = inputCode.trim().toUpperCase();

    try {
      const res = await fetch('/api/vip/activate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: clean }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid or expired VIP code' };
      }

      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const localData = {
        active: true,
        code: clean,
        activatedAt: Date.now(),
        expiresAt,
      };
      localStorage.setItem(VIP_KEY, JSON.stringify(localData));
      setLocalVip(localData);
      window.dispatchEvent(new Event('rebafilme_vip_updated'));
      await refreshVipStatus();
      return { success: true, message: data.message || 'VIP Pass activated! Enjoy 100% ad-free streaming.' };
    } catch {
      return { success: false, error: 'Verification service unavailable. Please check your network.' };
    }
  }, [refreshVipStatus]);

  const deactivateVip = useCallback(() => {
    localStorage.removeItem(VIP_KEY);
    setLocalVip(null);
    setServerVip(null);
    setPendingSubscription(null);
    window.dispatchEvent(new Event('rebafilme_vip_updated'));
  }, []);

  const isVip = Boolean(
    (user && (user.plan === 'vip' || user.role === 'admin')) ||
    (serverVip && serverVip.isVip) ||
    (localVip && localVip.active)
  );

  const daysRemaining = serverVip?.daysRemaining ?? (
    localVip?.expiresAt ? Math.max(0, Math.ceil((localVip.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))) : 30
  );

  return {
    isVip,
    localVip,
    serverVip,
    pendingSubscription,
    daysRemaining,
    expiresAt: serverVip?.expiresAt || (localVip?.expiresAt ? new Date(localVip.expiresAt).toISOString() : null),
    loadingStatus,
    activateVip,
    deactivateVip,
    initiatePayment,
    initiateCryptoPayment,
    startOrderPolling,
    refreshVipStatus,
  };
}

export default useVIP;
