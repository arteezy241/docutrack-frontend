import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useWindowWidth from "../hooks/useWindowWidth";

const NAV = [
    {
        label: "MAIN",
        items: [
            { to: "/", icon: <GridIcon />, label: "Dashboard" },
            { to: "/documents", icon: <DocIcon />, label: "Documents" },
            { to: "/routing", icon: <RouteIcon />, label: "Routing" },
            { to: "/workflow", icon: <WorkflowIcon />, label: "Workflow" },
        ],
    },
    {
        label: "ADMIN",
        items: [
            { to: "/departments", icon: <DeptIcon />, label: "Departments" },
            { to: "/users", icon: <UsersIcon />, label: "Users" },
        ],
    },
    {
        label: "ACCOUNT",
        items: [
            { to: "/settings", icon: <SettingsIcon />, label: "Settings" },
        ],
    },
];

function ProfileDropdown({ user, onLogout, onClose, style }) {
    const navigate = useNavigate();
    const initial = (user?.firstName?.[0] || user?.fullName?.[0] || user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();
    const roleColor = { Admin: '#f59e0b', Staff: '#47bfff', Viewer: '#8f98a0' }[user?.role] || '#8f98a0';
    const roleBg = { Admin: 'rgba(245,158,11,0.1)', Staff: 'rgba(71,191,255,0.1)', Viewer: 'rgba(255,255,255,0.06)' }[user?.role] || 'rgba(255,255,255,0.06)';

    const go = (path) => { navigate(path); onClose(); };

    return (
        <div style={{
            position: 'absolute',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
            minWidth: 220,
            zIndex: 300,
            overflow: 'hidden',
            animation: 'fadeUp 0.18s ease',
            fontFamily: "'Inter', sans-serif",
            ...style,
        }}>
            {/* Profile header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#47bfff,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
                    {initial}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.fullName || user?.name || 'User'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.email || ''}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: roleBg, color: roleColor, marginTop: 3, display: 'inline-block' }}>
                        {user?.role || 'Staff'}
                    </span>
                </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: '6px 6px' }}>
                {[
                    { icon: <SettingsIcon />, label: 'Settings', path: '/settings' },
                    { icon: <SecurityIcon />, label: 'Security', path: '/settings', state: { tab: 'Security' } },
                ].map(({ icon, label, path }) => (
                    <button key={label} onClick={() => go(path)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', background: 'none', border: 'none', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif", textAlign: 'left', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <span style={{ color: 'var(--text-accent)', width: 16, display: 'flex' }}>{icon}</span>
                        {label}
                    </button>
                ))}
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '0 10px' }} />

            {/* Sign out */}
            <div style={{ padding: '6px 6px' }}>
                <button onClick={() => { onLogout(); onClose(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', background: 'none', border: 'none', borderRadius: 8, color: '#f87171', fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif", textAlign: 'left', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <span style={{ width: 16, display: 'flex' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </span>
                    Sign out
                </button>
            </div>
        </div>
    );
}

function SidebarContent({ isMobile, onClose, user, onLogout }) {
    const initial = (user?.firstName?.[0] || user?.fullName?.[0] || user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                .nav-item {
                    display: flex; align-items: center; gap: 10px;
                    padding: 9px 12px; border-radius: 10px;
                    color: var(--text-muted); font-size: 13px; font-weight: 500;
                    text-decoration: none; transition: all 0.2s ease;
                    margin-bottom: 2px; position: relative;
                    font-family: 'Inter', sans-serif;
                }
                .nav-item:hover { background: var(--bg-hover); color: var(--text-secondary); }
                .nav-item.active {
                    background: linear-gradient(135deg, rgba(79,70,229,0.25), rgba(71,191,255,0.12));
                    color: var(--text-primary); box-shadow: 0 2px 12px rgba(79,70,229,0.2);
                }
                .nav-item.active::before {
                    content: ''; position: absolute; left: 0; top: 50%;
                    transform: translateY(-50%); width: 3px; height: 60%;
                    background: linear-gradient(to bottom, #47bfff, #4F46E5);
                    border-radius: 0 3px 3px 0;
                }
                .close-btn {
                    background: rgba(255,255,255,0.08); border: none;
                    color: var(--text-muted); font-size: 13px; cursor: pointer;
                    padding: 6px 10px; border-radius: 8px; transition: all 0.2s ease;
                }
                .close-btn:hover { background: rgba(255,255,255,0.12); color: var(--text-secondary); }
                .avatar-btn {
                    background: none; border: none; cursor: pointer; padding: 0;
                    border-radius: 50%; transition: transform 0.2s, box-shadow 0.2s;
                }
                .avatar-btn:hover { transform: scale(1.08); box-shadow: 0 0 0 3px rgba(71,191,255,0.3); border-radius: 50%; }
            `}</style>
            <aside style={s.sidebar}>
                {/* Brand */}
                <div style={s.brand}>
                    <div style={s.brandIcon}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#47bfff" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={s.brandName}>DocuTrack</div>
                        <div style={s.brandSub}>LPU-Cavite</div>
                    </div>
                    {isMobile && <button className="close-btn" onClick={onClose}>✕</button>}
                </div>

                <div style={s.divider} />

                {/* Nav */}
                <nav style={s.nav}>
                    {NAV.map((group) => (
                        <div key={group.label} style={s.group}>
                            <p style={s.groupLabel}>{group.label}</p>
                            {group.items.map(({ to, icon, label }) => (
                                <NavLink key={to} to={to} end={to === "/"} onClick={() => isMobile && onClose()}
                                    className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
                                    <span style={s.navIcon}>{icon}</span>
                                    {label}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Footer with avatar dropdown */}
                <div style={s.footer}>
                    <div style={s.divider} />
                    <div style={{ ...s.userRow, position: 'relative' }} ref={dropdownRef}>
                        <button className="avatar-btn" onClick={() => setShowDropdown(v => !v)}>
                            <div style={s.avatar}>{initial}</div>
                        </button>
                        <div style={s.userInfo}>
                            <div style={s.userName}>{user?.fullName || user?.name || "User"}</div>
                            <div style={s.userEmail}>{user?.email || ""}</div>
                        </div>
                        {showDropdown && (
                            <ProfileDropdown
                                user={user}
                                onLogout={onLogout}
                                onClose={() => setShowDropdown(false)}
                                style={{ bottom: 54, left: 8, right: 8 }}
                            />
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}

export default function Sidebar() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const width = useWindowWidth();
    const isMobile = width < 768;
    const [open, setOpen] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const initial = (user?.firstName?.[0] || user?.fullName?.[0] || user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (isMobile) {
        return (
            <>
                <style>{`
                    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                    .hamburger-btn {
                        background: none; border: none; cursor: pointer;
                        padding: 6px; display: flex; align-items: center;
                        border-radius: 8px; transition: background 0.2s;
                    }
                    .hamburger-btn:hover { background: rgba(255,255,255,0.08); }
                    .avatar-btn {
                        background: none; border: none; cursor: pointer; padding: 0;
                        border-radius: 50%; transition: transform 0.2s;
                    }
                    .avatar-btn:hover { transform: scale(1.08); }
                `}</style>

                {/* Mobile topbar */}
                <div style={s.mobileTopbar}>
                    <button className="hamburger-btn" onClick={() => setOpen(true)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={s.brandIcon}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#47bfff" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                        </div>
                        <span style={s.brandName}>DocuTrack</span>
                    </div>

                    {/* Tappable avatar on mobile */}
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        <button className="avatar-btn" onClick={() => setShowDropdown(v => !v)}>
                            <div style={s.avatar}>{initial}</div>
                        </button>
                        {showDropdown && (
                            <ProfileDropdown
                                user={user}
                                onLogout={handleLogout}
                                onClose={() => setShowDropdown(false)}
                                style={{ top: 44, right: 0 }}
                            />
                        )}
                    </div>
                </div>

                {open && <div style={s.overlay} onClick={() => setOpen(false)} />}

                <div style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(-100%)" }}>
                    <SidebarContent isMobile={true} onClose={() => setOpen(false)} user={user} onLogout={handleLogout} />
                </div>
            </>
        );
    }

    return (
        <SidebarContent isMobile={false} onClose={() => { }} user={user} onLogout={handleLogout} />
    );
}

export function AppLayout({ children }) {
    const width = useWindowWidth();
    const isMobile = width < 768;
    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-page)", fontFamily: "'Inter', sans-serif", transition: "background 0.3s ease" }}>
            {!isMobile && <Sidebar />}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", minWidth: 0 }}>
                {isMobile && <Sidebar />}
                <main style={{ flex: 1 }}>{children}</main>
            </div>
        </div>
    );
}

const s = {
    sidebar: { width: 220, minWidth: 220, background: 'var(--bg-sidebar)', display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, borderRight: "1px solid var(--border)", fontFamily: "'Inter', sans-serif" },
    brand: { display: "flex", alignItems: "center", gap: 10, padding: "20px 14px 16px" },
    brandIcon: { width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, rgba(71,191,255,0.15), rgba(79,70,229,0.15))", border: "1px solid rgba(71,191,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    brandName: { fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.01em", fontFamily: "'Inter', sans-serif" },
    brandSub: { fontSize: 10, color: "var(--text-accent)", marginTop: 1, fontFamily: "'Inter', sans-serif" },
    divider: { height: 1, background: "var(--divider)", margin: "0 14px" },
    nav: { flex: 1, overflowY: "auto", padding: "12px 8px" },
    group: { marginBottom: 22 },
    groupLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-accent)", padding: "0 10px", margin: "0 0 6px", fontFamily: "'Inter', sans-serif" },
    navIcon: { width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: 0.85 },
    footer: { paddingBottom: 12 },
    userRow: { display: "flex", alignItems: "center", gap: 8, padding: "12px 12px 4px" },
    avatar: { width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #47bfff, #4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0, boxShadow: "0 2px 8px rgba(79,70,229,0.3)", cursor: 'pointer' },
    userInfo: { flex: 1, minWidth: 0 },
    userName: { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Inter', sans-serif" },
    userEmail: { fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Inter', sans-serif" },
    mobileTopbar: { position: "sticky", top: 0, zIndex: 50, background: "var(--topbar-bg)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 99 },
    drawer: { position: "fixed", top: 0, left: 0, height: "100vh", width: 260, zIndex: 100, transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)", background: "var(--bg-sidebar)", boxShadow: "4px 0 24px rgba(0,0,0,0.5)" },
};

function SecurityIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function GridIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}
function DocIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
}
function RouteIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
}
function WorkflowIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="5" r="3" /><circle cx="5" cy="19" r="3" /><circle cx="19" cy="19" r="3" /><line x1="12" y1="8" x2="5.27" y2="16.26" /><line x1="12" y1="8" x2="18.73" y2="16.26" /></svg>;
}
function DeptIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function UsersIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function SettingsIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}