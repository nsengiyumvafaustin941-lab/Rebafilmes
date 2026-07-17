import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';

const TermsPage = () => {
  const { t } = useLanguage();

  return (
    <div className="page" style={{ padding: '6rem 2rem 2rem 2rem', minHeight: '100vh', background: '#0a0a0f', color: '#fff' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/" style={{ color: '#e50914', textDecoration: 'none' }}>← {t('account_back_home')}</Link>
        </div>
        
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: '#fff' }}>Terms of Service & Privacy Policy</h1>
        
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#e50914' }}>1. Terms of Service</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem', color: '#ccc' }}>
            Welcome to RebaFilme. By accessing and using our platform, you agree to comply with and be bound by the following terms and conditions. If you do not agree with any part of these terms, please do not use our service.
          </p>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem', color: '#ccc' }}>
            Our platform provides original, non-translated movies, series, and related entertainment content. You must be at least 13 years old to use our service. You are responsible for maintaining the confidentiality of your account information.
          </p>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem', color: '#ccc' }}>
            All content provided on RebaFilme is for personal, non-commercial use only. You may not distribute, modify, transmit, or use the content for public or commercial purposes without our written permission.
          </p>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#e50914' }}>2. Privacy Policy</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem', color: '#ccc' }}>
            At RebaFilme, we take your privacy seriously. We collect personal information such as your name, email address, and phone number when you register an account. We use this information solely to provide and improve our services, manage your subscription, and communicate with you.
          </p>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem', color: '#ccc' }}>
            We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our website or conducting our business, as long as those parties agree to keep this information confidential.
          </p>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem', color: '#ccc' }}>
            We implement a variety of security measures to maintain the safety of your personal information. All sensitive information is transmitted via Secure Socket Layer (SSL) technology and encrypted in our database.
          </p>
        </section>
        
        <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '2rem' }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default TermsPage;
