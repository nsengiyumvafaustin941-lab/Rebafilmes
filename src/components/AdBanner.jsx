import React, { useEffect, useRef } from 'react';
import { useAds } from '../contexts/AdsContext';
import { getSettings } from '../utils/settings';
import './AdBanner.css';

const AdBanner = ({ position }) => {
  const { getAdsByPosition, trackClick, trackImpression } = useAds();
  const adsToShow = getAdsByPosition(position);
  const tracked = useRef(new Set());
  const sponsorLabel = getSettings().adSponsorLabel || 'Sponsored';

  useEffect(() => {
    adsToShow.forEach((ad) => {
      if (!tracked.current.has(ad.id)) {
        trackImpression(ad.id);
        tracked.current.add(ad.id);
      }
    });
  }, [adsToShow, trackImpression]);

  if (adsToShow.length === 0) return null;

  return (
    <div className="promo-zone">
      {adsToShow.map((ad) => {
        const isSponsor = ad.adKind === 'sponsor' || ad.sponsorName;
        return (
          <a
            key={ad.id}
            href={ad.linkUrl || '#'}
            target={ad.linkUrl ? '_blank' : '_self'}
            rel={ad.linkUrl ? 'noopener noreferrer sponsored' : undefined}
            className={`promo-banner${isSponsor ? ' promo-sponsor' : ''}`}
            title={ad.title}
            onClick={() => trackClick(ad.id)}
          >
            {ad.imageUrl ? (
              <img src={ad.imageUrl} alt={ad.title} className="promo-img" />
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
      })}
    </div>
  );
};

export default AdBanner;
