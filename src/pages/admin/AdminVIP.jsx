import React, { useState, useEffect, useCallback } from 'react';
import { 
  Crown, Clock, DollarSign, Search, RefreshCw, 
  CheckCircle2, XCircle, AlertCircle, Phone, Copy, Check, 
  CreditCard, Globe, Zap, PlusCircle
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import './AdminVIP.css';

export const AdminVIP = () => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingCount: 0,
    activeVipCount: 0,
    totalRevenueRwf: 0,
    totalRevenueUsd: 0,
  });

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [actionBusy, setActionBusy] = useState({});

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (methodFilter !== 'all') params.append('method', methodFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/admin/vip?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to load VIP data (${res.status})`);
      }

      const data = await res.json();
      setStats(data.stats || {});
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      console.error('Error fetching VIP subscriptions:', err);
      setError(err.message || 'Could not load VIP data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, methodFilter, search]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleAction = async (subscriptionId, action, days = 30) => {
    try {
      setActionBusy((prev) => ({ ...prev, [subscriptionId]: true }));
      const res = await fetch('/api/admin/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subscriptionId, action, days }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Action failed');
        return;
      }

      fetchSubscriptions();
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setActionBusy((prev) => ({ ...prev, [subscriptionId]: false }));
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatAmount = (sub) => {
    const isUsd = (sub.momo_tx_id && (sub.momo_tx_id.startsWith('REBA_CARD') || sub.momo_tx_id.startsWith('NOWPAY'))) || 
                  (sub.admin_notes && sub.admin_notes.includes('NOWPayments'));
    if (isUsd) {
      return `$${Number(sub.amount || 3.99).toFixed(2)} USD`;
    }
    return `${Number(sub.amount || 0).toLocaleString()} RWF`;
  };

  const getMethodBadge = (sub) => {
    const isCrypto = (sub.momo_tx_id && (sub.momo_tx_id.startsWith('REBA_CARD') || sub.momo_tx_id.startsWith('NOWPAY'))) || 
                     (sub.admin_notes && sub.admin_notes.includes('NOWPayments'));
    const isVoucher = sub.admin_notes && sub.admin_notes.includes('Voucher');

    if (isCrypto) {
      return (
        <span className="adm-method-chip crypto">
          <CreditCard size={12} /> Card / Crypto
        </span>
      );
    }
    if (isVoucher) {
      return (
        <span className="adm-method-chip voucher">
          <Zap size={12} /> Voucher
        </span>
      );
    }
    return (
      <span className="adm-method-chip momo">
        <Phone size={12} /> MoMo (Paypack)
      </span>
    );
  };

  return (
    <AdminLayout title="VIP Subscriptions & Multi-Currency Monetization">
      {/* Analytics Stats Grid */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card">
          <div className="adm-stat-icon" style={{ background: '#ffd70018', color: '#ffd700' }}>
            <DollarSign size={20} />
          </div>
          <div className="adm-stat-value">{Number(stats.totalRevenueRwf || 0).toLocaleString()} RWF</div>
          <div className="adm-stat-label">Total MoMo Revenue</div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-icon" style={{ background: '#3b82f618', color: '#3b82f6' }}>
            <Globe size={20} />
          </div>
          <div className="adm-stat-value">${Number(stats.totalRevenueUsd || 0).toFixed(2)} USD</div>
          <div className="adm-stat-label">Cards & Crypto Revenue (NOWPayments)</div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-icon" style={{ background: '#22c55e18', color: '#22c55e' }}>
            <Crown size={20} />
          </div>
          <div className="adm-stat-value">{stats.activeVipCount}</div>
          <div className="adm-stat-label">Active VIP Subscribers</div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-icon" style={{ background: '#f59e0b18', color: '#f59e0b' }}>
            <Clock size={20} />
          </div>
          <div className="adm-stat-value">{stats.pendingCount}</div>
          <div className="adm-stat-label">Pending Order Approvals</div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="adm-vip-toolbar">
        {/* Status Tabs */}
        <div className="adm-vip-tabs">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: `Pending (${stats.pendingCount})` },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'expired', label: 'Expired' },
            { key: 'refunded', label: 'Refunded' },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`adm-vip-tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Method Filter & Search */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            className="adm-method-select"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">All Gateways</option>
            <option value="momo">⚡ MTN / Airtel MoMo</option>
            <option value="crypto">💳 Cards & Crypto (NOWPayments)</option>
            <option value="voucher">🎁 Vouchers</option>
          </select>

          <div className="adm-search-bar">
            <Search size={15} color="#666" />
            <input
              type="text"
              placeholder="Search phone, email, TxID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button className="adm-btn adm-btn-ghost" onClick={fetchSubscriptions} title="Refresh Table">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="adm-vip-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="adm-btn adm-btn-sm adm-btn-ghost" onClick={fetchSubscriptions}>Retry</button>
        </div>
      )}

      {/* Transactions Table */}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Customer / Contact</th>
              <th>Gateway Method</th>
              <th>Transaction ID / Order</th>
              <th>Amount</th>
              <th>Expires At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && subscriptions.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="adm-empty">
                    <RefreshCw size={28} className="spin" />
                    <p>Loading subscriptions...</p>
                  </div>
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="adm-empty">
                    <Crown size={36} color="#ffd700" />
                    <p>{search || statusFilter !== 'all' || methodFilter !== 'all' ? 'No subscriptions match your filters.' : 'No VIP orders yet.'}</p>
                  </div>
                </td>
              </tr>
            ) : subscriptions.map((sub) => {
              const isApproved = sub.status === 'approved';
              const isPending = sub.status === 'pending';
              const isRejected = sub.status === 'rejected';
              const isExpired = sub.status === 'expired';

              return (
                <tr key={sub.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>
                        {sub.phone || sub.user_email || 'Customer'}
                      </div>
                      {sub.user_name && <div style={{ color: '#888', fontSize: '0.76rem' }}>{sub.user_name}</div>}
                    </div>
                  </td>

                  <td>{getMethodBadge(sub)}</td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#aaa' }}>
                      <code>{sub.momo_tx_id}</code>
                      <button 
                        className="adm-copy-icon-btn" 
                        onClick={() => handleCopy(sub.momo_tx_id, sub.id)}
                        title="Copy TxID"
                      >
                        {copiedId === sub.id ? <Check size={12} color="#00e676" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>

                  <td>
                    <strong style={{ color: formatAmount(sub).includes('$') ? '#93c5fd' : '#ffd700' }}>
                      {formatAmount(sub)}
                    </strong>
                  </td>

                  <td style={{ fontSize: '0.82rem', color: isApproved ? '#00e676' : '#777' }}>
                    {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '—'}
                  </td>

                  <td>
                    {isPending && <span className="adm-badge adm-badge-warning">Pending</span>}
                    {isApproved && <span className="adm-badge adm-badge-active">Approved</span>}
                    {isRejected && <span className="adm-badge adm-badge-danger">Rejected</span>}
                    {isExpired && <span className="adm-badge adm-badge-inactive">Expired</span>}
                    {sub.status === 'refunded' && <span className="adm-badge adm-badge-danger">Refunded</span>}
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {isPending && (
                        <>
                          <button
                            className="adm-btn adm-btn-sm adm-btn-success"
                            onClick={() => handleAction(sub.id, 'approve', 30)}
                            disabled={actionBusy[sub.id]}
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve (30d)</span>
                          </button>
                          <button
                            className="adm-btn adm-btn-sm adm-btn-danger"
                            onClick={() => handleAction(sub.id, 'reject')}
                            disabled={actionBusy[sub.id]}
                          >
                            <XCircle size={13} />
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <>
                          <button
                            className="adm-btn adm-btn-sm adm-btn-primary"
                            onClick={() => handleAction(sub.id, 'extend', 30)}
                            disabled={actionBusy[sub.id]}
                            title="Add +30 Days"
                          >
                            <PlusCircle size={13} />
                            <span>+30d</span>
                          </button>
                          <button
                            className="adm-btn adm-btn-sm adm-btn-ghost"
                            onClick={() => {
                              if (window.confirm('Revoke VIP access for this user?')) {
                                handleAction(sub.id, 'revoke');
                              }
                            }}
                            disabled={actionBusy[sub.id]}
                            title="Revoke VIP"
                          >
                            Revoke
                          </button>
                          <button
                            className="adm-btn adm-btn-sm adm-btn-danger"
                            onClick={() => {
                              if (window.confirm('Mark this subscription as refunded and reset user to free plan?')) {
                                handleAction(sub.id, 'refund');
                              }
                            }}
                            disabled={actionBusy[sub.id]}
                            title="Refund & Cancel VIP"
                          >
                            Refund
                          </button>
                        </>
                      )}
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

export default AdminVIP;
