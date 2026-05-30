import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../components/Sidebar";
import useAuthStore from "../store/authStore";
import useThemeStore from "../store/themeStore";
import client, { getDeviceName } from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";

const fetchApiKeys = () => client.get("/apikeys").then((r) => r.data);
const createApiKey = (body) => client.post("/apikeys", body).then((r) => r.data);
const revokeApiKey = (id) => client.delete("/apikeys/" + id).then((r) => r.data);
const toggleApiKey = (id) => client.patch("/apikeys/" + id + "/toggle").then((r) => r.data);

function Toggle({ checked, onToggle }) {
    return (
        <div onClick={(e) => { e.stopPropagation(); onToggle(); }} style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', background: checked ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.12)', boxShadow: checked ? '0 2px 8px rgba(79,70,229,0.45)' : 'none', transition: 'background 0.25s, box-shadow 0.25s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'transform 0.25s var(--ease-spring)', transform: checked ? 'translateX(22px)' : 'translateX(3px)', boxShadow: '0 1px 4px rgba(0,0,0,0.35)' }} />
        </div>
    );
}

function TwoFactorSection() {
    const { user, setUser } = useAuthStore();
    const [enabled, setEnabled] = useState(user?.isTwoFactorEnabled ?? false);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trustLoading, setTrustLoading] = useState(false);
    const [trustSuccess, setTrustSuccess] = useState(false);
    const [removingId, setRemovingId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await client.get("/auth/trusted-devices");
                if (!cancelled) setDevices(res.data);
            } catch { /* ignore */ }
            finally { if (!cancelled) setLoading(false); }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const toggle = async () => {
        try {
            const res = await client.patch("/auth/2fa/toggle");
            const newVal = res.data.isTwoFactorEnabled;
            setEnabled(newVal);
            setUser({ ...user, isTwoFactorEnabled: newVal });
        } catch { alert("Failed to toggle 2FA"); }
    };

    const removeDevice = async (id) => {
        setRemovingId(id);
        try {
            await client.delete("/auth/trusted-devices/" + id);
            setDevices(d => d.filter(dev => dev.id !== id));
        } catch { alert("Failed to remove device"); }
        finally { setRemovingId(null); }
    };

    const isCurrentDeviceTrusted = devices.some(d => d.isCurrent);

    const trustCurrentDevice = async () => {
        setTrustLoading(true);
        try {
            await client.post('/auth/trust-device', { deviceName: getDeviceName() });
            const res = await client.get("/auth/trusted-devices");
            setDevices(res.data);
            setTrustSuccess(true);
            setTimeout(() => setTrustSuccess(false), 3000);
        } catch { alert('Failed to trust device'); }
        finally { setTrustLoading(false); }
    };

    if (loading) return <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Loading…</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 2FA toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Two-Factor Authentication</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                        Require email verification on new device sign-ins
                    </p>
                </div>
                <Toggle checked={enabled} onToggle={toggle} />
            </div>

            {/* Trust current device */}
            {isCurrentDeviceTrusted ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--success-bg)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>This device is trusted</span>
                </div>
            ) : (
                <button onClick={trustCurrentDevice} disabled={trustLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(71,191,255,0.06)', border: '1px solid rgba(71,191,255,0.2)', borderRadius: 10, cursor: trustLoading ? 'not-allowed' : 'pointer', width: '100%', opacity: trustLoading ? 0.6 : 1, transition: 'background var(--duration-fast)' }}
                    onMouseEnter={e => { if (!trustLoading) e.currentTarget.style.background = 'rgba(71,191,255,0.12)'; }}
                    onMouseLeave={e => { if (!trustLoading) e.currentTarget.style.background = 'rgba(71,191,255,0.06)'; }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-to)" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    <span style={{ fontSize: 12, color: 'var(--accent-to)', fontWeight: 600 }}>
                        {trustLoading ? 'Trusting…' : '+ Trust This Device'}
                    </span>
                </button>
            )}

            {/* Trusted devices */}
            <div>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Trusted Devices{devices.length > 0 && ` (${devices.length})`}
                </p>
                {devices.length === 0 ? (
                    <div style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>No trusted devices yet</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {devices.map((dev) => (
                            <div key={dev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 10, border: dev.isCurrent ? '1px solid rgba(71,191,255,0.3)' : '1px solid var(--border-subtle)', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: dev.isCurrent ? 'rgba(71,191,255,0.1)' : 'var(--bg-surface)', border: dev.isCurrent ? '1px solid rgba(71,191,255,0.2)' : '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dev.isCurrent ? "var(--accent-to)" : "var(--text-tertiary)"} strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {dev.deviceName?.slice(0, 40) || "Unknown Device"}
                                            </span>
                                            {dev.isCurrent && (
                                                <span style={{ fontSize: 10, color: 'var(--accent-to)', background: 'rgba(71,191,255,0.1)', padding: '1px 7px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>Current</span>
                                            )}
                                        </div>
                                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>
                                            Trusted {new Date(dev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => removeDevice(dev.id)} disabled={removingId === dev.id}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'none', border: '1px solid var(--border-subtle)', cursor: removingId === dev.id ? 'not-allowed' : 'pointer', color: removingId === dev.id ? 'var(--text-tertiary)' : 'var(--danger)', flexShrink: 0, transition: 'background var(--duration-fast), border-color var(--duration-fast)' }}
                                    onMouseEnter={e => { if (removingId !== dev.id) { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'; } }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}>
                                    {removingId === dev.id ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32"/></svg>
                                    ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Settings() {
    const { user, setUser, logout } = useAuthStore();
    const { isDark, toggleTheme } = useThemeStore();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [profileEditing, setProfileEditing] = useState(false);
    const [pwOpen, setPwOpen] = useState(false);
    const [profile, setProfile] = useState({
        firstName: user?.firstName || user?.name?.split(" ")[0] || "",
        lastName: user?.lastName || user?.name?.split(" ")[1] || "",
        email: user?.email || "",
    });
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
    const [phoneSaving, setPhoneSaving] = useState(false);
    const [phoneSuccess, setPhoneSuccess] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
    const [pwError, setPwError] = useState("");
    const [pwSuccess, setPwSuccess] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [copiedId, setCopiedId] = useState(null);
    const [notifs, setNotifs] = useState({ emailOnRoute: true, emailOnApproval: true, emailOnReject: false });

    const { data: apiKeys = [], isLoading: keysLoading } = useQuery({
        queryKey: ["apikeys"],
        queryFn: fetchApiKeys,
    });

    const createKey = useMutation({ mutationFn: createApiKey, onSuccess: () => { qc.invalidateQueries(["apikeys"]); setNewKeyName(""); } });
    const revokeKey  = useMutation({ mutationFn: revokeApiKey, onSuccess: () => qc.invalidateQueries(["apikeys"]) });
    const toggleKey  = useMutation({ mutationFn: toggleApiKey, onSuccess: () => qc.invalidateQueries(["apikeys"]) });

    const copyToClipboard = (key, id) => {
        navigator.clipboard.writeText(key);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSavePw = async () => {
        setPwError("");
        if (!pw.currentPassword || !pw.newPassword) { setPwError("All fields are required"); return; }
        if (pw.newPassword !== pw.confirm) { setPwError("Passwords do not match"); return; }
        if (pw.newPassword.length < 8) { setPwError("Password must be at least 8 characters"); return; }
        if (!/[A-Z]/.test(pw.newPassword)) { setPwError("Password must contain at least one uppercase letter."); return; }
        if (!/[a-z]/.test(pw.newPassword)) { setPwError("Password must contain at least one lowercase letter."); return; }
        if (!/[0-9]/.test(pw.newPassword)) { setPwError("Password must contain at least one number."); return; }
        try {
            await client.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
            setPwSuccess(true);
            setPw({ currentPassword: "", newPassword: "", confirm: "" });
            setTimeout(() => setPwSuccess(false), 3000);
        } catch (err) { setPwError(err.response?.data?.error || 'Failed to change password.'); }
    };

    const setP = (k) => (e) => setProfile((f) => ({ ...f, [k]: e.target.value }));
    const handleSaveProfile = async () => {
        setProfileSaving(true); setProfileError(''); setProfileSuccess(false);
        try {
            const res = await client.patch('/Users/profile', {
                fullName: `${profile.firstName} ${profile.lastName}`.trim() || displayName,
                username: user?.username || '',
            });
            setUser({ ...user, fullName: res.data.fullName, username: res.data.username });
            setProfileSuccess(true);
            setProfileEditing(false);
            setTimeout(() => setProfileSuccess(false), 3000);
        } catch (err) { setProfileError(err.response?.data?.error || 'Failed to save profile.'); }
        finally { setProfileSaving(false); }
    };
    const setPwF = (k) => (e) => setPw((f) => ({ ...f, [k]: e.target.value }));

    const displayName = user?.firstName
        ? (user.firstName + " " + (user.lastName || "")).trim()
        : user?.fullName || user?.name || "User";
    const initial = (user?.firstName?.[0] || user?.fullName?.[0] || user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

    const cardStyle = {
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20,
        padding: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.08) inset',
    };
    const sectionTitle = { margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' };

    return (
        <AppLayout>
            <style>{`
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                .st-input {
                    width: 100%; height: 40px; padding: 0 12px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-primary);
                    font-size: 14px; outline: none; box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
                }
                .st-input:focus { border-color: var(--accent-from); box-shadow: 0 0 0 3px rgba(91,82,240,0.20); }
                .st-input::placeholder { color: var(--text-tertiary); }
                textarea.st-input { height: auto; padding: 10px 12px; }
                select.st-input { cursor: pointer; }
                .st-primary-btn {
                    display: inline-flex; align-items: center; gap: 7px;
                    height: 36px; padding: 0 16px;
                    background: var(--accent-gradient);
                    border: none; border-radius: 12px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity var(--duration-base), transform var(--duration-base);
                    box-shadow: var(--shadow-accent); white-space: nowrap;
                }
                .st-primary-btn:hover { opacity: 0.88; transform: translateY(-1px); }
                .st-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .st-ghost-btn {
                    height: 36px; padding: 0 16px;
                    background: transparent;
                    border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: background var(--duration-fast), color var(--duration-fast);
                }
                .st-ghost-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
                .st-submit-btn {
                    width: 100%; height: 40px;
                    background: var(--accent-gradient);
                    border: none; border-radius: 10px; color: #fff;
                    font-size: 14px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity var(--duration-base), transform var(--duration-base);
                    box-shadow: var(--shadow-accent);
                }
                .st-submit-btn:hover { opacity: 0.88; transform: translateY(-1px); }
                .st-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .action-icon-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 32px; height: 32px; border-radius: 50%;
                    background: none; border: 1px solid var(--border-subtle);
                    cursor: pointer; color: var(--text-tertiary);
                    transition: background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast);
                }
                .action-icon-btn:hover { background: var(--bg-card-hover); color: var(--text-secondary); border-color: var(--border-default); }
                .action-icon-btn.danger:hover { background: var(--danger-bg); color: var(--danger); border-color: rgba(248,113,113,0.3); }
                .action-icon-btn.warn:hover { background: var(--warning-bg); color: var(--warning); border-color: rgba(251,191,36,0.3); }
                .action-icon-btn.success:hover { background: var(--success-bg); color: var(--success); border-color: rgba(52,211,153,0.3); }
                .key-card {
                    background: var(--bg-card); border: 1px solid var(--border-subtle);
                    border-radius: 12px; padding: 14px;
                    transition: border-color var(--duration-fast);
                }
                .key-card:hover { border-color: var(--border-default); }
                .copy-btn {
                    padding: 5px 12px; background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 7px; color: var(--text-secondary);
                    font-size: 11px; cursor: pointer; font-family: 'Inter', sans-serif;
                    transition: background var(--duration-fast); flex-shrink: 0;
                }
                .copy-btn:hover { background: var(--bg-card-hover); }
                .accordion-header {
                    display: flex; align-items: center; justify-content: space-between;
                    width: 100%; background: none; border: none;
                    padding: 14px 0; cursor: pointer; text-align: left;
                    border-bottom: 1px solid transparent;
                    transition: border-color var(--duration-fast);
                }
                .accordion-header.open { border-bottom-color: var(--border-subtle); }
                .section-divider { height: 1px; background: var(--border-subtle); margin: 20px 0; }
            `}</style>

            <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: isMobile ? '20px 16px' : '28px 16px', boxSizing: 'border-box', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ marginBottom: 28, animation: 'fadeUp 0.3s ease both' }}>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Settings</h1>
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Manage your account and preferences</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* ── Profile Card ── */}
                    <div style={{ ...cardStyle, animation: 'fadeUp 0.35s ease both' }}>
                        <h2 style={sectionTitle}>Profile</h2>

                        {!profileEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 800, flexShrink: 0, boxShadow: 'var(--shadow-accent)' }}>
                                        {initial}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{displayName}</p>
                                        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.email}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>{user?.role || 'Staff'}</p>
                                    </div>
                                </div>
                                <button className="st-ghost-btn" onClick={() => setProfileEditing(true)}>Edit</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 800, flexShrink: 0, boxShadow: 'var(--shadow-accent)' }}>
                                        {initial}
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{displayName}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>{profile.email}</p>
                                    </div>
                                </div>
                                <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                                    <Field label="First Name"><input className="st-input" value={profile.firstName} onChange={setP("firstName")} /></Field>
                                    <Field label="Last Name"><input className="st-input" value={profile.lastName} onChange={setP("lastName")} /></Field>
                                </div>
                                <Field label="Email Address"><input className="st-input" type="email" value={profile.email} onChange={setP("email")} /></Field>
                                <Field label="Phone Number">
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input className="st-input" style={{ flex: 1 }} type="tel" placeholder="+639xxxxxxxxx" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                                        <button className="st-primary-btn" disabled={phoneSaving}
                                            onClick={async () => {
                                                setPhoneSaving(true); setPhoneError(''); setPhoneSuccess(false);
                                                try {
                                                    await client.patch(`/Users/${user?.id}/phone`, { phoneNumber });
                                                    setPhoneSuccess(true);
                                                    setTimeout(() => setPhoneSuccess(false), 3000);
                                                } catch { setPhoneError('Failed to save phone number'); }
                                                finally { setPhoneSaving(false); }
                                            }}>
                                            {phoneSaving ? 'Saving…' : 'Save'}
                                        </button>
                                    </div>
                                </Field>
                                {phoneSuccess && <Alert type="success">Phone number saved</Alert>}
                                {phoneError && <Alert type="error">{phoneError}</Alert>}
                                {profileError && <Alert type="error">{profileError}</Alert>}
                                {profileSuccess && <Alert type="success">Profile saved successfully.</Alert>}
                                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                    <button className="st-ghost-btn" onClick={() => { setProfileEditing(false); setProfileError(''); }}>Cancel</button>
                                    <button className="st-submit-btn" style={{ flex: 1 }} onClick={handleSaveProfile} disabled={profileSaving}>
                                        {profileSaving ? 'Saving…' : 'Save Profile'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Security Card ── */}
                    <div style={{ ...cardStyle, animation: 'fadeUp 0.4s ease both' }}>
                        <h2 style={sectionTitle}>Security</h2>

                        {/* Change Password accordion */}
                        <button className={`accordion-header${pwOpen ? ' open' : ''}`} onClick={() => setPwOpen(p => !p)}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Change Password</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" style={{ transition: 'transform var(--duration-fast)', transform: pwOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        {pwOpen && (
                            <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <Field label="Current Password"><input className="st-input" type="password" value={pw.currentPassword} onChange={setPwF("currentPassword")} placeholder="••••••••" /></Field>
                                <Field label="New Password"><input className="st-input" type="password" value={pw.newPassword} onChange={setPwF("newPassword")} placeholder="Min 8 characters" /></Field>
                                <Field label="Confirm New Password"><input className="st-input" type="password" value={pw.confirm} onChange={setPwF("confirm")} placeholder="••••••••" /></Field>
                                {pwError && <Alert type="error">{pwError}</Alert>}
                                {pwSuccess && <Alert type="success">Password changed successfully</Alert>}
                                <button className="st-submit-btn" onClick={handleSavePw}>Update Password</button>
                            </div>
                        )}

                        <div className="section-divider" />

                        {/* 2FA + Trusted Devices */}
                        <TwoFactorSection />
                    </div>

                    {/* ── Appearance Card ── */}
                    <div style={{ ...cardStyle, animation: 'fadeUp 0.45s ease both' }}>
                        <h2 style={sectionTitle}>Appearance</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {[
                                { key: '__dark__', label: 'Dark Mode', desc: 'Switch between dark and light appearance', checked: isDark, onToggle: toggleTheme },
                                { key: 'emailOnRoute', label: 'Document routed to me', desc: 'When a document is assigned to you for review', checked: notifs.emailOnRoute, onToggle: () => setNotifs(f => ({ ...f, emailOnRoute: !f.emailOnRoute })) },
                                { key: 'emailOnApproval', label: 'Document approved', desc: 'When a document you submitted is approved', checked: notifs.emailOnApproval, onToggle: () => setNotifs(f => ({ ...f, emailOnApproval: !f.emailOnApproval })) },
                                { key: 'emailOnReject', label: 'Document rejected', desc: 'When a document you submitted is rejected', checked: notifs.emailOnReject, onToggle: () => setNotifs(f => ({ ...f, emailOnReject: !f.emailOnReject })) },
                            ].map(({ key, label, desc, checked, onToggle }, idx, arr) => (
                                <div key={key} onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: idx < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>{desc}</p>
                                    </div>
                                    <Toggle checked={checked} onToggle={onToggle} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── API Keys Card ── */}
                    <div style={{ ...cardStyle, animation: 'fadeUp 0.5s ease both' }}>
                        <h2 style={sectionTitle}>API Keys</h2>
                        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                            Use API keys to authenticate requests. Include as{' '}
                            <code style={{ background: 'var(--bg-card)', padding: '2px 7px', borderRadius: 5, fontSize: 12, color: 'var(--accent-to)', fontFamily: 'ui-monospace, monospace' }}>X-API-Key: your_key</code>
                        </p>
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, marginBottom: 20 }}>
                            <input className="st-input" style={{ flex: 1 }} placeholder="Key name e.g. My App, Postman" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                            <button className="st-primary-btn" disabled={createKey.isPending} onClick={() => createKey.mutate({ name: newKeyName || "Default" })}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                {createKey.isPending ? "Generating…" : "Generate Key"}
                            </button>
                        </div>
                        <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 16 }} />
                        {keysLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
                        ) : apiKeys.length === 0 ? (
                            <p style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '24px 0', margin: 0 }}>No API keys yet — generate one above</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {apiKeys.map((key) => (
                                    <div key={key.id} className="key-card">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{key.name}</span>
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0, ...(key.isActive ? { background: 'var(--success-bg)', color: 'var(--success)' } : { background: 'var(--bg-card)', color: 'var(--text-tertiary)' }) }}>
                                                    {key.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                <button className={`action-icon-btn ${key.isActive ? 'warn' : 'success'}`} title={key.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggleKey.mutate(key.id)}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                                                </button>
                                                <button className="action-icon-btn danger" title="Revoke key" onClick={() => { if (window.confirm('Revoke key ' + key.name + '?')) revokeKey.mutate(key.id); }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <code style={{ flex: 1, fontSize: 12, color: 'var(--accent-to)', background: 'rgba(71,191,255,0.06)', padding: '7px 10px', borderRadius: 7, fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px solid rgba(71,191,255,0.1)' }}>
                                                {key.key.slice(0, 12)}{'•'.repeat(20)}
                                            </code>
                                            <button className="copy-btn" onClick={() => copyToClipboard(key.key, key.id)}>
                                                {copiedId === key.id ? '✓ Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                                            {key.lastUsedAt && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Sign Out Card ── */}
                    <div style={{ ...cardStyle, animation: 'fadeUp 0.55s ease both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Sign Out</p>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>End your current session on this device</p>
                            </div>
                            <button
                                onClick={() => { logout(); navigate('/login', { replace: true }); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 16px', background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, color: 'var(--danger)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'background var(--duration-fast)', flexShrink: 0 }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.18)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                Sign Out
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}

function Alert({ type, children }) {
    const s = type === 'success'
        ? { background: 'var(--success-bg)', border: '1px solid rgba(52,211,153,0.25)', color: 'var(--success)' }
        : { background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--danger)' };
    return <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, ...s }}>{children}</div>;
}

function Field({ label, children }) {
    return (
        <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.05em', margin: '0 0 4px', display: 'block', fontFamily: "'Inter', sans-serif" }}>{label}</label>
            <div style={{ marginTop: 4 }}>{children}</div>
        </div>
    );
}

function Spinner() {
    return <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(71,191,255,0.15)', borderTopColor: '#47bfff', animation: 'dtSpin 0.8s linear infinite' }} />;
}
