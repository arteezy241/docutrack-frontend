import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { AppLayout } from '../components/Sidebar';
import useWindowWidth from '../hooks/useWindowWidth';

const statusMap = {
    0: { label: 'Draft', color: '#8f98a0', bg: '#2a3f5f' },
    1: { label: 'In Review', color: '#f59e0b', bg: '#3d2e00' },
    2: { label: 'Approved', color: '#4ade80', bg: '#003d2e' },
    3: { label: 'Rejected', color: '#c94040', bg: '#3d0000' },
    4: { label: 'Archived', color: '#6b7280', bg: '#2a2a2a' },
};

export default function Dashboard() {
    const navigate = useNavigate();
    const width = useWindowWidth();
    const isMobile = width < 768;
    const isTablet = width < 1024;

    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        client.get('/documents').then(res => {
            setDocs(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const stats = [
        { label: 'Total Documents', value: docs.length, color: '#47bfff', icon: '📄' },
        { label: 'Under Review', value: docs.filter(d => d.status === 1).length, color: '#f59e0b', icon: '⏰' },
        { label: 'Approved', value: docs.filter(d => d.status === 2).length, color: '#4ade80', icon: '✓' },
        { label: 'Rejected', value: docs.filter(d => d.status === 3).length, color: '#c94040', icon: '✕' },
    ];

    return (
        <AppLayout>
            <div style={s.page}>

                {/* Topbar */}
                <div style={{
                    ...s.topbar,
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "flex-start" : "center",
                    gap: isMobile ? 12 : 0,
                }}>
                    <div>
                        <h1 style={s.pageTitle}>Document Dashboard</h1>
                        <p style={s.pageSub}>Manage and track all your documents</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, width: isMobile ? "100%" : "auto" }}>
                        <input
                            placeholder="Search documents..."
                            style={{ ...s.searchInput, width: isMobile ? "100%" : 220 }}
                        />
                        <button onClick={() => navigate('/documents')} style={{ ...s.primaryBtn, whiteSpace: "nowrap" }}>
                            + New Document
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div style={{
                    ...s.statsGrid,
                    gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2,1fr)" : "repeat(4,1fr)",
                }}>
                    {stats.map(stat => (
                        <div key={stat.label} style={s.statCard}>
                            <div>
                                <div style={s.statLabel}>{stat.label}</div>
                                <div style={{ ...s.statValue, color: stat.color }}>
                                    {loading ? '—' : stat.value}
                                </div>
                            </div>
                            <div style={s.statIcon}>{stat.icon}</div>
                        </div>
                    ))}
                </div>

                {/* Recent Documents */}
                <div style={s.tableCard}>
                    <div style={s.tableHeader}>
                        <span style={s.tableTitle}>Recent Documents</span>
                        <button onClick={() => navigate('/documents')} style={s.viewAllBtn}>View all</button>
                    </div>

                    {loading ? (
                        <div style={s.centered}><Spinner /></div>
                    ) : docs.length === 0 ? (
                        <div style={s.centered}>
                            <p style={{ color: '#8f98a0', margin: '0 0 12px' }}>No documents yet.</p>
                            <button onClick={() => navigate('/documents')} style={s.primaryBtn}>
                                Create your first document
                            </button>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={s.table}>
                                <thead>
                                    <tr>
                                        {['ID', 'Title', 'Status', 'Owner', 'Created'].map(h => (
                                            <th key={h} style={s.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {docs.slice(0, 10).map((doc, i) => {
                                        const status = statusMap[doc.status] || statusMap[0];
                                        return (
                                            <tr
                                                key={doc.id}
                                                style={s.tr}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <td style={{ ...s.td, color: '#8f98a0', fontSize: 12, fontFamily: 'monospace' }}>
                                                    DOC-{String(i + 1).padStart(3, '0')}
                                                </td>
                                                <td style={{ ...s.td, fontWeight: 600 }}>{doc.title || '(No title)'}</td>
                                                <td style={s.td}>
                                                    <span style={{ background: status.bg, color: status.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td style={{ ...s.td, color: '#8f98a0' }}>{doc.owner?.fullName || '—'}</td>
                                                <td style={{ ...s.td, color: '#8f98a0' }}>
                                                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '—'}
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
        </AppLayout>
    );
}

function Spinner() {
    return (
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(71,191,255,0.2)', borderTopColor: '#47bfff', animation: 'dtSpin 0.8s linear infinite' }} />
    );
}

const s = {
    page: { padding: '24px 20px', color: '#c6d4df', fontFamily: "'Segoe UI', sans-serif" },
    topbar: { display: 'flex', justifyContent: 'space-between', marginBottom: 24 },
    pageTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: '#c6d4df' },
    pageSub: { margin: '4px 0 0', fontSize: 12, color: '#8f98a0' },
    searchInput: { padding: '8px 14px', background: '#171a21', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#c6d4df', fontSize: 13, outline: 'none' },
    primaryBtn: { padding: '9px 18px', background: 'linear-gradient(to bottom,#47bfff 5%,#1a44c2 95%)', border: 'none', borderRadius: 3, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    statsGrid: { display: 'grid', gap: 16, marginBottom: 24 },
    statCard: { background: '#171a21', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    statLabel: { color: '#8f98a0', fontSize: 12, marginBottom: 6 },
    statValue: { fontSize: 28, fontWeight: 700, fontFamily: 'monospace' },
    statIcon: { fontSize: 28, opacity: 0.5 },
    tableCard: { background: '#171a21', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden' },
    tableHeader: { padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    tableTitle: { color: '#c6d4df', fontWeight: 600, fontSize: 15 },
    viewAllBtn: { background: 'none', border: 'none', color: '#4a7fa5', fontSize: 12, cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '12px 20px', textAlign: 'left', color: '#4a7fa5', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' },
    tr: { borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s', cursor: 'pointer' },
    td: { padding: '14px 20px', fontSize: 13, color: '#c6d4df', verticalAlign: 'middle', whiteSpace: 'nowrap' },
    centered: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48 },
};