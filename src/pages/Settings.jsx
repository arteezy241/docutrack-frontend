import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import useAuthStore from "../store/authStore";
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
            } catch {
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
            setDevices(d => d.filter(dev => dev.id !== id));
        } catch {
            alert("Failed to remove device");
        }
    };

    if (loading) return <p style={{ color: "#8f98a0", fontSize: 13 }}>Loading...</p>;

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div
                    onClick={toggle}
                    style={{ width: 40, height: 22, borderRadius: 11, position: "relative", transition: "background 0.2s", cursor: "pointer", background: enabled ? "#4F46E5" : "rgba(255,255,255,0.12)" }}
                >
                    <div style={{ position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "transform 0.2s", transform: enabled ? "translateX(18px)" : "translateX(2px)" }} />
                </div>
                <span style={{ fontSize: 13, color: "#c6d4df", fontWeight: 600 }}>
                    {enabled ? "2FA Enabled" : "2FA Disabled"}
                </span>
            </div>

            {devices.length > 0 && (
                <div>
                    <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#4a7fa5", letterSpacing: "0.05em" }}>TRUSTED DEVICES</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {devices.map((dev) => (
                            <div key={dev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#0e1621", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)" }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: 12, color: "#c6d4df", fontWeight: 500 }}>
                                        {dev.deviceName?.slice(0, 60) || "Unknown Device"}
                                    </p>
                                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8f98a0" }}>
                                        Last used: {new Date(dev.lastUsedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeDevice(dev.id)}
                                    style={{ background: "none", border: "none", color: "#c94040", fontSize: 12, cursor: "pointer" }}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {devices.length === 0 && (
                <p style={{ fontSize: 12, color: "#8f98a0", margin: 0 }}>
                    No trusted devices yet. Devices will appear here after verifying a new device login.
                </p>
            )}
        </div>
    );
}

export default function Settings() {
    const { user } = useAuthStore();
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [tab, setTab] = useState("Profile");
    const [profile, setProfile] = useState({
        firstName: user?.firstName || user?.name?.split(" ")[0] || "",
        lastName: user?.lastName || user?.name?.split(" ")[1] || "",
        email: user?.email || "",
    });
    const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
    const [pwError, setPwError] = useState("");
    const [pwSuccess, setPwSuccess] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [copiedId, setCopiedId] = useState(null);
    const [notifs, setNotifs] = useState({
        emailOnRoute: true,
        emailOnApproval: true,
        emailOnReject: false,
    });

    const { data: apiKeys = [], isLoading: keysLoading } = useQuery({
        queryKey: ["apikeys"],
        queryFn: fetchApiKeys,
        enabled: tab === "API Keys",
    });

    const createKey = useMutation({
        mutationFn: createApiKey,
        onSuccess: () => { qc.invalidateQueries(["apikeys"]); setNewKeyName(""); },
    });
    const revokeKey = useMutation({
        mutationFn: revokeApiKey,
        onSuccess: () => qc.invalidateQueries(["apikeys"]),
    });
    const toggleKey = useMutation({
        mutationFn: toggleApiKey,
        onSuccess: () => qc.invalidateQueries(["apikeys"]),
    });

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
            <div style={{ ...s.page, maxWidth: isMobile ? "100%" : 680 }}>
                <div style={s.pageHeader}>
                    <h1 style={s.pageTitle}>Settings</h1>
                    <p style={s.pageSub}>Manage your account and preferences</p>
                </div>

                <div style={s.tabBar}>
                    {TABS.map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{ ...s.tabBtn, ...(tab === t ? s.tabBtnActive : {}) }}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Profile tab */}
                {tab === "Profile" && (
                    <div style={s.card}>
                        <h2 style={s.cardTitle}>Profile Information</h2>
                        <div style={s.cardBody}>
                            <div style={s.avatarSection}>
                                <div style={s.bigAvatar}>{initial}</div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "#c6d4df" }}>{displayName}</p>
                                    <p style={{ margin: 0, fontSize: 12, color: "#8f98a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.email}</p>
                                </div>
                            </div>
                            <div style={s.divider} />
                            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginTop: 16 }}>
                                <Field label="First Name">
                                    <input style={s.input} value={profile.firstName} onChange={setP("firstName")} />
                                </Field>
                                <Field label="Last Name">
                                    <input style={s.input} value={profile.lastName} onChange={setP("lastName")} />
                                </Field>
                            </div>
                            <div style={{ marginTop: 14 }}>
                                <Field label="Email Address">
                                    <input style={s.input} type="email" value={profile.email} onChange={setP("email")} />
                                </Field>
                            </div>
                            <p style={{ color: "#8f98a0", fontSize: 12, marginTop: 12 }}>Profile editing coming soon via API.</p>
                        </div>
                    </div>
                )}

                {/* Security tab */}
                {tab === "Security" && (
                    <div style={s.card}>
                        <h2 style={s.cardTitle}>Change Password</h2>
                        <div style={s.cardBody}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <Field label="Current Password">
                                    <input style={s.input} type="password" value={pw.currentPassword} onChange={setPwF("currentPassword")} placeholder="••••••••" />
                                </Field>
                                <Field label="New Password">
                                    <input style={s.input} type="password" value={pw.newPassword} onChange={setPwF("newPassword")} placeholder="Min 8 characters" />
                                </Field>
                                <Field label="Confirm New Password">
                                    <input style={s.input} type="password" value={pw.confirm} onChange={setPwF("confirm")} placeholder="••••••••" />
                                </Field>
                            </div>
                            {pwError && <div style={{ ...s.errorBox, marginTop: 14 }}>{pwError}</div>}
                            {pwSuccess && <div style={{ ...s.successBox, marginTop: 14 }}>Password changed successfully</div>}
                            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                                <button style={s.primaryBtn} onClick={handleSavePw}>Update Password</button>
                            </div>
                        </div>

                        <div style={s.divider} />
                        <div style={s.cardBody}>
                            <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#c6d4df" }}>Active Sessions</h3>
                            <div style={s.sessionRow}>
                                <div>
                                    <p style={{ margin: 0, fontSize: 13, color: "#c6d4df", fontWeight: 600 }}>Current session</p>
                                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8f98a0" }}>Web browser · {new Date().toLocaleDateString()}</p>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#4ade80", background: "rgba(74,222,128,0.1)", padding: "2px 8px", borderRadius: 3 }}>Active</span>
                            </div>
                        </div>

                        <div style={s.divider} />
                        <div style={s.cardBody}>
                            <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#c6d4df" }}>
                                Two-Factor Authentication
                            </h3>
                            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8f98a0" }}>
                                When enabled, signing in from a new device will require email verification.
                            </p>
                            <TwoFactorSection />
                        </div>
                    </div>
                )}

                {/* API Keys tab */}
                {tab === "API Keys" && (
                    <div style={s.card}>
                        <h2 style={s.cardTitle}>API Keys</h2>
                        <div style={s.cardBody}>
                            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8f98a0", lineHeight: 1.6 }}>
                                Use API keys to authenticate requests. Include in headers as{" "}
                                <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>X-API-Key: your_key</code>
                            </p>
                            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, marginBottom: 16 }}>
                                <input
                                    style={{ ...s.input, flex: 1 }}
                                    placeholder="Key name e.g. My App, Postman"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                />
                                <button
                                    style={{ ...s.primaryBtn, whiteSpace: "nowrap" }}
                                    disabled={createKey.isPending}
                                    onClick={() => createKey.mutate({ name: newKeyName || "Default" })}
                                >
                                    {createKey.isPending ? "Generating..." : "+ Generate Key"}
                                </button>
                            </div>
                            <div style={s.divider} />
                            {keysLoading ? (
                                <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Spinner /></div>
                            ) : apiKeys.length === 0 ? (
                                <p style={{ color: "#8f98a0", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                                    No API keys yet — generate one above
                                </p>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
                                    {apiKeys.map((key) => (
                                        <div key={key.id} style={s.keyCard}>
                                            <div style={s.keyTop}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#c6d4df", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {key.name}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0,
                                                        ...(key.isActive
                                                            ? { background: "rgba(74,222,128,0.12)", color: "#4ade80" }
                                                            : { background: "rgba(255,255,255,0.06)", color: "#8f98a0" })
                                                    }}>
                                                        {key.isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                                    <button style={{ ...s.iconBtn, color: key.isActive ? "#f59e0b" : "#4ade80" }} onClick={() => toggleKey.mutate(key.id)}>
                                                        {key.isActive ? "Deactivate" : "Activate"}
                                                    </button>
                                                    <button style={{ ...s.iconBtn, color: "#c94040" }} onClick={() => { if (window.confirm("Revoke key " + key.name + "?")) revokeKey.mutate(key.id); }}>
                                                        Revoke
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={s.keyValueRow}>
                                                <code style={s.keyCode}>{key.key.slice(0, 12)}{"•".repeat(20)}</code>
                                                <button style={s.copyBtn} onClick={() => copyToClipboard(key.key, key.id)}>
                                                    {copiedId === key.id ? "Copied!" : "Copy"}
                                                </button>
                                            </div>
                                            <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
                                                <span style={{ fontSize: 11, color: "#8f98a0" }}>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                                                {key.lastUsedAt && (
                                                    <span style={{ fontSize: 11, color: "#8f98a0" }}>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                                                )}
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
                    <div style={s.card}>
                        <h2 style={s.cardTitle}>Email Notifications</h2>
                        <div style={s.cardBody}>
                            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#8f98a0" }}>
                                Choose when you receive email notifications from DocuTrack.
                            </p>
                            {[
                                { key: "emailOnRoute", label: "Document routed to me", desc: "When a document is assigned to you for review" },
                                { key: "emailOnApproval", label: "Document approved", desc: "When a document you submitted is approved" },
                                { key: "emailOnReject", label: "Document rejected", desc: "When a document you submitted is rejected" },
                            ].map(({ key, label, desc }) => (
                                <label key={key} style={s.toggleRow}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#c6d4df" }}>{label}</p>
                                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8f98a0" }}>{desc}</p>
                                    </div>
                                    <div
                                        style={{ ...s.toggle, ...(notifs[key] ? s.toggleOn : s.toggleOff), flexShrink: 0 }}
                                        onClick={() => setNotifs((f) => ({ ...f, [key]: !f[key] }))}
                                    >
                                        <div style={{ ...s.toggleThumb, transform: notifs[key] ? "translateX(18px)" : "translateX(2px)" }} />
                                    </div>
                                </label>
                            ))}
                            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                                <button style={s.primaryBtn}>Save Preferences</button>
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
            <label style={s.fieldLabel}>{label}</label>
            <div style={{ marginTop: 4 }}>{children}</div>
        </div>
    );
}

function Spinner() {
    return <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(71,191,255,0.2)", borderTopColor: "#47bfff", animation: "dtSpin 0.8s linear infinite" }} />;
}

const s = {
    page: { padding: "24px 16px", color: "#c6d4df", fontFamily: "'Segoe UI',sans-serif" },
    pageHeader: { marginBottom: 24 },
    pageTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: "#c6d4df" },
    pageSub: { margin: "4px 0 0", fontSize: 12, color: "#8f98a0" },
    tabBar: { display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.07)", overflowX: "auto", flexWrap: "nowrap" },
    tabBtn: { padding: "10px 14px", background: "none", border: "none", borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: "transparent", color: "#8f98a0", fontSize: 13, cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap" },
    tabBtnActive: { color: "#47bfff", borderBottomColor: "#47bfff" },
    card: { background: "#171a21", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, overflow: "hidden" },
    cardTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: "#c6d4df", padding: "18px 20px 0" },
    cardBody: { padding: 20 },
    divider: { height: 1, background: "rgba(255,255,255,0.07)" },
    avatarSection: { display: "flex", alignItems: "center", gap: 16, marginBottom: 20 },
    bigAvatar: { width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#47bfff,#4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 700, flexShrink: 0 },
    fieldLabel: { fontSize: 11, fontWeight: 700, color: "#4a7fa5", letterSpacing: "0.05em", margin: 0 },
    input: { width: "100%", padding: "9px 12px", background: "#0e1621", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#c6d4df", fontSize: 13, outline: "none", boxSizing: "border-box" },
    successBox: { padding: "10px 14px", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 4, color: "#4ade80", fontSize: 13 },
    errorBox: { padding: "10px 14px", background: "rgba(201,64,64,0.1)", border: "1px solid rgba(201,64,64,0.25)", borderRadius: 4, color: "#c94040", fontSize: 13 },
    sessionRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", gap: 8 },
    keyCard: { background: "#0e1621", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: 14 },
    keyTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 },
    keyValueRow: { display: "flex", alignItems: "center", gap: 8 },
    keyCode: { flex: 1, fontSize: 12, color: "#47bfff", background: "rgba(71,191,255,0.06)", padding: "6px 10px", borderRadius: 4, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    copyBtn: { padding: "5px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#c6d4df", fontSize: 11, cursor: "pointer", flexShrink: 0 },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "#8f98a0", fontSize: 12, padding: "4px 6px", borderRadius: 3 },
    toggleRow: { display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" },
    toggle: { width: 40, height: 22, borderRadius: 11, position: "relative", transition: "background 0.2s", cursor: "pointer" },
    toggleOn: { background: "#4F46E5" },
    toggleOff: { background: "rgba(255,255,255,0.12)" },
    toggleThumb: { position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "transform 0.2s" },
    primaryBtn: { padding: "9px 18px", background: "linear-gradient(to bottom,#47bfff 5%,#1a44c2 95%)", border: "none", borderRadius: 3, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};