import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";

const fetchUsers = () => client.get("/Users").then((r) => r.data);
const fetchDepts = () => client.get("/Departments").then((r) => r.data);
const assignDept = ({ id, departmentId }) => client.patch("/Users/" + id + "/department", { departmentId }).then((r) => r.data);
const deleteUser = (id) => client.delete("/Users/" + id).then((r) => r.data);
const reactivateUser = (id) => client.patch("/Users/" + id + "/reactivate").then((r) => r.data);

const ROLES = ["Admin", "Staff", "Viewer"];

const roleStyle = (role) => ({
    Admin:  { badge: { bg: "var(--warning-bg)",      color: "var(--warning)" },  avatar: { bg: "rgba(245,158,11,0.18)",  color: "#f59e0b" } },
    Staff:  { badge: { bg: "rgba(71,191,255,0.12)",  color: "#47bfff" },          avatar: { bg: "rgba(71,191,255,0.18)",  color: "#47bfff" } },
    Viewer: { badge: { bg: "rgba(143,152,160,0.12)", color: "#8f98a0" },          avatar: { bg: "rgba(143,152,160,0.15)", color: "#8f98a0" } },
}[role] || { badge: { bg: "rgba(143,152,160,0.12)", color: "#8f98a0" }, avatar: { bg: "rgba(143,152,160,0.15)", color: "#8f98a0" } });

export default function Users() {
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [modal, setModal] = useState(false);
    const [selected, setSelected] = useState(null);
    const [deptId, setDeptId] = useState("");
    const [search, setSearch] = useState("");
    const [roleFilter, setRF] = useState("All");

    const { data: users = [], isLoading } = useQuery({ queryKey: ["users"],       queryFn: fetchUsers });
    const { data: depts = [] }             = useQuery({ queryKey: ["departments"], queryFn: fetchDepts });

    const reactivate = useMutation({
        mutationFn: reactivateUser,
        onSuccess: () => qc.invalidateQueries(["users"]),
    });
    const assign = useMutation({
        mutationFn: assignDept,
        onSuccess: () => { qc.invalidateQueries(["users"]); setModal(false); },
    });
    const remove = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => qc.invalidateQueries(["users"]),
    });

    const openAssign = (u) => { setSelected(u); setDeptId(u.departmentId || ""); setModal(true); };
    const deptName   = (id) => depts.find((d) => d.id === id)?.name || "—";

    const filtered = users.filter((u) => {
        const name = ((u.firstName || "") + " " + (u.lastName || "") + " " + (u.fullName || "") + " " + (u.email || "")).toLowerCase();
        return name.includes(search.toLowerCase()) && (roleFilter === "All" || u.role === roleFilter);
    });

    const displayName = (u) => {
        if (u.firstName || u.lastName) return (u.firstName + " " + u.lastName).trim();
        return u.fullName || u.email || "Unknown";
    };
    const displayInitial = (u) =>
        (u.firstName?.[0] || u.fullName?.[0] || u.email?.[0] || "?").toUpperCase();

    return (
        <AppLayout>
            <style>{`
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                .us-search {
                    padding: 9px 14px 9px 38px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; outline: none;
                    font-family: 'Inter', sans-serif;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
                    box-sizing: border-box;
                }
                .us-search:focus { border-color: var(--accent-from); box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
                .us-search::placeholder { color: var(--text-tertiary); }
                .role-filter-btn {
                    padding: 6px 12px; background: transparent;
                    border: 1px solid var(--border-subtle);
                    border-radius: 8px; color: var(--text-tertiary);
                    font-size: 12px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: all var(--duration-fast); white-space: nowrap;
                }
                .role-filter-btn:hover { background: var(--bg-card-hover); color: var(--text-secondary); }
                .role-filter-btn.active { background: rgba(79,70,229,0.18); border-color: rgba(79,70,229,0.45); color: #818cf8; }
                .user-card {
                    background: rgba(255,255,255,0.06);
                    backdrop-filter: blur(24px) saturate(180%);
                    -webkit-backdrop-filter: blur(24px) saturate(180%);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 20px; overflow: hidden;
                    box-shadow: 0 8px 40px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.08) inset;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast), transform var(--duration-fast);
                    animation: fadeUp 0.4s ease both;
                    display: flex; flex-direction: column;
                }
                .user-card:hover { border-color: rgba(255,255,255,0.20); box-shadow: 0 14px 48px rgba(0,0,0,0.50), 0 1px 0 rgba(255,255,255,0.12) inset; transform: translateY(-2px); }
                .action-icon-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 32px; height: 32px; border-radius: 50%;
                    background: none; border: 1px solid var(--border-subtle);
                    cursor: pointer; color: var(--text-tertiary);
                    transition: background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast);
                    flex-shrink: 0;
                }
                .action-icon-btn:hover { background: var(--bg-card-hover); color: var(--text-secondary); border-color: var(--border-default); }
                .action-icon-btn.danger:hover   { background: var(--danger-bg);  color: var(--danger);  border-color: rgba(248,113,113,0.3); }
                .action-icon-btn.success:hover  { background: var(--success-bg); color: var(--success); border-color: rgba(52,211,153,0.3); }
                .modal-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 100; padding: 20px;
                }
                .modal-box {
                    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
                    border-radius: 16px; width: 100%; max-width: 480px; max-height: 90vh;
                    display: flex; flex-direction: column;
                    box-shadow: var(--shadow-lg); animation: scaleIn 0.2s var(--ease-out) both;
                }
                .modal-close-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 28px; height: 28px; border-radius: 50%;
                    background: var(--bg-card); border: 1px solid var(--border-subtle);
                    color: var(--text-tertiary); cursor: pointer;
                    transition: background var(--duration-fast), color var(--duration-fast);
                }
                .modal-close-btn:hover { background: var(--bg-card-hover); color: var(--text-secondary); }
                .us-ghost-btn {
                    height: 40px; padding: 0 16px; background: transparent;
                    border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: background var(--duration-fast), color var(--duration-fast);
                }
                .us-ghost-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
                .us-input {
                    width: 100%; height: 40px; padding: 0 12px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 14px; outline: none; box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
                }
                .us-input:focus { border-color: var(--accent-from); box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
                select.us-input { cursor: pointer; }
                .modal-submit-btn {
                    height: 40px; border: none; border-radius: 10px; color: #fff;
                    background: var(--accent-gradient);
                    font-size: 14px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity var(--duration-base), transform var(--duration-base);
                    box-shadow: var(--shadow-accent);
                }
                .modal-submit-btn:hover { opacity: 0.88; transform: translateY(-1px); }
                .modal-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 24, animation: 'fadeUp 0.3s ease both' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Users</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>{users.length} registered users</p>
                    </div>
                </div>

                {/* Filter bar */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 20, animation: 'fadeUp 0.35s ease both' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : 320 }}>
                        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </span>
                        <input className="us-search" style={{ width: '100%' }} placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {["All", ...ROLES].map((r) => (
                            <button key={r} className={`role-filter-btn${roleFilter === r ? ' active' : ''}`} onClick={() => setRF(r)}>{r}</button>
                        ))}
                    </div>
                </div>

                {/* Card grid */}
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                ) : filtered.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 64, background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-subtle)', gap: 8 }}>
                        <div style={{ opacity: 0.3 }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                        </div>
                        <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 13 }}>No users found</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                        gap: 16,
                        animation: 'fadeUp 0.4s ease both',
                    }}>
                        {filtered.map((u, i) => {
                            const rs = roleStyle(u.role);
                            const inactive = !u.isActive;
                            return (
                                <div key={u.id} className="user-card" style={{ animationDelay: `${i * 0.04}s`, opacity: inactive ? 0.5 : 1 }}>
                                    {/* Card body */}
                                    <div style={{ padding: '20px 20px 16px', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                            {/* Avatar */}
                                            <div style={{
                                                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                                                background: rs.avatar.bg, color: rs.avatar.color,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 18, fontWeight: 700,
                                            }}>
                                                {displayInitial(u)}
                                            </div>
                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {displayName(u)}
                                                    </span>
                                                    {inactive && (
                                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'var(--danger-bg)', color: 'var(--danger)', flexShrink: 0 }}>
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 10 }}>
                                                    {u.email}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: rs.badge.bg, color: rs.badge.color }}>
                                                        {u.role || 'Staff'}
                                                    </span>
                                                    {u.departmentId && (
                                                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                                            {deptName(u.departmentId)}
                                                        </span>
                                                    )}
                                                    {!u.departmentId && (
                                                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>No department</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Card footer */}
                                    <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                        <button className="action-icon-btn" title="Assign department" onClick={() => openAssign(u)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
                                        </button>
                                        {u.isActive ? (
                                            <button className="action-icon-btn danger" title="Deactivate user" onClick={() => { if (window.confirm('Deactivate ' + displayName(u) + '? They will no longer be able to log in.')) remove.mutate(u.id); }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                                            </button>
                                        ) : (
                                            <button className="action-icon-btn success" title="Reactivate user" onClick={() => { if (window.confirm('Reactivate ' + displayName(u) + '?')) reactivate.mutate(u.id); }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Assign dept modal */}
            {modal && selected && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                {(() => { const rs = roleStyle(selected.role); return (
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: rs.avatar.bg, color: rs.avatar.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                                        {displayInitial(selected)}
                                    </div>
                                ); })()}
                                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {displayName(selected)}
                                </h2>
                            </div>
                            <button className="modal-close-btn" onClick={() => setModal(false)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <Field label="Assign Department">
                                <select className="us-input" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                                    <option value="">Unassigned</option>
                                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </Field>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button className="us-ghost-btn" onClick={() => setModal(false)}>Cancel</button>
                                <button className="modal-submit-btn" style={{ flex: 1 }} disabled={assign.isPending} onClick={() => assign.mutate({ id: selected.id, departmentId: deptId || null })}>
                                    {assign.isPending ? 'Saving…' : 'Save Assignment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
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
