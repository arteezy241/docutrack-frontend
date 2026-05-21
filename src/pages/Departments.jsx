import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";

const fetchDepts = () => client.get("/Departments").then((r) => r.data);
const fetchUsers = () => client.get("/Users").then((r) => r.data);
const createDept = (body) => client.post("/Departments", body).then((r) => r.data);
const deleteDept = (id) => client.delete("/Departments/" + id).then((r) => r.data);

const EMPTY = { name: "", description: "" };

export default function Departments() {
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [expanded, setExpanded] = useState(null);
    const [search, setSearch] = useState("");

    const { data: depts = [], isLoading } = useQuery({ queryKey: ["departments"], queryFn: fetchDepts });
    const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

    const create = useMutation({
        mutationFn: createDept,
        onSuccess: () => { qc.invalidateQueries(["departments"]); setModal(false); setForm(EMPTY); },
    });
    const remove = useMutation({
        mutationFn: deleteDept,
        onSuccess: () => qc.invalidateQueries(["departments"]),
    });

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const membersOf = (deptId) => users.filter((u) => u.departmentId === deptId);

    const filtered = depts.filter((d) =>
        (d.name?.toLowerCase().includes(search.toLowerCase())) ||
        (d.description?.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <AppLayout>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
                .dp-primary-btn {
                    padding: 9px 18px;
                    background: linear-gradient(135deg, #47bfff, #4F46E5);
                    border: none; border-radius: 10px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity 0.2s, transform 0.2s;
                    box-shadow: 0 4px 12px rgba(79,70,229,0.3);
                    white-space: nowrap;
                }
                .dp-primary-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .dp-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .dp-ghost-btn {
                    padding: 9px 18px;
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 10px; color: #8f98a0;
                    font-size: 13px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s, color 0.2s;
                }
                .dp-ghost-btn:hover { background: rgba(255,255,255,0.06); color: #c6d4df; }
                .dp-search {
                    padding: 9px 14px 9px 38px;
                    background: var(--bg-input);
                    border: 1px solid var(--border);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; outline: none;
                    font-family: 'Inter', sans-serif;
                    transition: border-color 0.2s, background 0.2s;
                    box-sizing: border-box; width: 100%;
                }
                .dp-search:focus { border-color: rgba(71,191,255,0.4); background: var(--bg-hover); }
                .dp-search::placeholder { color: var(--text-accent); }
                .dp-ghost-btn {
                    padding: 9px 18px; background: transparent;
                    border: 1px solid var(--border-input);
                    border-radius: 10px; color: var(--text-muted);
                    font-size: 13px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s, color 0.2s;
                }
                .dp-ghost-btn:hover { background: var(--bg-hover); color: var(--text-secondary); }
                .dept-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px; overflow: hidden;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    animation: fadeUp 0.4s ease both;
                }
                .dept-card:hover { border-color: var(--border-input); }
                .expand-btn {
                    background: var(--bg-input);
                    border: 1px solid var(--border);
                    cursor: pointer; color: var(--text-accent);
                    width: 28px; height: 28px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 11px; transition: background 0.2s, color 0.2s; flex-shrink: 0;
                }
                .expand-btn:hover { background: rgba(71,191,255,0.1); color: #47bfff; }
                .delete-dept-btn {
                    background: none; border: none; cursor: pointer;
                    color: var(--text-muted); font-size: 12px; font-weight: 500;
                    padding: 5px 10px; border-radius: 8px;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s, color 0.2s;
                }
                .delete-dept-btn:hover { background: rgba(248,113,113,0.1); color: #f87171; }
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
                    max-width: 440px; max-height: 90vh;
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
                .dp-input {
                    width: 100%; padding: 9px 12px;
                    background: var(--bg-input);
                    border: 1px solid var(--border-input);
                    border-radius: 8px; color: var(--text-secondary);
                    font-size: 13px; outline: none; box-sizing: border-box;
                    font-family: 'Inter', sans-serif; transition: border-color 0.2s;
                }
                .dp-input:focus { border-color: rgba(71,191,255,0.4); }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 24, animation: 'fadeUp 0.3s ease both' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Departments</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{depts.length} departments · {users.length} total users</p>
                    </div>
                    <button className="dp-primary-btn" onClick={() => { setForm(EMPTY); setModal(true); }}>
                        + New Department
                    </button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 20, animation: 'fadeUp 0.35s ease both' }}>
                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4a7fa5', pointerEvents: 'none' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </span>
                    <input className="dp-search" placeholder="Search departments..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                ) : filtered.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 64, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', gap: 12 }}>
                            <div style={{ fontSize: 32, opacity: 0.3 }}>🏢</div>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>No departments found</p>
                            <button className="dp-primary-btn" onClick={() => setModal(true)}>Create one</button>
                        </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.map((dept, i) => {
                            const members = membersOf(dept.id);
                            const isExpanded = expanded === dept.id;
                            return (
                                <div key={dept.id} className="dept-card" style={{ animationDelay: `${i * 0.06}s` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, rgba(71,191,255,0.15), rgba(79,70,229,0.15))', border: '1px solid rgba(71,191,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                                                🏢
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</div>
                                                {dept.description && (
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.description}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-accent)', padding: '3px 9px', background: 'rgba(74,127,165,0.12)', borderRadius: 20, whiteSpace: 'nowrap' }}>
                                                {members.length} member{members.length !== 1 ? 's' : ''}
                                            </span>
                                            <button className="delete-dept-btn" onClick={() => { if (window.confirm('Delete ' + dept.name + '?')) remove.mutate(dept.id); }}>
                                                Delete
                                            </button>
                                            <button className="expand-btn" onClick={() => setExpanded(isExpanded ? null : dept.id)}>
                                                {isExpanded ? '▲' : '▼'}
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="member-list" style={{ borderTop: '1px solid var(--border)', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-deep)' }}>
                                            {members.length === 0 ? (
                                                <p style={{ color: '#8f98a0', fontSize: 13, margin: 0, textAlign: 'center', padding: '8px 0' }}>No members assigned</p>
                                            ) : members.map((u) => (
                                                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#47bfff,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 6px rgba(79,70,229,0.25)' }}>
                                                        {(u.firstName?.[0] || u.fullName?.[0] || '?').toUpperCase()}
                                                    </div>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {u.firstName && u.lastName ? u.firstName + ' ' + u.lastName : u.fullName || u.email}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                                                    </div>
                                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 20, color: '#818cf8', flexShrink: 0 }}>
                                                        {u.role || 'User'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {modal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>New Department</h2>
                            <button className="modal-close-btn" onClick={() => { setModal(false); setForm(EMPTY); }}>✕</button>
                        </div>
                        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, fontFamily: "'Inter', sans-serif" }}>
                            <Field label="Department Name *">
                                <input className="dp-input" value={form.name} onChange={set('name')} placeholder="e.g. Registrar, Dean's Office" />
                            </Field>
                            <Field label="Description">
                                <textarea className="dp-input" style={{ height: 70, resize: 'vertical' }} value={form.description} onChange={set('description')} placeholder="Optional description..." />
                            </Field>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button className="dp-ghost-btn" onClick={() => { setModal(false); setForm(EMPTY); }}>Cancel</button>
                                <button className="dp-primary-btn" onClick={() => { if (form.name.trim()) create.mutate(form); }} disabled={create.isPending}>
                                    {create.isPending ? 'Creating...' : 'Create'}
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