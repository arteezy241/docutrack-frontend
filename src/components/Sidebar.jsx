import { useState } from "react";
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

// ── extracted outside to avoid "created during render" error ─────────────────
function SidebarContent({ isMobile, onClose, user, onLogout }) {
    const initial = (user?.firstName?.[0] || user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

    return (
        <aside style={{ ...s.sidebar, width: isMobile ? "100%" : 220 }}>
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
                {isMobile && (
                    <button style={s.closeBtn} onClick={onClose}>X</button>
                )}
            </div>

            <div style={s.divider} />

            <nav style={s.nav}>
                {NAV.map((group) => (
                    <div key={group.label} style={s.group}>
                        <p style={s.groupLabel}>{group.label}</p>
                        {group.items.map(({ to, icon, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === "/"}
                                onClick={() => isMobile && onClose()}
                                style={({ isActive }) => ({
                                    ...s.navItem,
                                    ...(isActive ? s.navItemActive : {}),
                                })}
                            >
                                <span style={s.navIcon}>{icon}</span>
                                {label}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div style={s.footer}>
                <div style={s.divider} />
                <div style={s.userRow}>
                    <div style={s.avatar}>{initial}</div>
                    <div style={s.userInfo}>
                        <div style={s.userName}>{user?.name || user?.fullName || "User"}</div>
                        <div style={s.userEmail}>{user?.email || ""}</div>
                    </div>
                    <button onClick={onLogout} style={s.logoutBtn} title="Sign out">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </div>
        </aside>
    );
}

// ── main Sidebar component ────────────────────────────────────────────────────
export default function Sidebar() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const width = useWindowWidth();
    const isMobile = width < 768;
    const [open, setOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const initial = (user?.firstName?.[0] || user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

    if (isMobile) {
        return (
            <>
                {/* Mobile topbar */}
                <div style={s.mobileTopbar}>
                    <button style={s.hamburger} onClick={() => setOpen(true)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c6d4df" strokeWidth="2">
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
                    <div style={s.avatar}>{initial}</div>
                </div>

                {/* Overlay */}
                {open && (
                    <div style={s.overlay} onClick={() => setOpen(false)} />
                )}

                {/* Drawer */}
                <div style={{
                    ...s.drawer,
                    transform: open ? "translateX(0)" : "translateX(-100%)",
                }}>
                    <SidebarContent
                        isMobile={true}
                        onClose={() => setOpen(false)}
                        user={user}
                        onLogout={handleLogout}
                    />
                </div>
            </>
        );
    }

    return (
        <SidebarContent
            isMobile={false}
            onClose={() => { }}
            user={user}
            onLogout={handleLogout}
        />
    );
}

// ── layout wrapper ────────────────────────────────────────────────────────────
export function AppLayout({ children }) {
    const width = useWindowWidth();
    const isMobile = width < 768;

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#1b2838" }}>
            {!isMobile && <Sidebar />}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", minWidth: 0 }}>
                {isMobile && <Sidebar />}
                <main style={{ flex: 1 }}>{children}</main>
            </div>
        </div>
    );
}

// ── styles ────────────────────────────────────────────────────────────────────
const s = {
    sidebar: { width: 220, minWidth: 220, background: "#171a21", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, borderRight: "1px solid rgba(255,255,255,0.05)" },
    brand: { display: "flex", alignItems: "center", gap: 10, padding: "20px 16px 16px" },
    brandIcon: { width: 36, height: 36, borderRadius: 6, background: "rgba(71,191,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    brandName: { fontSize: 14, fontWeight: 700, color: "#c6d4df", letterSpacing: "0.01em" },
    brandSub: { fontSize: 10, color: "#8f98a0", marginTop: 1 },
    closeBtn: { background: "none", border: "none", color: "#8f98a0", fontSize: 16, cursor: "pointer", padding: 4 },
    divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "0 12px" },
    nav: { flex: 1, overflowY: "auto", padding: "12px 8px" },
    group: { marginBottom: 20 },
    groupLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#4a7fa5", padding: "0 8px", margin: "0 0 6px" },
    navItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 4, color: "#8f98a0", fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "background 0.15s, color 0.15s" },
    navItemActive: { background: "rgba(79,70,229,0.18)", color: "#c6d4df", borderLeft: "2px solid #4F46E5" },
    navIcon: { width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    footer: { paddingBottom: 12 },
    userRow: { display: "flex", alignItems: "center", gap: 8, padding: "12px 12px 4px" },
    avatar: { width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#47bfff,#4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 },
    userInfo: { flex: 1, minWidth: 0 },
    userName: { fontSize: 12, fontWeight: 600, color: "#c6d4df", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    userEmail: { fontSize: 10, color: "#8f98a0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    logoutBtn: { background: "none", border: "none", cursor: "pointer", color: "#8f98a0", padding: 4, borderRadius: 4, display: "flex", alignItems: "center", flexShrink: 0 },
    mobileTopbar: { position: "sticky", top: 0, zIndex: 50, background: "#171a21", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    hamburger: { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99 },
    drawer: { position: "fixed", top: 0, left: 0, height: "100vh", width: 260, zIndex: 100, transition: "transform 0.3s ease", background: "#171a21" },
};

// ── icons ─────────────────────────────────────────────────────────────────────
function GridIcon() {
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
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