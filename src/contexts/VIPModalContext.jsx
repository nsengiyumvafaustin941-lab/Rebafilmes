import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import VIPModal from '../components/VIPModal';

/**
 * VIPModalContext — single global modal instance.
 * Any component calls openVIPModal(planId) to trigger the modal.
 * Automatically handles re-opening after login when redirected from VIP purchase.
 */
const VIPModalContext = createContext({ 
  openVIPModal: () => {},
  closeVIPModal: () => {},
  isOpen: false,
  initialPlanId: 'monthly'
});

export const useVIPModal = () => useContext(VIPModalContext);

export const VIPModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialPlanId, setInitialPlanId] = useState(() => {
    try {
      return sessionStorage.getItem('rebafilme_pending_plan') || 'monthly';
    } catch {
      return 'monthly';
    }
  });

  const openVIPModal = useCallback((planId = null) => {
    let targetPlan = planId;
    if (!targetPlan || typeof targetPlan !== 'string') {
      try {
        targetPlan = sessionStorage.getItem('rebafilme_pending_plan') || 'monthly';
      } catch {
        targetPlan = 'monthly';
      }
    }
    setInitialPlanId(targetPlan);
    try {
      sessionStorage.setItem('rebafilme_pending_plan', targetPlan);
    } catch {}
    setIsOpen(true);
  }, []);

  const closeVIPModal = useCallback(() => {
    setIsOpen(false);
    try {
      sessionStorage.removeItem('rebafilme_auto_open_vip');
    } catch {}
  }, []);

  // Listen to custom event to open modal from anywhere
  useEffect(() => {
    const handleOpen = (e) => {
      const plan = e?.detail?.plan || sessionStorage.getItem('rebafilme_pending_plan') || 'monthly';
      if (plan) setInitialPlanId(plan);
      setIsOpen(true);
    };
    window.addEventListener('rebafilme_open_vip', handleOpen);
    return () => window.removeEventListener('rebafilme_open_vip', handleOpen);
  }, []);

  // Check URL parameters and sessionStorage for auto-opening on return from login
  useEffect(() => {
    const checkAutoOpen = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const isVipParam = params.get('vip') === '1' || params.get('open_vip') === '1';
        const urlPlan = params.get('plan');
        const autoOpenSession = sessionStorage.getItem('rebafilme_auto_open_vip') === 'true';
        const savedPlan = sessionStorage.getItem('rebafilme_pending_plan');

        if (isVipParam || autoOpenSession) {
          const chosen = urlPlan || savedPlan || 'monthly';
          setInitialPlanId(chosen);
          setIsOpen(true);
          sessionStorage.removeItem('rebafilme_auto_open_vip');

          // Clean up the URL query parameters without reloading the page
          if (isVipParam) {
            params.delete('vip');
            params.delete('open_vip');
            params.delete('plan');
            const newSearch = params.toString() ? `?${params.toString()}` : '';
            const newUrl = window.location.pathname + newSearch + window.location.hash;
            window.history.replaceState({}, '', newUrl);
          }
        }
      } catch (err) {
        console.warn('VIPModal auto-open check:', err);
      }
    };

    checkAutoOpen();
  }, []);

  return (
    <VIPModalContext.Provider value={{ openVIPModal, closeVIPModal, isOpen, initialPlanId }}>
      {children}
      {/* Single portal-level modal instance — never stacks */}
      <VIPModal isOpen={isOpen} onClose={closeVIPModal} initialPlanId={initialPlanId} />
    </VIPModalContext.Provider>
  );
};

export default VIPModalContext;

