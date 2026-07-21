import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Film } from "lucide-react";
import AdBanner from "../components/AdBanner";
import { useMovies } from "../contexts/MoviesContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
  getDownloadUrl,
  moviePath,
  getTrailerKey,
  parseMovieId,
} from "../utils/tmdb";
import { getSettings } from "../utils/settings";
import "./CinemaPage.css";

const CinemaPage = () => {
  const { t } = useLanguage();
  const { allMovies, fetchMovieById } = useMovies();
  const [params] = useSearchParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(getSettings());

  useEffect(() => {
    const sync = () => setSettings(getSettings());
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const id = parseMovieId(params.get("vd"));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const fromList = allMovies.find((c) => c.id === id);
      if (fromList?.trailerKey) {
        if (!cancelled) {
          setItem(fromList);
          setLoading(false);
        }
        return;
      }
      const detailed = await fetchMovieById(id);
      if (!cancelled) {
        setItem(detailed);
        setLoading(false);
      }
    };
    if (id) load();
    else {
      setLoading(false);
      setItem(null);
    }
    return () => {
      cancelled = true;
    };
  }, [id, allMovies, fetchMovieById]);

  if (loading) {
    return (
      <div className="cinema-error page">
        <p>Loading trailer…</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="cinema-error page">
        <h2>{t("cinema_error")}</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
          ← {t("account_back_home")}
        </Link>
      </div>
    );
  }

  const trailerKey =
    settings.trailersEnabled !== false ? getTrailerKey(item) : null;
  const downloadUrl = getDownloadUrl(item.title);

  return (
    <div className="cinema-page">
      <div className="bg-logo-pattern" />
      <div className="cinema-topbar">
        <Link to={moviePath(item.id, item.title)} className="back-btn">
          <ArrowLeft size={20} />
          <span className="cinema-title">{item.title}</span>
        </Link>
        <span className="cinema-badge badge badge-accent">
          {item.badge || "HD"}
        </span>
      </div>

      <AdBanner position="cinema_top" />

      <div className="cinema-player-wrap">
        {trailerKey ? (
          <div className="cinema-player cinema-trailer">
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
              title={`${item.title} - Official Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="cinema-player cinema-no-trailer">
            <Film size={48} />
            <p>No trailer available for this title.</p>
          </div>
        )}
      </div>

      <div className="cinema-info page">
        <h2>{item.title}</h2>
        {item.description && <p className="cinema-desc">{item.description}</p>}

        {settings.downloadEnabled !== false && (
          <div className="cinema-download-wrap">
            <AdBanner position="cinema_download" />
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary download-btn"
            >
              <Download size={17} /> {t("download_movie") || "Download Movie"}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default CinemaPage;
