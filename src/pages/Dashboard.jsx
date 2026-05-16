import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/authStore';

const statusMap = {
    0: { label: 'Draft', color: '#8f98a0', bg: '#2a3f5f' },
    1: { label: 'Under Review', color: '#f59e0b', bg: '#3d2e00' },
    2: { label: 'Approved', color: '#10b981', bg: '#003d2e' },
    3: { label: 'Rejected', color: '#ef4444', bg: '#3d0000' },
    4: { label: 'Archived', color: '#6b7280', bg: '#2a2a2a' },
};

function Sidebar({ active }) {
    const navigate = useNavigate();
    const { logout, user } = useAuthStore();

    const items = [
        { label: 'Dashboard', icon: '⊞', path: '/' },
        { label: 'Documents', icon: '📄', path: '/documents' },
        { label: 'Routing', icon: '↔', path: '/routing' },
        { label: 'Workflow', icon: '⚡', path: '/workflow' },
        { label: 'Departments', icon: '🏢', path: '/departments' },
        { label: 'Users', icon: '👥', path: '/users' },
        { label: 'Settings', icon: '⚙', path: '/settings' },
    ];

    return (
        <div style={{ width: 220, background: '#171a21', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'fixed', top: 0, left: 0, bottom: 0 }}>
            {/* Logo */}
            <div style={{ padding: '20px 16px', borderBottom: '1px solid #2a3f5f', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: '#4F46E5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>D</span>
                </div>
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>DocuTrack</span>
            </div>

            {/* Nav items */}
            <nav style={{ padding: '12px 8px', flex: 1 }}>
                {items.map(item => (
                    <div
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                            borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                            background: active === item.path ? '#2a3f5f' : 'transparent',
                            color: active === item.path ? '#66c0f4' : '#8f98a0',
                            fontSize: 14, fontWeight: active === item.path ? 600 : 400,
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { if (active !== item.path) e.currentTarget.style.background = '#1b2838' }}
                        onMouseLeave={e => { if (active !== item.path) e.currentTarget.style.background = 'transparent' }}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </div>
                ))}
            </nav>

            {/* User section */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #2a3f5f' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, background: '#4F46E5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{user?.fullName?.[0] || 'U'}</span>
                    </div>
                    <div>
                        <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{user?.fullName}</div>
                        <div style={{ color: '#8f98a0', fontSize: 11 }}>{user?.role}</div>
                    </div>
                </div>
                <button
                    onClick={() => { logout(); navigate('/login'); }}
                    style={{ width: '100%', padding: '8px', background: '#2a3f5f', color: '#66c0f4', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                >
                    Sign out
                </button>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        client.get('/Documents').then(res => {
            setDocs(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const stats = [
        { label: 'Total Documents', value: docs.length, color: '#66c0f4', icon: '📄' },
        { label: 'Under Review', value: docs.filter(d => d.status === 1).length, color: '#f59e0b', icon: '⏰' },
        { label: 'Approved', value: docs.filter(d => d.status === 2).length, color: '#10b981', icon: '✓' },
        { label: 'Rejected', value: docs.filter(d => d.status === 3).length, color: '#ef4444', icon: '✕' },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#1b2838', fontFamily: 'Arial, sans-serif' }}>
            <Sidebar active="/" />

            <main style={{ marginLeft: 220, flex: 1, padding: 28 }}>
                {/* Topbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', margin: 0 }}>Document Dashboard</h1>
                        <p style={{ color: '#8f98a0', fontSize: 13, margin: '4px 0 0' }}>Manage and track all your documents</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                            placeholder="Search documents..."
                            style={{ padding: '8px 14px', background: '#2a3f5f', border: '1px solid #3d5a7a', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', width: 220 }}
                        />
                        <button style={{ padding: '8px 16px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            + New Document
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                    {stats.map(stat => (
                        <div key={stat.label} style={{ background: '#171a21', border: '1px solid #2a3f5f', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ color: '#8f98a0', fontSize: 12, marginBottom: 6 }}>{stat.label}</div>
                                <div style={{ color: stat.color, fontSize: 28, fontWeight: 'bold', fontFamily: 'monospace' }}>{loading ? '—' : stat.value}</div>
                            </div>
                            <div style={{ fontSize: 28, opacity: 0.6 }}>{stat.icon}</div>
                        </div>
                    ))}
                </div>

                {/* Recent Documents */}
                <div style={{ background: '#171a21', border: '1px solid #2a3f5f', borderRadius: 12 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a3f5f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Recent Documents</span>
                    </div>
                    {loading ? (
                        <div style={{ padding: 32, textAlign: 'center', color: '#8f98a0' }}>Loading...</div>
                    ) : docs.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center', color: '#8f98a0' }}>No documents yet.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#1b2838' }}>
                                    {['ID', 'Title', 'Status', 'Owner', 'Created'].map(h => (
                                        <th key={h} style={{ padding: '12px 20px', textAlign: 'left', color: '#8f98a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {docs.slice(0, 10).map((doc, i) => {
                                    const status = statusMap[doc.status] || statusMap[0];
                                    return (
                                        <tr key={doc.id} style={{ borderBottom: '1px solid #2a3f5f', cursor: 'pointer' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#1b2838'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '14px 20px', color: '#8f98a0', fontSize: 12, fontFamily: 'monospace' }}>DOC-{String(i + 1).padStart(3, '0')}</td>
                                            <td style={{ padding: '14px 20px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{doc.title || '(No title)'}</td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{ background: status.bg, color: status.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{status.label}</span>
                                            </td>
                                            <td style={{ padding: '14px 20px', color: '#8f98a0', fontSize: 13 }}>{doc.owner?.fullName || '—'}</td>
                                            <td style={{ padding: '14px 20px', color: '#8f98a0', fontSize: 13 }}>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}