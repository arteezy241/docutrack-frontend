import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";
import useAuthStore from "../store/authStore";

const fetchLogs = ({ page, action, userId }) => {
    const params = new URLSearchParams({ page, pageSize: 50 });
    if (action) params.append('action', action);
    if (userId) params.append('userId', userId);
    return client.get("/audit/system?" + params.toString()).then((r) => r.data);
};

const fetchUsers = () => client.get("/Users").then((r) => r.data);

const ACTION_COLORS = {
    LOGIN_SUCCESS: { bg: 'rgba(74,222,128,0.1)', color: '#4ade80' },
    LOGIN_FAILED: { bg: 'rgba(248,113,113,0.1)', color: '#f87171' },
    DEVICE_VERIFIED: { bg: 'rgba(71,191,255,0.1)', color: '#47bfff' },
    DEVICE_REMOVED: { bg: 'rgba(248,113,113,0.1)', color: '#f87171' },
    '2FA_TOGGLED': { bg: 'rgba(129,140,248,0.1)', color: '#818cf8' },
    PASSWORD_RESET: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
    PASSWORD_CHANGED: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
    DOCUMENT_CREATED: { bg: 'rgba(71,191,255,0.1)', color: '#47bfff' },
    DOCUMENT_DELETED: { bg: 'rgba(248,113,113,0.1)', color: '#f87171' },
    FILE_UPLOADED: { bg: 'rgba(74,222,128,0.1)', color: '#4ade80' },
    FILE_DELETED: { bg: 'rgba(248,113,113,0.1)', color: '#f87171' },
    STATUS_UPDATED: { bg: 'rgba(129,140,248,0.1)', color: '#818cf8' },
    DOCUMENT_ROUTED: { bg: 'rgba(71,191,255,0.1)', color: '#47bfff' },
    DOCUMENT_APPROVED: { bg: 'rgba(74,222,128,0.1)', color: '#4ade80' },
    DOCUMENT_REJECTED: { bg: 'rgba(248,113,113,0.1)', color: '#f87171' },
    DUE_DATE_SET: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
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
                    <div style={{ fontSize: 40, opacity: 0.3 }}>🔒</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Admin access required</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                .al-search {
                    padding: 9px 12px;
                    background: var(--bg-input); border: 1px solid var(--border);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; outline: none; font-family: 'Inter', sans-serif;
                    transition: border-color 0.2s; box-sizing: border-box;
                }
                .al-search:focus { border-color: rgba(71,191,255,0.4); }
                .al-row { border-bottom: 1px solid var(--border); transition: background 0.15s; }
                .al-row:hover { background: var(--bg-hover); }
                .al-row:last-child { border-bottom: none; }
                .page-btn {
                    padding: 7px 16px; background: var(--bg-input);
                    border: 1px solid var(--border); border-radius: 8px;
                    color: var(--text-muted); font-size: 12px; cursor: pointer;
                    font-family: 'Inter', sans-serif; transition: all 0.2s;
                }
                .page-btn:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-secondary); }
                .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 24, animation: 'fadeUp 0.3s ease both' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Audit Log</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{total} total events · Admin only</p>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, marginBottom: 20, animation: 'fadeUp 0.35s ease both' }}>
                    <select className="al-search" style={{ flex: 1 }} value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}>
                        <option value="">All Actions</option>
                        {ALL_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select className="al-search" style={{ flex: 1 }} value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}>
                        <option value="">All Users</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
                    </select>
                    {(filterAction || filterUser) && (
                        <button className="page-btn" onClick={() => { setFilterAction(''); setFilterUser(''); setPage(1); }}>
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Table */}
                <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', animation: 'fadeUp 0.4s ease both' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                    ) : logs.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 8 }}>
                            <div style={{ fontSize: 28, opacity: 0.3 }}>📋</div>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>No audit logs found</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--table-head)' }}>
                                        {['Action', 'User', 'Resource', 'Details', 'IP Address', 'Timestamp'].map(h => (
                                            <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => {
                                        const ac = ACTION_COLORS[log.action] || { bg: 'rgba(143,152,160,0.1)', color: '#8f98a0' };
                                        return (
                                            <tr key={log.id} className="al-row">
                                                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                    <span style={{ background: ac.bg, color: ac.color, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{log.userEmail || '—'}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {log.resourceType && <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{log.resourceType}</span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12, maxWidth: 200 }}>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                                        {log.details || '—'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                    {log.ipAddress || '—'}
                                                </td>
                                                <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                    {new Date(log.timestamp).toLocaleString()}
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
                        <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>Page {page} of {totalPages}</span>
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