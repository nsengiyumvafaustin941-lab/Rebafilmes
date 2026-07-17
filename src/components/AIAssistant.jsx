import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Bot, X, Send, Film, Sparkles } from 'lucide-react';
import { api } from '../utils/api';
import { moviePath } from '../utils/tmdb';
import './AIAssistant.css';

const EXAMPLE_CHIPS = [
  'Comedy tonight',
  'Action & thriller',
  'Romantic movie',
  'Nshaka drama nziza',   
  'Indian movies',
  'Ikintu cy\'umuryango',
];

const AIAssistant = () => {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState(null);
  const [error, setError]       = useState(null);
  // Start hidden — only show after KV explicitly confirms enabled.
  // Default false prevents the button flashing for users with no cached settings.
  const [visible, setVisible] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('rebafilme_settings') || '{}');
      return s.aiAssistantEnabled === true; // strict: must be explicitly true
    } catch {
      return false; // safe default: hidden
    }
  });
  const inputRef    = useRef(null);
  const debounceRef = useRef(null);

  // Fetch authoritative value from KV on every mount.
  // This is the source of truth — overrides any cached localStorage value.
  useEffect(() => {
    api.get('rebafilme_settings', {}).then(s => {
      setVisible(s.aiAssistantEnabled === true); // strict: must be explicitly true
    }).catch(() => {
      setVisible(false); // hide on API error — safe default
    });
  }, []);

  // ALL hooks must be declared before any conditional return (Rules of Hooks)
  const search = useCallback(async (q) => {
    const text = (q || query).trim();
    if (!text) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setResults(data);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Render nothing when hidden — AFTER all hooks are declared
  if (!visible) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      search();
    }
  };

  const handleChip = (chip) => {
    setQuery(chip);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(chip), 50);
  };

  const handleToggle = () => {
    setOpen(o => {
      if (!o) setTimeout(() => inputRef.current?.focus(), 200);
      return !o;
    });
  };

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        className={`ai-trigger ${open ? 'open' : ''}`}
        onClick={handleToggle}
        aria-label={open ? 'Close AI assistant' : 'Open AI movie assistant'}
        title="AI Movie Assistant"
      >
        {open ? <X size={20} /> : <Bot size={22} />}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div className="ai-panel" role="dialog" aria-label="AI Movie Assistant">

          {/* Header */}
          <div className="ai-panel-header">
            <div className="ai-panel-icon">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="ai-panel-title">Movie Assistant</div>
              <div className="ai-panel-subtitle">Powered by Rebafilme AI</div>
            </div>
          </div>

          {/* Body */}
          <div className="ai-panel-body">

            {/* Loading shimmer */}
            {loading && (
              <div className="ai-loading">
                <div className="ai-shimmer" />
                <div className="ai-shimmer" style={{ opacity: 0.6 }} />
                <div className="ai-shimmer" style={{ opacity: 0.35 }} />
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="ai-empty">⚠️ {error}</div>
            )}

            {/* Results */}
            {!loading && !error && results && (
              <>
                {results.suggestions && results.suggestions.length > 0 ? (
                  <>
                    <div className="ai-result-label">✨ Suggestions for you</div>
                    {results.suggestions.map(movie => (
                      <NavLink
                        key={movie.id}
                        to={moviePath(movie.id, movie.title)}
                        className="ai-movie-card"
                        onClick={() => setOpen(false)}
                      >
                        {movie.poster ? (
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="ai-movie-poster"
                            loading="lazy"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="ai-movie-poster-placeholder">
                            <Film size={20} />
                          </div>
                        )}
                        <div className="ai-movie-info">
                          <div className="ai-movie-title">{movie.title}</div>
                          <div className="ai-movie-meta">
                            {movie.genre && (
                              <span className="ai-badge ai-badge-genre">{movie.genre}</span>
                            )}
                            {movie.year && (
                              <span className="ai-badge ai-badge-year">{movie.year}</span>
                            )}
                          </div>
                          {movie.reason && (
                            <div className="ai-movie-reason">{movie.reason}</div>
                          )}
                        </div>
                      </NavLink>
                    ))}
                  </>
                ) : (
                  <div className="ai-empty">
                       {results.message || 'No matching movies found. Try a different description!'}
                  </div>
                )}
              </>
            )}

            {/* Placeholder (no search yet) */}
            {!loading && !error && !results && (
              <div className="ai-placeholder">
                <Bot size={36} style={{ color: '#e50914', opacity: 0.6 }} />
                <p>
                  Describe what you want to watch and I'll find it for you in English or Kinyarwanda!
                </p>
                <div className="ai-chip-row">
                  {EXAMPLE_CHIPS.map(chip => (
                    <button
                      key={chip}
                      className="ai-chip"
                      onClick={() => handleChip(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input footer */}
          <div className="ai-input-row">
            <input
              ref={inputRef}
              className="ai-input"
              placeholder="e.g. funny movie, nshaka action..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={300}
            />
            <button
              className="ai-send-btn"
              onClick={() => search()}
              disabled={loading || !query.trim()}
              aria-label="Search"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
