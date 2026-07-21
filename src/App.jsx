import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from './components/Sidebar';
import AIAssistant from './components/AIAssistant';
import LanguageModal from './components/LanguageModal';
import HomePage from './pages/HomePage';
import MovieDetailPage from './pages/MovieDetailPage';
import SearchPage from './pages/SearchPage';
import MoviesPage from './pages/MoviesPage';
import SavedPage from './pages/SavedPage';
import LoginPage from './pages/LoginPage';
import TermsPage from './pages/TermsPage';
import { LanguageProvider } from './contexts/LanguageContext';
import { SavedProvider } from './contexts/SavedContext';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { MoviesProvider } from './contexts/MoviesContext';
import { AdsProvider } from './contexts/AdsContext';
import { AnnouncementsProvider } from './contexts/AnnouncementsContext';
import { HighlightsProvider } from './contexts/HighlightsContext';
import AnnouncementBar from './components/AnnouncementBar';
import SplashScreen from './components/SplashScreen';
import { SETTINGS_KEY } from './utils/constants';
import './index.css';

// ── Lazy load heavy pages ──────────────────────────────────────
const CinemaPage      = lazy(() => import('./pages/CinemaPage'));
const AdminLogin      = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminMovies     = lazy(() => import('./pages/admin/AdminMovies'));
const AdminAds        = lazy(() => import('./pages/admin/AdminAds'));
const AdminUpload     = lazy(() => import('./pages/admin/AdminUpload'));
const AdminSettings   = lazy(() => import('./pages/admin/AdminSettings'));
const AdminUsers      = lazy(() => import('./pages/admin/AdminUsers'));
const AdminHighlights = lazy(() => import('./pages/admin/AdminHighlights'));
const HighlightsPage  = lazy(() => import('./pages/HighlightsPage'));

// ── Admin route guard ──────────────────────────────────────────
const RequireAdmin = ({ children }) => {
  const { isAdmin } = useAdmin();
  return isAdmin ? children : <Navigate to="/admin/login" replace />;
};

// ── Maintenance Gate ──────────────────────────────────────────
const RequireMaintenanceGate = ({ children }) => {
  const settings = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
    catch { return {}; }
  }, []);

  if (settings.maintenanceMode) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', color: '#e50914' }}>
          Turi mu Mavugurura
        </h1>
        <p style={{ color: '#aaa', fontSize: '1.1rem', maxWidth: '500px', lineHeight: '1.6' }}>
          Urubuga ruri mu mavugurura y'igihe gito kugira ngo turusheho kubagezaho serivisi nziza. Nyabuneka mwongere mukore refresh nyuma y'akanya gato!
        </p>
        <div style={{ marginTop: '2rem', fontSize: '.85rem', color: '#555' }}>
          RebaFilme Maintenance Mode
        </div>
      </div>
    );
  }
  return children;
};

const AdminSuspense = ({ children }) => (
  <Suspense fallback={
    <div style={{ minHeight: '100vh', background: '#0a0a0d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e50914', fontFamily: 'Inter, sans-serif', fontSize: '.95rem' }}>
      Loading Admin…
    </div>
  }>
    {children}
  </Suspense>
);

const queryClient = new QueryClient();

function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <HelmetProvider>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <QueryClientProvider client={queryClient}>
        <AdminProvider>
          <MoviesProvider>
            <AdsProvider>
              <AnnouncementsProvider>
                <HighlightsProvider>
                  <AuthProvider>
                    <LanguageProvider>
                      <SavedProvider>
                        <BrowserRouter>
                          <LanguageModal />
                          <Routes>

                            {/* ── Admin Routes (completely separate layout) ── */}
                            <Route path="/admin/login" element={
                              <AdminSuspense><AdminLogin /></AdminSuspense>
                            } />
                            <Route path="/admin/*" element={
                              <RequireAdmin>
                                <AdminSuspense>
                                  <Routes>
                                    <Route index element={<Navigate to="dashboard" replace />} />
                                    <Route path="dashboard"  element={<AdminDashboard />} />
                                    <Route path="movies"     element={<AdminMovies />} />
                                    <Route path="upload"     element={<AdminUpload />} />
                                    <Route path="ads"        element={<AdminAds />} />
                                    <Route path="highlights" element={<AdminHighlights />} />
                                    <Route path="users"      element={<AdminUsers />} />
                                    <Route path="settings"   element={<AdminSettings />} />
                                    <Route path="*"          element={<Navigate to="dashboard" replace />} />
                                  </Routes>
                                </AdminSuspense>
                              </RequireAdmin>
                            } />

                            {/* ── Public routes ── */}
                            <Route path="/login" element={<RequireMaintenanceGate><LoginPage /></RequireMaintenanceGate>} />
                            <Route path="*" element={
                              <RequireMaintenanceGate>
                                <div className="layout">
                                  <Sidebar />
                                  <AIAssistant />
                                  <main className="main-content">
                                    <AnnouncementBar />
                                    <Routes>
                                      <Route path="/"           element={<HomePage />} />
                                      <Route path="/movie/:id" element={<MovieDetailPage />} />
                                      <Route path="/cinema"     element={
                                        <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'var(--accent)', fontSize:'1rem' }}>Loading player…</div>}>
                                          <CinemaPage />
                                        </Suspense>
                                      } />
                                      <Route path="/search"     element={<SearchPage />} />
                                      <Route path="/movies"     element={<MoviesPage />} />
                                      <Route path="/saved"      element={<SavedPage />} />
                                      <Route path="/highlights" element={<Navigate to="/newsfeeds" replace />} />
                                      <Route path="/newsfeeds" element={
                                        <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'var(--accent)', fontSize:'1rem' }}>Loading…</div>}>
                                          <HighlightsPage />
                                        </Suspense>
                                      } />
                                      <Route path="/terms"      element={<TermsPage />} />
                                      <Route path="*"           element={<HomePage />} />
                                    </Routes>
                                  </main>
                                </div>
                              </RequireMaintenanceGate>
                            } />

                          </Routes>
                        </BrowserRouter>
                      </SavedProvider>
                    </LanguageProvider>
                  </AuthProvider>
                </HighlightsProvider>
              </AnnouncementsProvider>
            </AdsProvider>
          </MoviesProvider>
        </AdminProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
