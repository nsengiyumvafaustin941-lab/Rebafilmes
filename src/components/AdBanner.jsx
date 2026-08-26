import React, { useEffect, useRef } from 'react';
import { useAds } from '../contexts/AdsContext';
import { useVIP } from '../hooks/useVIP';
import { useAdmin } from '../contexts/AdminContext';
import { useMonetizationEnabled } from '../hooks/useMonetizationEnabled';
import { getSettings } from '../utils/settings';
import './AdBanner.css';

const SingleBanner = ({ ad, isSponsor, sponsorLabel, onTrackClick, onTrackImpression }) => {
  const bannerRef = useRef(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current || !ad?.id) return;

    if (!('IntersectionObserver' in window)) {
      onTrackImpression(ad.id);
      trackedRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!trackedRef.current) {
              onTrackImpression(ad.id);
              trackedRef.current = true;
            }
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (bannerRef.current) {
      observer.observe(bannerRef.current);
    }

    return () => observer.disconnect();
  }, [ad, onTrackImpression]);

  return (
    <a
      ref={bannerRef}
      href={ad.linkUrl || '#'}
      target={ad.linkUrl ? '_blank' : '_self'}
      rel={ad.linkUrl ? 'noopener noreferrer sponsored' : undefined}
      className={`promo-banner${isSponsor ? ' promo-sponsor' : ''}`}
      title={ad.title}
      onClick={() => onTrackClick(ad.id)}
    >
      {ad.imageUrl ? (
        <img src={ad.imageUrl} alt={ad.title} className="promo-img" loading="lazy" />
      ) : (
        <div className="promo-text-only">
          <span className="promo-label">{isSponsor ? sponsorLabel : 'PROMO'}</span>
          <span>{ad.sponsorName ? `${ad.sponsorName} — ${ad.title}` : ad.title}</span>
        </div>
      )}
      <span className="promo-tag">{isSponsor ? sponsorLabel : 'Ikanguro'}</span>
      {isSponsor && ad.sponsorName && (
        <span className="promo-sponsor-name">{ad.sponsorName}</span>
      )}
    </a>
  );
};

const AdBanner = ({ position }) => {
  const { isVip } = useVIP();
  const { isAdmin } = useAdmin();
  const monetizationEnabled = useMonetizationEnabled();
  const { getAdsByPosition, trackClick, trackImpression } = useAds();
  const adsToShow = getAdsByPosition(position);
  const sponsorLabel = getSettings().adSponsorLabel || 'Sponsored';

  // VIP users, admins, and when monetization is disabled do not see banner ads
  if (isVip || isAdmin || !monetizationEnabled || adsToShow.length === 0) return null;

  return (
    <div className="promo-zone">
      {adsToShow.map((ad) => {
        const isSponsor = ad.adKind === 'sponsor' || ad.sponsorName;
        return (
          <SingleBanner
            key={ad.id}
            ad={ad}
            isSponsor={isSponsor}
            sponsorLabel={sponsorLabel}
            onTrackClick={trackClick}
            onTrackImpression={trackImpression}
          />
        );
      })}
    </div>
  );
};

export default AdBanner;
