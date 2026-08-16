import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Film, Tv, ArrowRight } from 'lucide-react';
import { getSearchSuggest } from '../utils/tmdb';
import './SearchAutocomplete.css';

export const SearchAutocomplete = ({ query, visible, onClose, onSelect }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const cleanQ = (query || '').trim();
    if (cleanQ.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await getSearchSuggest(cleanQ);
        setItems(results);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const handleItemClick = useCallback((item) => {
    if (onSelect) onSelect(item);
    if (onClose) onClose();
    navigate(item.url);
  }, [navigate, onClose, onSelect]);

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!visible || items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && items[selectedIndex]) {
          e.preventDefault();
          handleItemClick(items[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, items, selectedIndex, onClose, handleItemClick]);

  const handleViewAll = () => {
    if (onClose) onClose();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  if (!visible || !query || query.trim().length < 2) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="search-autocomplete-dropdown">
      {loading ? (
        <div className="autocomplete-loading">Searching TMDB library…</div>
      ) : items.length > 0 ? (
        <>
          {items.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const isTv = item.type === 'series' || item.type === 'tv';

            return (
              <div
                key={`${item.id}-${idx}`}
                className={`autocomplete-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                {item.poster ? (
                  <img src={item.poster} alt={item.title} className="autocomplete-poster" />
                ) : (
                  <div className="autocomplete-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isTv ? <Tv size={18} color="#666" /> : <Film size={18} color="#666" />}
                  </div>
                )}
                <div className="autocomplete-info">
                  <div className="autocomplete-title">{item.title}</div>
                  <div className="autocomplete-meta">
                    <span className="autocomplete-badge">{isTv ? 'TV' : 'Movie'}</span>
                    {item.year && <span>{item.year}</span>}
                    {item.genre && <span>• {item.genre}</span>}
                    {item.rating > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: 'auto' }}>
                        <Star size={11} fill="#ffb400" stroke="#ffb400" />
                        {Number(item.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="autocomplete-view-all" onClick={handleViewAll} role="button" tabIndex={0}>
            <span>View all results for "{query}"</span>
            <ArrowRight size={14} style={{ marginLeft: '6px' }} />
          </div>
        </>
      ) : (
        <div className="autocomplete-empty">No matching titles on TMDB</div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
