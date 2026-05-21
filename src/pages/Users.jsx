import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";

const fetchUsers = () => client.get("/Users").then((r) => r.data);
const fetchDepts = () => client.get("/Departments").then((r) => r.data);
const assignDept = ({ id, departmentId }) => client.patch("/Users/" + id + "/department", { departmentId }).then((r) => r.data);
const deleteUser = (id) => client.delete("/Users/" + id).then((r) => r.data);

const ROLES = ["Admin", "Staff", "Viewer"];

export default function Users() {
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [modal, setModal] = useState(false);
    const [selected, setSelected] = useState(null);
    const [deptId, setDeptId] = useState("");
    const [search, setSearch] = useState("");
    const [roleFilter, setRF] = useState("All");

    const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
    const { data: depts = [] } = useQuery({ queryKey: ["departments"], queryFn: fetchDepts });

    const assign = useMutation({
        mutationFn: assignDept,
        onSuccess: () => { qc.invalidateQueries(["users"]); setModal(false); },
    });
    const remove = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => qc.invalidateQueries(["users"]),
    });

    const openAssign = (u) => { setSelected(u); setDeptId(u.departmentId || ""); setModal(true); };
    const deptName = (id) => depts.find((d) => d.id === id)?.name || "—";

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

    const roleStyle = (role) => ({
        Admin: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
        Staff: { bg: "rgba(71,191,255,0.12)", color: "#47bfff" },
        Viewer: { bg: "rgba(255,255,255,0.06)", color: "#8f98a0" },
    }[role] || { bg: "rgba(255,255,255,0.06)", color: "#8f98a0" });

    return (
        <AppLayout>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                .us-primary-btn {
                    padding: 9px 18px;
                    background: linear-gradient(135deg, #47bfff, #4F46E5);
                    border: none; border-radius: 10px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity 0.2s, transform 0.2s;
                    box-shadow: 0 4px 12px rgba(79,70,229,0.3);
                }
                .us-primary-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .us-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .us-ghost-btn {
                    padding: 9px 18px;
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 10px; color: #8f98a0;
                    font-size: 13px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s, color 0.2s;
                }
                .us-ghost-btn:hover { background: rgba(255,255,255,0.06); color: #c6d4df; }
                .us-search {
                    padding: 9px 14px 9px 38px;
                    background: var(--bg-input);
                    border: 1px solid var(--border);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; outline: none;
                    font-family: 'Inter', sans-serif;
                    transition: border-color 0.2s, background 0.2s;
                    box-sizing: border-box;
                }
                .us-search:focus { border-color: rgba(71,191,255,0.4); background: var(--bg-hover); }
                .us-search::placeholder { color: var(--text-accent); }
                .role-filter-btn {
                    padding: 6px 12px; background: transparent;
                    border: 1px solid var(--border);
                    border-radius: 8px; color: var(--text-muted);
                    font-size: 12px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: all 0.2s; white-space: nowrap;
                }
                .role-filter-btn:hover { background: var(--bg-hover); color: var(--text-secondary); }
                .role-filter-btn.active { background: rgba(79,70,229,0.2); border-color: rgba(79,70,229,0.5); color: #818cf8; }
                .us-row { border-bottom: 1px solid var(--border); transition: background 0.15s; }
                .us-row:hover { background: var(--bg-hover); }
                .us-row:last-child { border-bottom: none; }
                .us-icon-btn {
                    background: none; border: none; cursor: pointer;
                    color: var(--text-muted); font-size: 12px; font-weight: 500;
                    padding: 5px 9px; border-radius: 7px;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s, color 0.2s;
                }
                .us-icon-btn:hover { background: var(--bg-hover); color: var(--text-secondary); }
                .us-icon-btn.danger:hover { background: rgba(248,113,113,0.1); color: #f87171; }
                .user-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 14px; overflow: hidden;
                    transition: border-color 0.2s;
                    animation: fadeUp 0.4s ease both;
                }
                .user-card:hover { border-color: var(--border-input); }
                .us-ghost-btn {
                    padding: 9px 18px; background: transparent;
                    border: 1px solid var(--border-input);
                    border-radius: 10px; color: var(--text-muted);
                    font-size: 13px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s, color 0.2s;
                }
                .us-ghost-btn:hover { background: var(--bg-hover); color: var(--text-secondary); }
                .modal-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 100; padding: 20px;
                }
                .modal-box {
                    background: var(--modal-bg);
                    border: 1px solid var(--border);
                    border-radius: 16px; width: 100%;
                    max-width: 400px; max-height: 90vh;
                    display: flex; flex-direction: column;
                    box-shadow: 0 24px 48px rgba(0,0,0,0.4);
                    animation: fadeUp 0.2s ease;
                }
                .modal-close-btn {
                    background: var(--bg-input); border: none;
                    color: var(--text-muted); width: 28px; height: 28px;
                    border-radius: 50%; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 14px; transition: background 0.2s, color 0.2s;
                }
                .modal-close-btn:hover { background: var(--bg-hover); color: var(--text-secondary); }
                .us-input {
                    width: 100%; padding: 9px 12px;
                    background: var(--bg-input);
                    border: 1px solid var(--border-input);
                    border-radius: 8px; color: var(--text-secondary);
                    font-size: 13px; outline: none; box-sizing: border-box;
                    font-family: 'Inter', sans-serif; transition: border-color 0.2s;
                }
                .us-input:focus { border-color: rgba(71,191,255,0.4); }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease both' }}>
                    <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Users</h1>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{users.length} registered users</p>
                </div>

                {/* Filter bar */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 20, animation: 'fadeUp 0.35s ease both' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : 320 }}>
                        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4a7fa5', pointerEvents: 'none' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        </span>
                        <input className="us-search" style={{ width: '100%' }} placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {["All", ...ROLES].map((r) => (
                            <button key={r} className={`role-filter-btn${roleFilter === r ? ' active' : ''}`} onClick={() => setRF(r)}>{r}</button>
                        ))}
                    </div>
                </div>

                {/* Mobile card view */}
                {isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                        ) : filtered.length === 0 ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                                <p style={{ color: '#8f98a0', margin: 0 }}>No users found</p>
                            </div>
                        ) : filtered.map((u, i) => {
                            const rs = roleStyle(u.role);
                            return (
                                <div key={u.id} className="user-card" style={{ animationDelay: `${i * 0.05}s` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#47bfff,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
                                                {displayInitial(u)}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#e8edf2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(u)}</div>
                                                <div style={{ fontSize: 11, color: '#8f98a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: rs.bg, color: rs.color, flexShrink: 0 }}>
                                            {u.role || 'Staff'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-deep)' }}>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{deptName(u.departmentId)}</span>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="us-icon-btn" onClick={() => openAssign(u)}>Assign Dept</button>
                                            <button className="us-icon-btn danger" onClick={() => { if (window.confirm('Remove user ' + displayName(u) + '?')) remove.mutate(u.id); }}>Remove</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // Desktop table view
                        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', animation: 'fadeUp 0.4s ease both' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                        ) : filtered.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, gap: 8 }}>
                                        <div style={{ fontSize: 28, opacity: 0.3 }}>👥</div>
                                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>No users found</p>
                                    </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                                    <tr style={{ background: 'var(--table-head)' }}>
                                                        {['User', 'Email', 'Role', 'Department', ''].map((h) => (
                                                            <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((u, i) => {
                                            const rs = roleStyle(u.role);
                                            return (
                                                <tr key={u.id} className="us-row" style={{ animationDelay: `${i * 0.03}s` }}>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#47bfff,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 6px rgba(79,70,229,0.25)' }}>
                                                                {displayInitial(u)}
                                                            </div>
                                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{displayName(u)}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: rs.bg, color: rs.color }}>
                                                            {u.role || 'Staff'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12 }}>{deptName(u.departmentId)}</td>
                                                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                        <button className="us-icon-btn" onClick={() => openAssign(u)}>Assign Dept</button>
                                                        <button className="us-icon-btn danger" onClick={() => { if (window.confirm('Remove user ' + displayName(u) + '?')) remove.mutate(u.id); }}>Remove</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Assign dept modal */}
            {modal && selected && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#47bfff,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                    {displayInitial(selected)}
                                </div>
                                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e8edf2', fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {displayName(selected)}
                                </h2>
                            </div>
                            <button className="modal-close-btn" onClick={() => setModal(false)}>✕</button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: "'Inter', sans-serif" }}>
                            <Field label="Assign Department">
                                <select className="us-input" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                                    <option value="">Unassigned</option>
                                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </Field>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button className="us-ghost-btn" onClick={() => setModal(false)}>Cancel</button>
                                <button className="us-primary-btn" disabled={assign.isPending} onClick={() => assign.mutate({ id: selected.id, departmentId: deptId || null })}>
                                    {assign.isPending ? 'Saving...' : 'Save'}
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
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.05em', margin: '0 0 4px', display: 'block', fontFamily: "'Inter', sans-serif" }}>{label}</label>
            <div style={{ marginTop: 4 }}>{children}</div>
        </div>
    );
}

function Spinner() {
    return <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(71,191,255,0.15)', borderTopColor: '#47bfff', animation: 'dtSpin 0.8s linear infinite' }} />;
}