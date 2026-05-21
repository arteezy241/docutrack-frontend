import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import useAuthStore from "../store/authStore";
import useThemeStore from "../store/themeStore";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";

const fetchApiKeys = () => client.get("/apikeys").then((r) => r.data);
const createApiKey = (body) => client.post("/apikeys", body).then((r) => r.data);
const revokeApiKey = (id) => client.delete("/apikeys/" + id).then((r) => r.data);
const toggleApiKey = (id) => client.patch("/apikeys/" + id + "/toggle").then((r) => r.data);

const TABS = ["Profile", "Security", "API Keys", "Notifications"];

function TwoFactorSection() {
    const { user, setUser } = useAuthStore();
    const [enabled, setEnabled] = useState(user?.isTwoFactorEnabled ?? false);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const devicesRes = await client.get("/auth/trusted-devices");
                setDevices(devicesRes.data);
            } catch (_) {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const toggle = async () => {
        try {
            const res = await client.patch("/auth/2fa/toggle");
            const newVal = res.data.isTwoFactorEnabled;
            setEnabled(newVal);
            setUser({ ...user, isTwoFactorEnabled: newVal });
        } catch {
            alert("Failed to toggle 2FA");
        }
    };

    const removeDevice = async (id) => {
        if (!window.confirm("Remove this trusted device?")) return;
        try {
            await client.delete("/auth/trusted-devices/" + id);
            const removed = devices.find(d => d.id === id);
            if (removed?.deviceToken === localStorage.getItem('deviceToken')) {
                localStorage.removeItem('deviceToken');
            }
            setDevices(d => d.filter(dev => dev.id !== id));
        } catch {
            alert("Failed to remove device");
        }
    };

    const currentDeviceToken = localStorage.getItem('deviceToken');
    const isCurrentDeviceTrusted = devices.some(d => d.deviceToken === currentDeviceToken);

    const trustCurrentDevice = async () => {
        try {
            const res = await client.post('/auth/trust-device');
            localStorage.setItem('deviceToken', res.data.deviceToken);
            const devicesRes = await client.get('/auth/trusted-devices');
            setDevices(devicesRes.data);
        } catch {
            alert('Failed to trust device');
        }
    };

    if (loading) return <p style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Loading...</p>;

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div onClick={toggle} style={{ width: 44, height: 24, borderRadius: 12, position: "relative", transition: "background 0.25s", cursor: "pointer", background: enabled ? "linear-gradient(135deg,#47bfff,#4F46E5)" : "rgba(255,255,255,0.1)", boxShadow: enabled ? "0 2px 8px rgba(79,70,229,0.4)" : "none" }}>
                    <div style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "transform 0.25s cubic-bezier(0.32,0.72,0,1)", transform: enabled ? "translateX(22px)" : "translateX(3px)", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                </div>
                <span style={{ fontSize: 13, color: enabled ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600, fontFamily: "'Inter', sans-serif", transition: "color 0.2s" }}>
                    {enabled ? "2FA Enabled" : "2FA Disabled"}
                </span>
            </div>

            {/* Trust current device */}
            <div style={{ marginBottom: 16 }}>
                {isCurrentDeviceTrusted ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 10 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>This device is trusted</span>
                    </div>
                ) : (
                    <button
                        onClick={trustCurrentDevice}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(71,191,255,0.06)', border: '1px solid rgba(71,191,255,0.2)', borderRadius: 10, cursor: 'pointer', width: '100%', fontFamily: "'Inter', sans-serif", transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(71,191,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(71,191,255,0.06)'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#47bfff" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                        <span style={{ fontSize: 12, color: '#47bfff', fontWeight: 600 }}>Trust this device</span>
                    </button>
                )}
            </div>

            {/* Trusted devices list */}
            {devices.length > 0 && (
                <div>
                    <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "var(--text-accent)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>Trusted Devices</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {devices.map((dev) => (
                            <div key={dev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg-input)", borderRadius: 10, border: dev.deviceToken === currentDeviceToken ? "1px solid rgba(71,191,255,0.3)" : "1px solid var(--border)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: dev.deviceToken === currentDeviceToken ? "rgba(71,191,255,0.1)" : "rgba(255,255,255,0.05)", border: dev.deviceToken === currentDeviceToken ? "1px solid rgba(71,191,255,0.2)" : "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dev.deviceToken === currentDeviceToken ? "#47bfff" : "var(--text-muted)"} strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                                            {dev.deviceName?.slice(0, 60) || "Unknown Device"}
                                            {dev.deviceToken === currentDeviceToken && (
                                                <span style={{ marginLeft: 8, fontSize: 10, color: '#47bfff', background: 'rgba(71,191,255,0.1)', padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>Current</span>
                                            )}
                                        </p>
                                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", fontFamily: "'Inter', sans-serif" }}>
                                            Last used: {new Date(dev.lastUsedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeDevice(dev.id)}
                                    style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
                                    onMouseEnter={e => e.target.style.background = "rgba(248,113,113,0.1)"}
                                    onMouseLeave={e => e.target.style.background = "none"}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {devices.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontFamily: "'Inter', sans-serif" }}>
                    No trusted devices yet. Devices will appear here after verifying a new device login.
                </p>
            )}
        </div>
    );
}

export default function Settings() {
    const { user } = useAuthStore();
    const { isDark, toggleTheme } = useThemeStore();
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [tab, setTab] = useState("Profile");
    const [profile, setProfile] = useState({
        firstName: user?.firstName || user?.name?.split(" ")[0] || "",
        lastName: user?.lastName || user?.name?.split(" ")[1] || "",
        email: user?.email || "",
    });
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
    const [phoneSaving, setPhoneSaving] = useState(false);
    const [phoneSuccess, setPhoneSuccess] = useState(false);
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
        enabled: tab === "API Keys",
    });

    const createKey = useMutation({ mutationFn: createApiKey, onSuccess: () => { qc.invalidateQueries(["apikeys"]); setNewKeyName(""); } });
    const revokeKey = useMutation({ mutationFn: revokeApiKey, onSuccess: () => qc.invalidateQueries(["apikeys"]) });
    const toggleKey = useMutation({ mutationFn: toggleApiKey, onSuccess: () => qc.invalidateQueries(["apikeys"]) });

    const copyToClipboard = (key, id) => {
        navigator.clipboard.writeText(key);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSavePw = () => {
        setPwError("");
        if (!pw.currentPassword || !pw.newPassword) { setPwError("All fields are required"); return; }
        if (pw.newPassword !== pw.confirm) { setPwError("Passwords do not match"); return; }
        if (pw.newPassword.length < 8) { setPwError("Password must be at least 8 characters"); return; }
        setPwSuccess(true);
        setTimeout(() => setPwSuccess(false), 3000);
    };

    const setP = (k) => (e) => setProfile((f) => ({ ...f, [k]: e.target.value }));
    const setPwF = (k) => (e) => setPw((f) => ({ ...f, [k]: e.target.value }));

    const displayName = user?.firstName
        ? (user.firstName + " " + (user.lastName || "")).trim()
        : user?.fullName || user?.name || "User";

    const initial = (user?.firstName?.[0] || user?.fullName?.[0] || user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

    return (
        <AppLayout>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                .st-tab-btn {
                    padding: 10px 16px; background: none; border: none;
                    border-bottom: 2px solid transparent;
                    color: var(--text-muted); font-size: 13px; font-weight: 500;
                    cursor: pointer; margin-bottom: -1px; white-space: nowrap;
                    font-family: 'Inter', sans-serif; transition: color 0.2s, border-color 0.2s;
                }
                .st-tab-btn:hover { color: var(--text-secondary); }
                .st-tab-btn.active { color: #47bfff; border-bottom-color: #47bfff; font-weight: 600; }
                .st-primary-btn {
                    padding: 9px 18px;
                    background: linear-gradient(135deg, #47bfff, #4F46E5);
                    border: none; border-radius: 10px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity 0.2s, transform 0.2s;
                    box-shadow: 0 4px 12px rgba(79,70,229,0.3); white-space: nowrap;
                }
                .st-primary-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .st-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .st-input {
                    width: 100%; padding: 9px 12px;
                    background: var(--bg-input);
                    border: 1px solid var(--border-input);
                    border-radius: 8px; color: var(--text-secondary);
                    font-size: 13px; outline: none; box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                    transition: border-color 0.2s, background 0.2s;
                }
                .st-input:focus { border-color: rgba(71,191,255,0.4); background: var(--bg-hover); }
                .st-icon-btn {
                    background: none; border: none; cursor: pointer;
                    color: var(--text-muted); font-size: 12px; font-weight: 500;
                    padding: 5px 8px; border-radius: 7px;
                    font-family: 'Inter', sans-serif; transition: background 0.2s, color 0.2s;
                }
                .st-icon-btn:hover { background: var(--bg-hover); color: var(--text-secondary); }
                .st-icon-btn.warn { color: #f59e0b; }
                .st-icon-btn.warn:hover { background: rgba(245,158,11,0.1); }
                .st-icon-btn.success { color: #4ade80; }
                .st-icon-btn.success:hover { background: rgba(74,222,128,0.1); }
                .st-icon-btn.danger { color: #f87171; }
                .st-icon-btn.danger:hover { background: rgba(248,113,113,0.1); }
                .key-card {
                    background: var(--bg-input);
                    border: 1px solid var(--border);
                    border-radius: 12px; padding: 14px;
                    transition: border-color 0.2s;
                }
                .key-card:hover { border-color: var(--border-input); }
                .copy-btn {
                    padding: 5px 12px; background: var(--bg-input);
                    border: 1px solid var(--border);
                    border-radius: 7px; color: var(--text-secondary);
                    font-size: 11px; cursor: pointer;
                    font-family: 'Inter', sans-serif; transition: background 0.2s; flex-shrink: 0;
                }
                .copy-btn:hover { background: var(--bg-hover); }
                .toggle-row {
                    display: flex; align-items: center; gap: 16px;
                    padding: 16px 0; border-bottom: 1px solid var(--border); cursor: pointer;
                }
                .toggle-row:last-of-type { border-bottom: none; }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', maxWidth: 700, color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease both' }}>
                    <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Settings</h1>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Manage your account and preferences</p>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border)', overflowX: 'auto', flexWrap: 'nowrap', animation: 'fadeUp 0.35s ease both' }}>
                    {TABS.map((t) => (
                        <button key={t} className={`st-tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
                    ))}
                </div>

                {/* Profile tab */}
                {tab === "Profile" && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', animation: 'fadeUp 0.4s ease both' }}>
                        <div style={{ padding: '20px 20px 0' }}>
                            <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Profile Information</h2>
                        </div>
                        <div style={{ padding: '0 20px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#47bfff,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 16px rgba(79,70,229,0.35)' }}>
                                    {initial}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{displayName}</p>
                                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.email}</p>
                                </div>
                            </div>
                            <div style={{ height: 1, background: 'var(--divider)', marginBottom: 16 }} />
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                                <Field label="First Name"><input className="st-input" value={profile.firstName} onChange={setP("firstName")} /></Field>
                                <Field label="Last Name"><input className="st-input" value={profile.lastName} onChange={setP("lastName")} /></Field>
                            </div>
                            <div style={{ marginTop: 14 }}>
                                <Field label="Email Address"><input className="st-input" type="email" value={profile.email} onChange={setP("email")} /></Field>
                            </div>
                            <div style={{ marginTop: 14 }}>
                                <Field label="Phone Number">
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input className="st-input" style={{ flex: 1 }} type="tel" placeholder="+639xxxxxxxxx" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                                        <button className="st-primary-btn" style={{ opacity: phoneSaving ? 0.6 : 1 }} disabled={phoneSaving}
                                            onClick={async () => {
                                                setPhoneSaving(true); setPhoneError(''); setPhoneSuccess(false);
                                                try {
                                                    await client.patch(`/Users/${user?.id}/phone`, { phoneNumber });
                                                    setPhoneSuccess(true);
                                                    setTimeout(() => setPhoneSuccess(false), 3000);
                                                } catch { setPhoneError('Failed to save phone number'); }
                                                finally { setPhoneSaving(false); }
                                            }}>
                                            {phoneSaving ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </Field>
                                {phoneSuccess && <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8, color: '#4ade80', fontSize: 13 }}>Phone number saved</div>}
                                {phoneError && <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>{phoneError}</div>}
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '14px 0 0' }}>Profile editing coming soon via API.</p>
                        </div>
                    </div>
                )}

                {/* Security tab */}
                {tab === "Security" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.4s ease both' }}>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                            <div style={{ padding: '20px 20px 0' }}>
                                <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Change Password</h2>
                            </div>
                            <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <Field label="Current Password"><input className="st-input" type="password" value={pw.currentPassword} onChange={setPwF("currentPassword")} placeholder="••••••••" /></Field>
                                <Field label="New Password"><input className="st-input" type="password" value={pw.newPassword} onChange={setPwF("newPassword")} placeholder="Min 8 characters" /></Field>
                                <Field label="Confirm New Password"><input className="st-input" type="password" value={pw.confirm} onChange={setPwF("confirm")} placeholder="••••••••" /></Field>
                                {pwError && <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>{pwError}</div>}
                                {pwSuccess && <div style={{ padding: '10px 14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8, color: '#4ade80', fontSize: 13 }}>Password changed successfully</div>}
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button className="st-primary-btn" onClick={handleSavePw}>Update Password</button>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                            <div style={{ padding: '20px 20px 0' }}>
                                <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Active Sessions</h2>
                            </div>
                            <div style={{ padding: '16px 20px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Current session</p>
                                            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Web browser · {new Date().toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '3px 10px', borderRadius: 20 }}>Active</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                            <div style={{ padding: '20px 20px 0' }}>
                                <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Two-Factor Authentication</h2>
                                <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                    When enabled, signing in from a new device will require email verification.
                                </p>
                            </div>
                            <div style={{ padding: '0 20px 20px' }}>
                                <TwoFactorSection />
                            </div>
                        </div>
                    </div>
                )}

                {/* API Keys tab */}
                {tab === "API Keys" && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', animation: 'fadeUp 0.4s ease both' }}>
                        <div style={{ padding: '20px 20px 0' }}>
                            <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>API Keys</h2>
                        </div>
                        <div style={{ padding: '16px 20px 20px' }}>
                            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                Use API keys to authenticate requests. Include in headers as{' '}
                                <code style={{ background: 'var(--bg-input)', padding: '2px 7px', borderRadius: 5, fontSize: 12, color: '#47bfff', fontFamily: 'monospace' }}>X-API-Key: your_key</code>
                            </p>
                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, marginBottom: 16 }}>
                                <input className="st-input" style={{ flex: 1 }} placeholder="Key name e.g. My App, Postman" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                                <button className="st-primary-btn" disabled={createKey.isPending} onClick={() => createKey.mutate({ name: newKeyName || "Default" })}>
                                    {createKey.isPending ? "Generating..." : "+ Generate Key"}
                                </button>
                            </div>
                            <div style={{ height: 1, background: 'var(--divider)', marginBottom: 16 }} />
                            {keysLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
                            ) : apiKeys.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '24px 0', margin: 0 }}>No API keys yet — generate one above</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {apiKeys.map((key) => (
                                        <div key={key.id} className="key-card">
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{key.name}</span>
                                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0, ...(key.isActive ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80' } : { background: 'var(--bg-input)', color: 'var(--text-muted)' }) }}>
                                                        {key.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                                    <button className={`st-icon-btn ${key.isActive ? 'warn' : 'success'}`} onClick={() => toggleKey.mutate(key.id)}>
                                                        {key.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button className="st-icon-btn danger" onClick={() => { if (window.confirm('Revoke key ' + key.name + '?')) revokeKey.mutate(key.id); }}>Revoke</button>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <code style={{ flex: 1, fontSize: 12, color: '#47bfff', background: 'rgba(71,191,255,0.06)', padding: '7px 10px', borderRadius: 7, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px solid rgba(71,191,255,0.1)' }}>
                                                    {key.key.slice(0, 12)}{'•'.repeat(20)}
                                                </code>
                                                <button className="copy-btn" onClick={() => copyToClipboard(key.key, key.id)}>
                                                    {copiedId === key.id ? '✓ Copied' : 'Copy'}
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                                                {key.lastUsedAt && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Notifications tab */}
                {tab === "Notifications" && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', animation: 'fadeUp 0.4s ease both' }}>
                        <div style={{ padding: '20px 20px 0' }}>
                            <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications & Appearance</h2>
                            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>Manage your notification preferences and display settings.</p>
                        </div>
                        <div style={{ padding: '0 20px 20px' }}>
                            {/* Dark mode toggle */}
                            <div className="toggle-row" onClick={toggleTheme}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>Dark Mode</p>
                                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" }}>Switch between dark and light appearance</p>
                                </div>
                                <div style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', transition: 'background 0.25s', cursor: 'pointer', background: isDark ? 'linear-gradient(135deg,#47bfff,#4F46E5)' : 'rgba(0,0,0,0.15)', flexShrink: 0, boxShadow: isDark ? '0 2px 8px rgba(79,70,229,0.4)' : 'none' }}>
                                    <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'transform 0.25s cubic-bezier(0.32,0.72,0,1)', transform: isDark ? 'translateX(22px)' : 'translateX(3px)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                                </div>
                            </div>

                            {[
                                { key: "emailOnRoute", label: "Document routed to me", desc: "When a document is assigned to you for review" },
                                { key: "emailOnApproval", label: "Document approved", desc: "When a document you submitted is approved" },
                                { key: "emailOnReject", label: "Document rejected", desc: "When a document you submitted is rejected" },
                            ].map(({ key, label, desc }) => (
                                <div key={key} className="toggle-row" onClick={() => setNotifs((f) => ({ ...f, [key]: !f[key] }))}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>{label}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" }}>{desc}</p>
                                    </div>
                                    <div style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', transition: 'background 0.25s', cursor: 'pointer', background: notifs[key] ? 'linear-gradient(135deg,#47bfff,#4F46E5)' : 'rgba(255,255,255,0.1)', flexShrink: 0, boxShadow: notifs[key] ? '0 2px 8px rgba(79,70,229,0.4)' : 'none' }}>
                                        <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'transform 0.25s cubic-bezier(0.32,0.72,0,1)', transform: notifs[key] ? 'translateX(22px)' : 'translateX(3px)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                                    </div>
                                </div>
                            ))}
                            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="st-primary-btn">Save Preferences</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.05em', margin: '0 0 4px', display: 'block', fontFamily: "'Inter', sans-serif" }}>{label}</label>
            <div style={{ marginTop: 4 }}>{children}</div>
        </div>
    );
}

function Spinner() {
    return <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(71,191,255,0.15)', borderTopColor: '#47bfff', animation: 'dtSpin 0.8s linear infinite' }} />;
}