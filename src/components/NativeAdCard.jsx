import React, { useEffect, useRef } from 'react';
import { ExternalLink, Crown, Megaphone } from 'lucide-react';
import { useAds } from '../contexts/AdsContext';
import { useMonetizationEnabled } from '../hooks/useMonetizationEnabled';
import { getSettings } from '../utils/settings';
import './NativeAdCard.css';

const NativeAdCard = ({ ad, onOpenVIP }) => {
  const monetizationEnabled = useMonetizationEnabled();
  const { trackClick, trackImpression } = useAds();
  const tracked = useRef(new Set());
  const cardRef = useRef(null);
  const settings = getSettings();
  const sponsorLabel = settings.adSponsorLabel || 'Sponsored';

  useEffect(() => {
    if (!monetizationEnabled || !ad || tracked.current.has(ad.id)) return;

    if (!('IntersectionObserver' in window)) {
      trackImpression(ad.id);
      tracked.current.add(ad.id);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!tracked.current.has(ad.id)) {
              trackImpression(ad.id);
              tracked.current.add(ad.id);
            }
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [ad, trackImpression]);

  if (!monetizationEnabled) return null;

  if (!ad) {
    return (
      <div 
        className="card native-ad-card vip-promo-card"
        onClick={() => {
          if (typeof onOpenVIP === 'function') {
            onOpenVIP();
          } else {
            window.dispatchEvent(new CustomEvent('rebafilme_open_vip'));
          }
        }}
        title="Upgrade to RebaFilme VIP"
      >
        <div className="card-poster native-ad-poster vip-gradient">
          <div className="vip-card-icon-center">
            <Crown size={42} color="#ffd700" />
          </div>
          <span className="card-badge badge badge-gold">VIP PASS</span>
          <div className="card-overlay">
            <span className="native-ad-cta-btn">Upgrade 👑</span>
          </div>
        </div>
        <div className="card-info">
          <p className="card-title" style={{ color: '#ffd700' }}>RebaFilme VIP</p>
          <p className="card-meta">
            <span className="card-genre">100% Ad-Free · MoMo</span>
          </p>
        </div>
      </div>
    );
  }

  const isSponsor = ad.adKind === 'sponsor' || ad.sponsorName;
  const linkUrl = ad.linkUrl || '#';

  const handleClick = () => {
    if (ad.id) trackClick(ad.id);
  };


  return (
    <a
      ref={cardRef}
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="card native-ad-card"
      onClick={handleClick}
      title={ad.title}
    >
      <div className="card-poster native-ad-poster">
        {ad.imageUrl ? (
          <img src={ad.imageUrl} alt={ad.title} loading="lazy" />
        ) : (
          <div className="native-ad-fallback">
            <Megaphone size={36} color="var(--accent, #e50914)" />
            <span>{ad.sponsorName || 'Promo'}</span>
          </div>
        )}
        <span className="card-badge badge badge-accent">
          {isSponsor ? sponsorLabel : 'AD'}
        </span>
        <div className="card-overlay">
          <ExternalLink size={28} color="#ffffff" className="card-play" />
        </div>
      </div>
      <div className="card-info">
        <p className="card-title">{ad.title}</p>
        <p className="card-meta">
          <span className="card-genre">{ad.sponsorName ? `${ad.sponsorName} · Partner` : 'Featured Partner'}</span>
        </p>
      </div>
    </a>
  );
};

export default NativeAdCard;