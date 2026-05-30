import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";
import useAuthStore from "../store/authStore";

const fetchLogs = ({ page, action, userId }) => {
    const params = new URLSearchParams({ page, pageSize: 50 });
    if (action)  params.append('action', action);
    if (userId)  params.append('userId', userId);
    return client.get("/audit/system?" + params.toString()).then((r) => r.data);
};

const fetchUsers = () => client.get("/Users").then((r) => r.data);

const ACTION_COLORS = {
    LOGIN_SUCCESS:     { bg: 'var(--success-bg)', color: 'var(--success)' },
    LOGIN_FAILED:      { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
    DEVICE_VERIFIED:   { bg: 'rgba(71,191,255,0.1)', color: '#47bfff' },
    DEVICE_REMOVED:    { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
    '2FA_TOGGLED':     { bg: 'rgba(129,140,248,0.1)', color: '#818cf8' },
    PASSWORD_RESET:    { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    PASSWORD_CHANGED:  { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    DOCUMENT_CREATED:  { bg: 'rgba(71,191,255,0.1)', color: '#47bfff' },
    DOCUMENT_DELETED:  { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
    FILE_UPLOADED:     { bg: 'var(--success-bg)', color: 'var(--success)' },
    FILE_DELETED:      { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
    STATUS_UPDATED:    { bg: 'rgba(129,140,248,0.1)', color: '#818cf8' },
    DOCUMENT_ROUTED:   { bg: 'rgba(71,191,255,0.1)', color: '#47bfff' },
    DOCUMENT_APPROVED: { bg: 'var(--success-bg)', color: 'var(--success)' },
    DOCUMENT_REJECTED: { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
    DUE_DATE_SET:      { bg: 'var(--warning-bg)', color: 'var(--warning)' },
};

const ALL_ACTIONS = [
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'DEVICE_VERIFIED', 'DEVICE_REMOVED',
    '2FA_TOGGLED', 'PASSWORD_RESET', 'PASSWORD_CHANGED',
    'DOCUMENT_CREATED', 'DOCUMENT_DELETED', 'FILE_UPLOADED', 'FILE_DELETED',
    'STATUS_UPDATED', 'DOCUMENT_ROUTED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED',
    'DUE_DATE_SET',
];

export default function AuditLog() {
    const { user } = useAuthStore();
    const width = useWindowWidth();
    const isMobile = width < 768;
    const isAdmin = user?.role === 'Admin';

    const [page, setPage] = useState(1);
    const [filterAction, setFilterAction] = useState('');
    const [filterUser, setFilterUser] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['audit', page, filterAction, filterUser],
        queryFn: () => fetchLogs({ page, action: filterAction, userId: filterUser }),
        enabled: isAdmin,
    });

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: fetchUsers,
        enabled: isAdmin,
    });

    const logs = data?.logs || [];
    const total = data?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / 50));

    if (!isAdmin) {
        return (
            <AppLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
                    <div style={{ opacity: 0.3 }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    </div>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 14, margin: 0 }}>Admin access required</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <style>{`
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                .al-select {
                    height: 36px; padding: 0 12px;
                    background: var(--bg-card); border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; outline: none; font-family: 'Inter', sans-serif;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
                    box-sizing: border-box; cursor: pointer;
                }
                .al-select:focus { border-color: var(--accent-from); box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
                .al-row { transition: background var(--duration-fast); }
                .al-row:hover { background: var(--bg-card-hover) !important; }
                .al-row:last-child td { border-bottom: none !important; }
                .page-btn {
                    padding: 7px 16px; background: var(--bg-card);
                    border: 1px solid var(--border-subtle); border-radius: 8px;
                    color: var(--text-secondary); font-size: 12px; cursor: pointer;
                    font-family: 'Inter', sans-serif; transition: all var(--duration-fast);
                }
                .page-btn:hover:not(:disabled) { background: var(--bg-card-hover); color: var(--text-primary); }
                .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 24, animation: 'fadeUp 0.3s ease both' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Audit Log</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>{total} total events · Admin only</p>
                    </div>
                </div>

                {/* Filters — constrained width */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', animation: 'fadeUp 0.35s ease both' }}>
                    <select className="al-select" style={{ width: isMobile ? '100%' : 175 }} value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}>
                        <option value="">All Actions</option>
                        {ALL_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select className="al-select" style={{ width: isMobile ? '100%' : 175 }} value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}>
                        <option value="">All Users</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
                    </select>
                    {(filterAction || filterUser) && (
                        <button className="page-btn" onClick={() => { setFilterAction(''); setFilterUser(''); setPage(1); }}>
                            Clear
                        </button>
                    )}
                </div>

                {/* Table card */}
                <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', animation: 'fadeUp 0.4s ease both', boxShadow: '0 8px 40px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.08) inset' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                    ) : logs.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 8 }}>
                            <div style={{ opacity: 0.3 }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            </div>
                            <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 13 }}>No audit logs found</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {['Timestamp', 'User', 'Action', 'Resource', 'IP Address'].map(h => (
                                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, i) => {
                                        const ac = ACTION_COLORS[log.action] || { bg: 'rgba(143,152,160,0.1)', color: '#8f98a0' };
                                        const altBg = i % 2 === 1 ? 'var(--bg-card)' : 'transparent';
                                        return (
                                            <tr key={log.id} className="al-row" style={{ background: altBg }}>
                                                <td style={{ padding: '13px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-subtle)' }}>
                                                    <span style={{ fontFamily: "'ui-monospace', 'SFMono-Regular', Menlo, monospace", fontSize: 12, color: 'var(--text-secondary)' }}>
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid var(--border-subtle)' }}>
                                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{log.userEmail || '—'}</span>
                                                </td>
                                                <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid var(--border-subtle)' }}>
                                                    <span style={{ background: ac.bg, color: ac.color, padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid var(--border-subtle)' }}>
                                                    {log.resourceType ? (
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>{log.resourceType}</span>
                                                    ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>}
                                                </td>
                                                <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid var(--border-subtle)' }}>
                                                    <span style={{ fontFamily: "'ui-monospace', 'SFMono-Regular', Menlo, monospace", fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                                        {log.ipAddress || '—'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 18 }}>
                        <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 500 }}>Page {page} of {totalPages}</span>
                        <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function Spinner() {
    return <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(71,191,255,0.15)', borderTopColor: '#47bfff', animation: 'dtSpin 0.8s linear infinite' }} />;
}
