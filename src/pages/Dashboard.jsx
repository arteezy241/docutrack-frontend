import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { AppLayout } from '../components/Sidebar';
import useAuthStore from '../store/authStore';
import useWindowWidth from '../hooks/useWindowWidth';

const CSS = `
/* ── Liquid-glass shared base — login-card level transparency ── */
.lg-base {
  position: relative;
  isolation: isolate;
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 8px 40px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.08) inset;
}

.stat-card {
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  animation: fadeUp 0.4s var(--ease-spring) both;
  transition: transform var(--duration-base) var(--ease-out), box-shadow var(--duration-base), border-color var(--duration-base);
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 16px 48px rgba(0,0,0,0.55),
    0 1px 0 rgba(255,255,255,0.28) inset,
    0 -1px 0 rgba(0,0,0,0.18) inset;
  border-color: rgba(255,255,255,0.28);
}
.stat-card > * { position: relative; z-index: 1; }
.stat-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
}
.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.15);
  box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.18) inset;
}
.panel {
  border-radius: 16px;
  overflow: hidden;
}
.panel > * { position: relative; z-index: 1; }
.panel-head {
  padding: 11px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.09);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: rgba(255,255,255,0.04);
}
.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--bg-elevated);
  color: var(--text-tertiary);
}
.badge-warning { background: var(--warning-bg); color: var(--warning); }
.db-link-btn {
  background: none;
  border: none;
  color: var(--accent-to);
  font-size: 12px;
  font-weight: 500;
  font-family: 'Inter', system-ui, sans-serif;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 140ms;
  white-space: nowrap;
}
.db-link-btn:hover { background: rgba(71,191,255,0.08); }
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 6px;
  text-align: center;
}
.empty-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}
.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.empty-sub {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}
.pending-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  transition: background 120ms;
}
.pending-row:last-child { border-bottom: none; }
.pending-row:hover { background: rgba(255,255,255,0.05); }
.pending-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 3px;
}
.pending-meta {
  font-size: 11.5px;
  color: var(--text-secondary);
}
.action-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif;
  transition: opacity 140ms, transform 140ms;
  white-space: nowrap;
  line-height: 1.2;
}
.action-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
.action-btn:hover:not(:disabled) { opacity: 0.82; transform: translateY(-1px); }
.action-btn.approve { background: var(--success-bg); color: var(--success); }
.action-btn.reject  { background: var(--danger-bg);  color: var(--danger); }
.doc-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.doc-table col.col-title   { width: 40%; }
.doc-table col.col-status  { width: 20%; }
.doc-table col.col-owner   { width: 22%; }
.doc-table col.col-updated { width: 18%; }
.doc-table thead th {
  padding: 8px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  white-space: nowrap;
  overflow: hidden;
}
.doc-row { cursor: pointer; transition: background 120ms; }
.doc-row:hover { background: rgba(255,255,255,0.05); }
.doc-row td {
  padding: 9px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  font-size: 13.5px;
  vertical-align: middle;
  overflow: hidden;
}
.doc-row:last-child td { border-bottom: none; }
.doc-title-cell {
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.doc-dim-cell {
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.status-pill {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}
.db-btn-primary {
  padding: 9px 18px;
  background: var(--accent-gradient);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif;
  box-shadow: var(--shadow-accent);
  transition: opacity 200ms, transform 200ms;
  margin-top: 8px;
}
.db-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.sk {
  border-radius: 5px;
  background: linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-card-hover) 50%, var(--bg-elevated) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
`;

const STATUS = {
  0: { label: 'Draft',     color: 'var(--info)',          bg: 'var(--info-bg)' },
  1: { label: 'In Review', color: 'var(--warning)',       bg: 'var(--warning-bg)' },
  2: { label: 'Approved',  color: 'var(--success)',       bg: 'var(--success-bg)' },
  3: { label: 'Rejected',  color: 'var(--danger)',        bg: 'var(--danger-bg)' },
  4: { label: 'Archived',  color: 'var(--text-tertiary)', bg: 'var(--border-subtle)' },
};

function Sk({ h = 14, w, r = 5, style }) {
  return <div className="sk" style={{ height: h, width: w, borderRadius: r, flexShrink: w ? 0 : undefined, ...style }} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const width = useWindowWidth();
  const isMobile = width < 768;
  const queryClient = useQueryClient();

  const {
    data: docs = [],
    isLoading: docsLoading,
    isError: docsError,
  } = useQuery({
    queryKey: ['docs'],
    queryFn: () => client.get('/documents').then(r => r.data),
  });

  const {
    data: pending = [],
    isLoading: pendingLoading,
    isError: pendingError,
  } = useQuery({
    queryKey: ['routing-pending'],
    queryFn: () => client.get('/routing/pending').then(r => r.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['routing-pending'] });
    queryClient.invalidateQueries({ queryKey: ['docs'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id) => client.post('/routing/approve', { routingEventId: id }),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => client.post('/routing/reject', { routingEventId: id }),
    onSuccess: invalidate,
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const overdueDocs = docs.filter(d =>
    d.dueDate && new Date(d.dueDate) < now && d.status !== 2 && d.status !== 4
  );
  const approvedThisMonth = docs.filter(d => {
    if (d.status !== 2) return false;
    return new Date(d.updatedAt || d.createdAt) >= startOfMonth;
  });
  const recentDocs = [...docs]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 10);

  const h = now.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.fullName?.split(' ')[0] || user?.username || 'there';

  const stats = [
    { label: 'Total Documents',    value: docs.length,              color: 'var(--info)',    bg: 'var(--info-bg)',    glow: '96,165,250',   icon: <DocIcon />,   to: '/documents' },
    { label: 'Pending Approvals',  value: pending.length,           color: 'var(--warning)', bg: 'var(--warning-bg)', glow: '251,191,36',   icon: <ClockIcon />, to: '/routing' },
    { label: 'Overdue',            value: overdueDocs.length,       color: 'var(--danger)',  bg: 'var(--danger-bg)',  glow: '248,113,113',  icon: <AlertIcon />, to: '/documents' },
    { label: 'Approved This Month',value: approvedThisMonth.length, color: 'var(--success)', bg: 'var(--success-bg)', glow: '52,211,153',   icon: <CheckIcon />, to: '/documents' },
  ];

  const loading = docsLoading || pendingLoading;

  return (
    <AppLayout>
      <style>{CSS}</style>

      <div style={{ padding: isMobile ? '16px 12px' : '20px 20px', fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ marginBottom: 20, animation: 'fadeUp 0.4s var(--ease-spring) both' }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {greeting}, {displayName}
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            Here's what's happening today.
          </p>
        </div>

        {/* Error banner */}
        {(docsError || pendingError) && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.22)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Could not load some data. Please refresh the page.
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
          {stats.map((s, i) => (
            <div key={s.label} className="stat-card lg-base"
              style={{
                animationDelay: `${i * 0.05}s`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 20px 2px rgba(${s.glow},0.22), 0 1px 0 rgba(255,255,255,0.22) inset, 0 -1px 0 rgba(0,0,0,0.18) inset`,
                borderColor: `rgba(${s.glow},0.30)`,
              }}
              onClick={() => navigate(s.to)}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,0,0,0.55), 0 0 40px 8px rgba(${s.glow},0.60), 0 0 80px 16px rgba(${s.glow},0.28), 0 1px 0 rgba(255,255,255,0.28) inset`;
                e.currentTarget.style.borderColor = `rgba(${s.glow},0.65)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.45), 0 0 20px 2px rgba(${s.glow},0.22), 0 1px 0 rgba(255,255,255,0.22) inset, 0 -1px 0 rgba(0,0,0,0.18) inset`;
                e.currentTarget.style.borderColor = `rgba(${s.glow},0.30)`;
              }}
            >
              {loading ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Sk h={11} w="70%" />
                  <Sk h={28} w="45%" r={6} />
                </div>
              ) : (
                <>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  </div>
                  <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Body grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 3fr', gap: 12, alignItems: 'start' }}>

          {/* Pending Approvals */}
          <div className="panel lg-base" style={{ animation: 'fadeUp 0.4s var(--ease-spring) 0.15s both' }}>
            <div className="panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="panel-title">Pending Approvals</span>
                {!pendingLoading && pending.length > 0 && (
                  <span className="badge badge-warning">{pending.length}</span>
                )}
              </div>
              <button className="db-link-btn" onClick={() => navigate('/routing')}>View all</button>
            </div>

            {pendingLoading ? (
              <div style={{ padding: '9px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <Sk h={13} style={{ marginBottom: 6 }} />
                      <Sk h={11} w="55%" />
                    </div>
                    <Sk h={28} w={62} r={20} />
                    <Sk h={28} w={54} r={20} />
                  </div>
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" style={{ color: 'var(--success)', background: 'var(--success-bg)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="empty-title">No pending approvals</p>
                <p className="empty-sub">You're all caught up!</p>
              </div>
            ) : (
              pending.slice(0, 6).map(ev => {
                const approving = approveMutation.isPending && approveMutation.variables === ev.id;
                const rejecting  = rejectMutation.isPending  && rejectMutation.variables  === ev.id;
                const busy = approving || rejecting;
                return (
                  <div key={ev.id} className="pending-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pending-title">{ev.docTitle || ev.documentTitle || 'Untitled'}</div>
                      <div className="pending-meta">
                        From {ev.fromUserName || ev.fromUser?.fullName || 'Unknown'}
                        {ev.timestamp && <> · {new Date(ev.timestamp).toLocaleDateString()}</>}
                      </div>
                    </div>
                    <button
                      className="action-btn approve"
                      disabled={busy}
                      onClick={() => approveMutation.mutate(ev.id)}
                    >
                      {approving ? '…' : 'Approve'}
                    </button>
                    <button
                      className="action-btn reject"
                      disabled={busy}
                      onClick={() => rejectMutation.mutate(ev.id)}
                    >
                      {rejecting ? '…' : 'Reject'}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Recent Documents */}
          <div className="panel lg-base" style={{ animation: 'fadeUp 0.4s var(--ease-spring) 0.2s both' }}>
            <div className="panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="panel-title">Recent Documents</span>
                {!docsLoading && <span className="badge">{docs.length}</span>}
              </div>
              <button className="db-link-btn" onClick={() => navigate('/documents')}>View all</button>
            </div>

            {docsLoading ? (
              <div>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Sk h={13} style={{ flex: 2 }} />
                    <Sk h={22} w={76} r={20} />
                    <Sk h={13} w={88} />
                    <Sk h={13} w={72} />
                  </div>
                ))}
              </div>
            ) : docs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="empty-title">No documents yet</p>
                <button className="db-btn-primary" onClick={() => navigate('/documents')}>Create your first document</button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="doc-table">
                  <colgroup>
                    <col className="col-title" />
                    <col className="col-status" />
                    <col className="col-owner" />
                    <col className="col-updated" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Owner</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDocs.map(doc => {
                      const s = STATUS[doc.status] ?? STATUS[0];
                      return (
                        <tr key={doc.id} className="doc-row" onClick={() => navigate('/documents')}>
                          <td className="doc-title-cell">{doc.title || '(No title)'}</td>
                          <td>
                            <span className="status-pill" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                          </td>
                          <td className="doc-dim-cell">{doc.owner?.fullName || doc.ownerName || '—'}</td>
                          <td className="doc-dim-cell">
                            {(doc.updatedAt || doc.createdAt)
                              ? new Date(doc.updatedAt || doc.createdAt).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}

function DocIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
function ClockIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function AlertIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function CheckIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
