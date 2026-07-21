import React, { useState, useEffect, useCallback } from 'react';
import { Users, Shield, ShieldAlert, Check, Search, User, RefreshCw, AlertCircle } from 'lucide-react';
import { ADMIN_SESSION_KEY } from '../../utils/constants';
import AdminLayout from './AdminLayout';
import './AdminLayout.css';

/* ─── API helpers ──────────────────────────────────────── */
const getAdminToken = () => {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    // AdminContext stores { username, token: password, at }
    return parsed.token || '';
  } catch {
    return '';
  }
};

const fetchUsers = async () => {
  const res = await fetch('/api/admin/users', {
    headers: { 'x-admin-token': getAdminToken() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.users || [];
};

const patchUser = async (id, updates) => {
  const res = await fetch(`/api/admin/users?id=${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': getAdminToken(),
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

/* ─── Component ────────────────────────────────────────── */
const AdminUsers = () => {
  const [users, setUsers]     = useState([]);
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [busy, setBusy]       = useState({}); // { [userId]: true } while updating

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchUsers();
      setUsers(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleVIP = async (user) => {
    const newPlan = user.plan === 'vip' ? 'free' : 'vip';
    setBusy(b => ({ ...b, [user.id]: true }));
    try {
      await patchUser(user.id, { plan: newPlan });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, plan: newPlan } : u));
    } catch (e) {
      alert('Failed to update plan: ' + e.message);
    } finally {
      setBusy(b => ({ ...b, [user.id]: false }));
    }
  };

  const handleToggleBan = async (user) => {
    const newStatus = user.status === 'banned' ? 'active' : 'banned';
    setBusy(b => ({ ...b, [user.id]: true }));
    try {
      await patchUser(user.id, { status: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (e) {
      alert('Failed to update status: ' + e.message);
    } finally {
      setBusy(b => ({ ...b, [user.id]: false }));
    }
  };

  const filtered = users.filter(u =>
    !query ||
    (u.name || '').toLowerCase().includes(query.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(query.toLowerCase()) ||
    (u.phone || '').includes(query)
  );

  return (
    <AdminLayout>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Users</h1>
          <p className="adm-page-subtitle">
            {loading ? 'Loading…' : `${users.length} registered account${users.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="adm-search-bar">
            <Search size={15} color="#444" />
            <input
              type="text"
              placeholder="Search by name, email or phone…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={load}
            disabled={loading}
            title="Refresh"
            style={{ padding: '0.4rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? '' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)',
          borderRadius: '8px', padding: '0.9rem 1.25rem', marginBottom: '1.25rem',
          color: '#ff6b6b', fontSize: '0.9rem',
        }}>
          <AlertCircle size={18} />
          <span><strong>Error loading users:</strong> {error}</span>
          <button
            onClick={load}
            className="adm-btn adm-btn-sm adm-btn-ghost"
            style={{ marginLeft: 'auto' }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email / Phone</th>
              <th>Joined</th>
              <th>Status</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="adm-empty">
                    <RefreshCw size={28} className="spin" />
                    <p>Loading users…</p>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="adm-empty">
                    <Users size={36} />
                    <p>{query ? 'No users match your search.' : 'No registered users yet.'}</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(u => {
              const displayEmail = u.email && u.email.endsWith('@phone.rebafilme.local')
                ? (u.phone || '—')   // show phone number instead of internal email
                : (u.email || '—');
              const isPhoneUser = u.email && u.email.endsWith('@phone.rebafilme.local');

              return (
                <tr key={u.id} style={{ opacity: u.status === 'banned' ? 0.6 : 1 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(255,255,255,.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <User size={16} />
                      </div>
                      <strong style={{ color: '#fff' }}>{u.name || '—'}</strong>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: isPhoneUser ? '#aaa' : 'inherit' }}>
                      {isPhoneUser ? '📱 ' : ''}{displayEmail}
                    </span>
                  </td>
                  <td>{u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '—'}</td>
                  <td>
                    {u.status === 'banned'
                      ? <span className="adm-badge adm-badge-inactive">Banned</span>
                      : <span className="adm-badge adm-badge-active">Active</span>
                    }
                  </td>
                  <td>
                    {u.plan === 'vip'
                      ? <span className="adm-badge adm-badge-admin">VIP</span>
                      : <span className="adm-badge adm-badge-default">Free</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '.4rem' }}>
                      <button
                        className={`adm-btn adm-btn-sm ${u.plan === 'vip' ? 'adm-btn-primary' : 'adm-btn-ghost'}`}
                        onClick={() => handleToggleVIP(u)}
                        disabled={busy[u.id]}
                        title={u.plan === 'vip' ? 'Remove VIP' : 'Make VIP'}
                      >
                        {u.plan === 'vip' ? <Check size={13} /> : <Shield size={13} />}
                        {' '}{u.plan === 'vip' ? 'VIP' : 'Make VIP'}
                      </button>
                      <button
                        className={`adm-btn adm-btn-sm ${u.status === 'banned' ? 'adm-btn-ghost' : 'adm-btn-danger'}`}
                        onClick={() => handleToggleBan(u)}
                        disabled={busy[u.id]}
                        title={u.status === 'banned' ? 'Unban User' : 'Ban User'}
                      >
                        <ShieldAlert size={13} />
                        {' '}{u.status === 'banned' ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
