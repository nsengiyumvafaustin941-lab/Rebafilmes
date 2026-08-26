import React from 'react';
import MovieCard from './MovieCard';
import NativeAdCard from './NativeAdCard';
import { useVIP } from '../hooks/useVIP';
import { useVIPModal } from '../contexts/VIPModalContext';
import { useAds } from '../contexts/AdsContext';
import { getSettings } from '../utils/settings';
import './ContentGrid.css';

const ContentGrid = ({ title, items }) => {
  const { isVip } = useVIP();
  const { openVIPModal } = useVIPModal();
  const { ads } = useAds();
  const settings = getSettings();
  const interval = Number(settings.nativeAdsInterval) || 8;

  const activeAds = ads.filter((a) => a.active);

  return (
    <section className="content-grid-section">
      {title && (
        <div className="section-header" style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
          <h2 className="section-title">{title}</h2>
        </div>
      )}
      <div className="content-grid">
        {items.map((item, idx) => {
          const showAdAfter = !isVip && idx > 0 && (idx + 1) % interval === 0;
          const adIndex = Math.floor(idx / interval) % (activeAds.length || 1);
          const currentAd = activeAds.length > 0 ? activeAds[adIndex] : null;

          return (
            <React.Fragment key={item.id}>
              <MovieCard item={item} />
              {showAdAfter && (
                <NativeAdCard 
                  ad={currentAd} 
                  onOpenVIP={openVIPModal} 
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};

export default ContentGrid;

