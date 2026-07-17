import React from 'react';
import { PlayCircle } from 'lucide-react';
import { useHighlights } from '../contexts/HighlightsContext';
import './HighlightsPage.css';

const HighlightsPage = () => {
  const { highlights } = useHighlights();
  const visible = highlights.filter(h => h.active);

  return (
    <div className="hl-page">
      <div className="hl-header">
        <div className="hl-header-icon">
          <PlayCircle size={28} />
        </div>
        <div>
          <h1 className="hl-title">Highlights</h1>
          <p className="hl-subtitle">Watch our latest clips &amp; trailers</p>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="hl-empty">
          <PlayCircle size={52} />
          <p>No highlights available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="hl-grid">
          {visible.map(h => (
            <article key={h.id} className="hl-card">
              <div className="hl-video-wrap">
                <iframe
                  src={`https://www.youtube.com/embed/${h.videoId}`}
                  title={h.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="hl-iframe"
                />
              </div>
              <div className="hl-card-body">
                <h2 className="hl-card-title">{h.title}</h2>
                {h.description && <p className="hl-card-desc">{h.description}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default HighlightsPage;
