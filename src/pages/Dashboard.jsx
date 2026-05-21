import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { AppLayout } from '../components/Sidebar';
import useAuthStore from '../store/authStore';
import useWindowWidth from '../hooks/useWindowWidth';

const statusMap = {
    0: { label: 'Draft', color: '#8f98a0', bg: 'rgba(143,152,160,0.12)' },
    1: { label: 'In Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    2: { label: 'Approved', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    3: { label: 'Rejected', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
    4: { label: 'Archived', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
};

const statConfig = [
    { label: 'Total Documents', key: 'total', color: '#47bfff', glow: 'rgba(71,191,255,0.15)', icon: <DocIcon />, filter: 'All' },
    { label: 'Under Review', key: 'review', color: '#f59e0b', glow: 'rgba(245,158,11,0.15)', icon: <ClockIcon />, filter: 'InReview' },
    { label: 'Approved', key: 'approved', color: '#4ade80', glow: 'rgba(74,222,128,0.15)', icon: <CheckIcon />, filter: 'Approved' },
    { label: 'Rejected', key: 'rejected', color: '#f87171', glow: 'rgba(248,113,113,0.15)', icon: <XIcon />, filter: 'Rejected' },
];

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const width = useWindowWidth();
    const isMobile = width < 768;
    const isTablet = width < 1024;

    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        client.get('/documents').then(res => {
            setDocs(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const statValues = {
        total: docs.length,
        review: docs.filter(d => d.status === 1).length,
        approved: docs.filter(d => d.status === 2).length,
        rejected: docs.filter(d => d.status === 3).length,
    };

    const filtered = docs.filter(d =>
        !search || d.title?.toLowerCase().includes(search.toLowerCase())
    );

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const displayName = user?.fullName?.split(' ')[0] || user?.username || 'there';

    return (
        <AppLayout>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .stat-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                    animation: fadeUp 0.4s ease both;
                    cursor: default;
                }
                .stat-card:hover {
                    transform: translateY(-2px);
                    border-color: var(--border-input);
                }
                .db-search {
                    padding: 9px 14px 9px 36px;
                    background: var(--bg-input);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    color: var(--text-secondary);
                    font-size: 13px;
                    outline: none;
                    font-family: 'Inter', sans-serif;
                    transition: border-color 0.2s, background 0.2s;
                    width: 100%;
                }
                .db-search:focus {
                    border-color: rgba(71,191,255,0.4);
                    background: var(--bg-hover);
                }
                .db-search::placeholder { color: var(--text-accent); }
                .db-primary-btn {
                    padding: 9px 18px;
                    background: linear-gradient(135deg, #47bfff, #4F46E5);
                    border: none; border-radius: 10px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity 0.2s, transform 0.2s;
                    white-space: nowrap;
                    box-shadow: 0 4px 12px rgba(79,70,229,0.3);
                }
                .db-primary-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .db-primary-btn:active { transform: translateY(0); }
                .view-all-btn {
                    background: none; border: none;
                    color: #47bfff; font-size: 12px; cursor: pointer;
                    font-family: 'Inter', sans-serif; font-weight: 500;
                    padding: 4px 8px; border-radius: 6px;
                    transition: background 0.2s;
                }
                .view-all-btn:hover { background: rgba(71,191,255,0.1); }
                .doc-row {
                    border-bottom: 1px solid var(--border);
                    transition: background 0.15s;
                    cursor: pointer;
                }
                .doc-row:hover { background: var(--bg-hover); }
                .doc-row:last-child { border-bottom: none; }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif", maxWidth: 1200 }}>

                {/* Header */}
                <div style={{ marginBottom: 28, animation: 'fadeUp 0.3s ease both' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text-accent)', fontWeight: 500 }}>
                        {greeting()}, {displayName} 👋
                    </p>
                    <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        Document Dashboard
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                        Manage and track all your documents
                    </p>
                </div>

                {/* Topbar actions */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 24, animation: 'fadeUp 0.35s ease both' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : 320 }}>
                        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-accent)' }}>
                            <SearchIcon />
                        </span>
                        <input
                            className="db-search"
                            placeholder="Search documents..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="db-primary-btn" onClick={() => navigate('/documents')}>
                        + New Document
                    </button>
                </div>

                {/* Stats grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
                    gap: 14,
                    marginBottom: 28,
                }}>
                    {statConfig.map(({ label, key, color, glow, icon, filter }, i) => (
                        <div
                            key={key}
                            className="stat-card"
                            style={{ animationDelay: `${i * 0.07}s`, boxShadow: `0 4px 20px ${glow}`, cursor: 'pointer' }}
                            onClick={() => navigate('/documents', { state: { filter } })}
                        >
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8, textTransform: 'uppercase' }}>
                                    {label}
                                </div>
                                <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                                    {loading ? '—' : statValues[key]}
                                </div>
                            </div>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: glow, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                                {icon}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table card */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', animation: 'fadeUp 0.5s ease both', animationDelay: '0.2s' }}>
                    <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>Recent Documents</span>
                            {!loading && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-accent)', background: 'rgba(74,127,165,0.12)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{filtered.length}</span>}
                        </div>
                        <button className="view-all-btn" onClick={() => navigate('/documents')}>View all →</button>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                            <Spinner />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
                            <div style={{ fontSize: 32, opacity: 0.3 }}>📄</div>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>
                                {search ? 'No documents match your search.' : 'No documents yet.'}
                            </p>
                            {!search && (
                                <button className="db-primary-btn" onClick={() => navigate('/documents')}>
                                    Create your first document
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--table-head)' }}>
                                        {['ID', 'Title', 'Status', 'Owner', 'Created'].map(h => (
                                            <th key={h} style={{ padding: '11px 20px', textAlign: 'left', color: 'var(--text-accent)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.slice(0, 10).map((doc, i) => {
                                        const status = statusMap[doc.status] || statusMap[0];
                                        return (
                                            <tr key={doc.id} className="doc-row" onClick={() => navigate('/documents')}>
                                                <td style={{ padding: '13px 20px', color: 'var(--text-accent)', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                                    DOC-{String(i + 1).padStart(3, '0')}
                                                </td>
                                                <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {doc.title || '(No title)'}
                                                </td>
                                                <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                                                    <span style={{ background: status.bg, color: status.color, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {doc.owner?.fullName || '—'}
                                                </td>
                                                <td style={{ padding: '13px 20px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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
    return <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(71,191,255,0.15)', borderTopColor: '#47bfff', animation: 'dtSpin 0.8s linear infinite' }} />;
}

function DocIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>; }
function ClockIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>; }
function CheckIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>; }
function XIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>; }