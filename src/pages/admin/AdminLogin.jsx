import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { GOOGLE_CLIENT_ID } from '../../utils/constants';
import './AdminLayout.css';
import './AdminLogin.css';

const AdminLogin = () => {
  const { adminLoginWithGoogle, isAdmin, loginError, setLoginError } = useAdmin();
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    let intervalId;

    const setupGoogle = () => {
      if (typeof window === 'undefined' || !window.google?.accounts?.id) {
        return false;
      }

      setSdkLoaded(true);

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response.credential) return;
            setIsAuthenticating(true);
            const ok = await adminLoginWithGoogle(response.credential);
            setIsAuthenticating(false);
            if (ok) {
              navigate('/admin/dashboard', { replace: true });
            }
          },
          auto_select: false,
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            width: 280,
            logo_alignment: 'left',
          });
        }
        return true;
      } catch (err) {
        console.error('Failed to initialize Google Sign-In:', err);
        return false;
      }
    };

    if (!setupGoogle()) {
      intervalId = setInterval(() => {
        if (setupGoogle()) {
          clearInterval(intervalId);
        }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [adminLoginWithGoogle, navigate, setLoginError]);

  return (
    <div className="adm-login-page">
      <div className="bg-logo-pattern" />
      <div className="adm-login-card">
        <div className="adm-login-icon">
          <Shield size={32} />
        </div>

        <h1 className="adm-login-title">Admin Portal</h1>
        <p className="adm-login-sub">RebaFilme — Authorized Access Only</p>

        {loginError && (
          <div className="adm-login-error">
            <AlertCircle size={16} />
            <span>{loginError}</span>
          </div>
        )}

        <div className="adm-google-container">
          {isAuthenticating ? (
            <div className="adm-google-loading">
              <Loader2 size={24} className="spin" />
              <span>Verifying Admin Authorization…</span>
            </div>
          ) : (
            <>
              <div ref={googleBtnRef} className="adm-google-btn-slot" />
              {!sdkLoaded && (
                <div className="adm-google-placeholder">
                  <Loader2 size={18} className="spin" />
                  <span>Loading Google Auth…</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="adm-security-badge">
          <Shield size={13} />
          <span>Restricted to whitelisted administrator accounts</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
