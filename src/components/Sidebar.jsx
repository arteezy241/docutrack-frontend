import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useWindowWidth from '../hooks/useWindowWidth';

const CSS = `
/* ── Floating top nav ── */
.tn-bar-wrap {
  position: fixed; top: 12px; left: 0; right: 0;
  z-index: 1000;
  display: flex; justify-content: center;
  padding: 0 24px;
  pointer-events: none;
  font-family: 'Inter', system-ui, sans-serif;
}
.tn-bar {
  height: 48px;
  background: rgba(13,15,20,0.45);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 9999px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.10) inset;
  display: flex; align-items: center; gap: 8px;
  padding: 0 20px 0 20px;
  width: 100%; max-width: 1100px;
  box-sizing: border-box;
  pointer-events: all;
}
.tn-brand {
  display: flex; align-items: center; gap: 8px;
  flex-shrink: 0; text-decoration: none; color: inherit;
}
.tn-divider {
  width: 1px; height: 16px;
  background: var(--border-default);
  flex-shrink: 0; margin: 0 8px;
}
.tn-logo-mark {
  width: 26px; height: 26px;
  background: var(--accent-gradient); border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(79,70,229,0.4); flex-shrink: 0;
}
.tn-wordmark {
  font-size: 15px; font-weight: 700;
  color: #fff; letter-spacing: 0.01em;
  white-space: nowrap;
}
.tn-pills {
  display: flex; align-items: center; gap: 2px;
}
.tn-pill {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 12px;
  border-radius: 10px; font-size: 13px; font-weight: 550;
  color: rgba(255,255,255,0.75);
  cursor: pointer; text-decoration: none;
  border: none; background: transparent;
  transition: background var(--duration-fast), color var(--duration-fast);
  font-family: 'Inter', system-ui, sans-serif;
  white-space: nowrap; line-height: 1;
}
.tn-pill:hover { background: rgba(255,255,255,0.12); color: #fff; }
.tn-pill.active { background: var(--accent-gradient); color: #fff; font-weight: 600; box-shadow: 0 2px 12px rgba(91,82,240,0.45); }
.tn-avatar-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 6px;
  border-radius: 10px; border: none;
  background: transparent; cursor: pointer;
  flex-shrink: 0;
  transition: background var(--duration-fast), color var(--duration-fast);
  font-family: 'Inter', system-ui, sans-serif;
  position: relative;
}
.tn-avatar-btn:hover { background: var(--bg-card-hover); }
.tn-avatar {
  width: 30px; height: 30px;
  border-radius: 50%; background: var(--accent-gradient);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: 700;
  box-shadow: 0 1px 6px rgba(79,70,229,0.5);
  flex-shrink: 0;
  font-family: 'Inter', system-ui, sans-serif;
  pointer-events: none;
}
.tn-avatar-name {
  font-size: 13px; font-weight: 500;
  color: var(--text-secondary); white-space: nowrap;
  pointer-events: none;
}
.tn-avatar-btn:hover .tn-avatar-name { color: var(--text-primary); }
/* Dropdown anchors to the avatar button */
.tn-avatar-wrap {
  position: relative; display: inline-flex; align-items: center;
}
@media (max-width: 767px) {
  .tn-avatar-name { display: none; }
}
/* Dropdown */
.tn-dropdown {
  position: absolute; top: calc(100% + 8px); right: 0;
  min-width: 224px;
  background: rgba(13,15,22,0.72);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0,0,0,0.60), 0 1px 0 rgba(255,255,255,0.10) inset;
  overflow: hidden;
  animation: scaleIn var(--duration-base) var(--ease-spring) both;
  transform-origin: top right; z-index: 1010;
}
.tn-dd-item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 9px 14px;
  background: none; border: none;
  color: rgba(255,255,255,0.72); font-size: 13px; font-weight: 500;
  font-family: 'Inter', system-ui, sans-serif;
  cursor: pointer; text-align: left;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.tn-dd-item:hover { background: rgba(255,255,255,0.09); color: #fff; }
.tn-dd-item.danger { color: var(--danger); }
.tn-dd-item.danger:hover { background: rgba(255,69,58,0.15); color: var(--danger); }
.tn-dd-icon { width: 16px; height: 16px; display: flex; align-items: center; flex-shrink: 0; }
.tn-role-badge {
  font-size: 10px; font-weight: 700;
  padding: 2px 7px; border-radius: 20px; display: inline-block; margin-top: 3px;
}
/* Mobile drawer */
.tn-drawer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  z-index: 1200; animation: fadeIn var(--duration-fast) ease;
}
.tn-drawer {
  position: fixed; top: 0; left: 0; bottom: 0; width: 280px;
  background: rgba(11,13,22,0.80);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-right: 1px solid rgba(255,255,255,0.10);
  z-index: 1201; display: flex; flex-direction: column;
  animation: drawerIn var(--duration-base) var(--ease-spring);
  box-shadow: 4px 0 32px rgba(0,0,0,0.50);
}
@keyframes drawerIn {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}
.tn-drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 16px 16px;
  border-bottom: 1px solid var(--border-subtle);
}
.tn-drawer-nav {
  flex: 1; overflow-y: auto; padding: 8px;
}
.tn-drawer-item {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 11px 14px;
  border-radius: 10px; border: none;
  background: none; color: var(--text-secondary);
  font-size: 14px; font-weight: 500;
  font-family: 'Inter', system-ui, sans-serif;
  cursor: pointer; text-decoration: none;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.tn-drawer-item:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.tn-drawer-item.active { background: var(--accent-gradient); color: #fff; font-weight: 600; }
/* Light mode — pill + drawer + dropdown bg is always dark, force white text */
[data-theme="light"] .tn-wordmark { color: rgba(255,255,255,0.95); }
[data-theme="light"] .tn-pill { color: rgba(255,255,255,0.65); }
[data-theme="light"] .tn-pill:hover { color: #fff; background: rgba(255,255,255,0.12); }
[data-theme="light"] .tn-pill.active { color: #fff; }
[data-theme="light"] .tn-divider { background: rgba(255,255,255,0.2); }
[data-theme="light"] .tn-avatar-btn:hover { background: rgba(255,255,255,0.12); }
/* Drawer items in light mode (drawer bg is always dark) */
[data-theme="light"] .tn-drawer-item { color: rgba(255,255,255,0.70); }
[data-theme="light"] .tn-drawer-item:hover { background: rgba(255,255,255,0.10); color: #fff; }
[data-theme="light"] .tn-drawer-item.active { color: #fff; }
/* Dropdown items in light mode (dropdown bg is always dark) */
[data-theme="light"] .tn-dd-item { color: rgba(255,255,255,0.72) !important; }
[data-theme="light"] .tn-dd-item:hover { color: #fff !important; }
[data-theme="light"] .tn-dd-item.danger { color: var(--danger) !important; }
/* Mobile bottom tab bar */
.tn-bottom {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 56px;
  background: rgba(13,15,20,0.55);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-top: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 -4px 20px rgba(0,0,0,0.35);
  z-index: 1000;
  display: flex; align-items: stretch;
  font-family: 'Inter', system-ui, sans-serif;
}
.tn-tab {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  flex: 1; gap: 4px;
  background: none; border: none; cursor: pointer;
  padding: 8px 4px 10px;
  color: var(--text-tertiary);
  text-decoration: none;
  transition: color var(--duration-fast);
  position: relative;
  font-family: 'Inter', system-ui, sans-serif;
}
.tn-tab.active { color: var(--accent-to); }
.tn-tab-dot {
  position: absolute; bottom: 8px;
  width: 4px; height: 4px; border-radius: 50%;
  background: var(--accent-to);
  opacity: 0; transition: opacity var(--duration-fast);
}
.tn-tab.active .tn-tab-dot { opacity: 1; }
`;

const NAV_ITEMS = [
  { to: '/',            label: 'Dashboard',   icon: <GridIcon size={15} />,     end: true },
  { to: '/documents',   label: 'Documents',   icon: <DocIcon size={15} /> },
  { to: '/routing',     label: 'Routing',     icon: <RouteIcon size={15} /> },
  { to: '/workflow',    label: 'Workflow',     icon: <WorkflowIcon size={15} /> },
  { to: '/departments', label: 'Departments', icon: <DeptIcon size={15} /> },
  { to: '/users',       label: 'Users',       icon: <UsersIcon size={15} /> },
  { to: '/audit',       label: 'Audit Log',   icon: <AuditIcon size={15} /> },
  { to: '/settings',    label: 'Settings',    icon: <SettingsIcon size={15} /> },
];

const MOBILE_TABS = [
  { to: '/',            end: true, icon: <GridIcon size={22} /> },
  { to: '/documents',             icon: <DocIcon size={22} /> },
  { to: '/routing',               icon: <RouteIcon size={22} /> },
  { to: '/workflow',              icon: <WorkflowIcon size={22} /> },
  { to: '/settings',              icon: <SettingsIcon size={22} /> },
];

function ProfileDropdown({ user, onLogout, onClose }) {
  const navigate = useNavigate();
  const initial = (user?.firstName?.[0] || user?.fullName?.[0] || user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase();
  const roleColor = { Admin: '#f59e0b', Staff: 'var(--accent-to)', Viewer: 'var(--text-tertiary)' }[user?.role] ?? 'var(--text-tertiary)';
  const roleBg   = { Admin: 'rgba(245,158,11,0.12)', Staff: 'rgba(71,191,255,0.1)', Viewer: 'rgba(255,255,255,0.06)' }[user?.role] ?? 'rgba(255,255,255,0.06)';

  const go = (path) => { navigate(path); onClose(); };

  return (
    <div className="tn-dropdown">
      {/* Identity */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
          {initial}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.fullName || user?.name || 'User'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email || ''}
          </div>
          <span className="tn-role-badge" style={{ background: roleBg, color: roleColor }}>{user?.role || 'Staff'}</span>
        </div>
      </div>
      {/* Links */}
      <div style={{ padding: '4px 6px' }}>
        <button className="tn-dd-item" onClick={() => go('/settings')}>
          <span className="tn-dd-icon"><SettingsIcon size={16} /></span>Settings
        </button>
        <button className="tn-dd-item" onClick={() => go('/settings')}>
          <span className="tn-dd-icon"><SecurityIcon /></span>Security
        </button>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '0 10px' }} />
      <div style={{ padding: '4px 6px 6px' }}>
        <button className="tn-dd-item danger" onClick={() => { onLogout(); onClose(); }}>
          <span className="tn-dd-icon"><LogoutIcon /></span>Sign out
        </button>
      </div>
    </div>
  );
}

function TopNav() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const width = useWindowWidth();
  const isMobile = width < 768;
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const dropdownRef = useRef(null);

  const initial = (user?.firstName?.[0] || user?.fullName?.[0] || user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase();
  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <style>{CSS}</style>

      {/* ── Top bar ── */}
      <div className="tn-bar-wrap">
      <header className="tn-bar">

        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          {/* Brand */}
          <Link to="/" className="tn-brand">
            <div className="tn-logo-mark">
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, lineHeight: 1 }}>D</span>
            </div>
            <span className="tn-wordmark">DocuTrack</span>
          </Link>

          {/* Divider + nav pills (desktop only) */}
          {!isMobile && (
            <>
              <div className="tn-divider" />
              <nav className="tn-pills">
                {NAV_ITEMS.map(({ to, label, icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => `tn-pill${isActive ? ' active' : ''}`}
                  >
                    {icon}
                    {label}
                  </NavLink>
                ))}
              </nav>
            </>
          )}

          {/* Right side: burger (mobile) + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {isMobile && (
              <button onClick={() => setShowDrawer(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            )}
            <div className="tn-avatar-wrap" ref={dropdownRef}>
              <button className="tn-avatar-btn" onClick={() => setShowDropdown(v => !v)}>
                <div className="tn-avatar">{initial}</div>
              </button>
              {showDropdown && (
                <ProfileDropdown
                  user={user}
                  onLogout={handleLogout}
                  onClose={() => setShowDropdown(false)}
                />
              )}
            </div>
          </div>
        </div>
      </header>
      </div>

      {/* ── Mobile drawer ── */}
      {isMobile && showDrawer && (
        <>
          <div className="tn-drawer-overlay" onClick={() => setShowDrawer(false)} />
          <div className="tn-drawer">
            <div className="tn-drawer-head">
              <Link to="/" className="tn-brand" onClick={() => setShowDrawer(false)}>
                <div className="tn-logo-mark"><span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>D</span></div>
                <span className="tn-wordmark">DocuTrack</span>
              </Link>
              <button onClick={() => setShowDrawer(false)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-card-hover)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
              </button>
            </div>
            <nav className="tn-drawer-nav">
              {NAV_ITEMS.map(({ to, label, icon, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => `tn-drawer-item${isActive ? ' active' : ''}`}
                  onClick={() => setShowDrawer(false)}
                >
                  {icon}{label}
                </NavLink>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* ── Mobile bottom tab bar ── */}
      {isMobile && (
        <nav className="tn-bottom">
          {MOBILE_TABS.map(({ to, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `tn-tab${isActive ? ' active' : ''}`}
            >
              {icon}
              <div className="tn-tab-dot" />
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}

/* Legacy default export — no longer renders a sidebar */
export default function Sidebar() { return null; }

function AppBackground() {
  const canvasRef = useRef(null);
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);

    const colors = ['#4F46E5', '#47bfff', '#7c3aed', '#06b6d4', '#0ea5e9'];
    const particles = Array.from({ length: 70 }, () => {
      const vx = (Math.random() - 0.5) * 0.45;
      const vy = (Math.random() - 0.5) * 0.45;
      return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2.5 + 0.8, color: colors[Math.floor(Math.random() * colors.length)], vx, vy, baseVx: vx, baseVy: vy, opacity: Math.random() * 0.55 + 0.18 };
    });

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(71,191,255,${0.13 * (1 - d / 150)})`; ctx.lineWidth = 0.8; ctx.stroke();
          }
        }
      }
      particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0'); ctx.fill();
        p.x += p.vx; p.y += p.vy;
        p.vx += (p.baseVx - p.vx) * 0.02; p.vy += (p.baseVy - p.vy) * 0.02;
        if (p.x < 0 || p.x > w) { p.vx *= -1; p.baseVx *= -1; }
        if (p.y < 0 || p.y > h) { p.vy *= -1; p.baseVy *= -1; }
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 900, height: 900, borderRadius: '50%', background: '#4F46E5', opacity: isDark ? 0.18 : 0.28, filter: 'blur(140px)', top: '-20%', left: '-15%' }} />
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: '#47bfff', opacity: isDark ? 0.13 : 0.22, filter: 'blur(120px)', bottom: '-10%', right: '-5%' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: '#7c3aed', opacity: isDark ? 0.15 : 0.24, filter: 'blur(130px)', top: '40%', left: '35%' }} />
      </div>
    </>
  );
}

export function AppLayout({ children }) {
  const width = useWindowWidth();
  const isMobile = width < 768;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: "'Inter', system-ui, sans-serif", position: 'relative' }}>
      <AppBackground />
      <TopNav />
      <div style={{
        position: 'relative', zIndex: 1,
        paddingTop: 72,
        paddingBottom: isMobile ? 56 : 0,
        minHeight: '100vh',
        overflowX: 'hidden',
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          padding: '32px 24px',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Icons ── */
function GridIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
}
function DocIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
}
function RouteIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;
}
function WorkflowIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5.27" y2="16.26"/><line x1="12" y1="8" x2="18.73" y2="16.26"/></svg>;
}
function DeptIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function UsersIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
}
function AuditIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
}
function SettingsIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
}
function SecurityIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function LogoutIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
