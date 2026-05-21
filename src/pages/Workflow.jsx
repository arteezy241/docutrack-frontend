import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";

const fetchWorkflows = () => client.get("/workflow").then((r) => r.data);
const fetchUsers = () => client.get("/Users").then((r) => r.data);
const createWorkflow = (body) => client.post("/workflow", body).then((r) => r.data);
const deleteWorkflow = (id) => client.delete("/workflow/" + id).then((r) => r.data);
const toggleWorkflow = (id) => client.patch("/workflow/" + id + "/toggle").then((r) => r.data);

const STATUS_LABELS = { 0: "Draft", 1: "In Review", 2: "Approved", 3: "Rejected", 4: "Archived" };
const STATUS_COLORS = {
    0: { bg: "rgba(143,152,160,0.12)", color: "#8f98a0" },
    1: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    2: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
    3: { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
    4: { bg: "rgba(129,140,248,0.12)", color: "#818cf8" },
};

const EMPTY = { name: "", triggerStatus: 0, assignToUserId: "", nextStatus: 2, note: "" };

export default function Workflow() {
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const { data: rules = [], isLoading } = useQuery({ queryKey: ["workflow"], queryFn: fetchWorkflows });
    const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

    const create = useMutation({
        mutationFn: createWorkflow,
        onSuccess: () => { qc.invalidateQueries(["workflow"]); setModal(false); setForm(EMPTY); },
    });
    const remove = useMutation({
        mutationFn: deleteWorkflow,
        onSuccess: () => qc.invalidateQueries(["workflow"]),
    });
    const toggle = useMutation({
        mutationFn: toggleWorkflow,
        onSuccess: () => qc.invalidateQueries(["workflow"]),
    });

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }));

    const handleSubmit = () => {
        if (!form.name.trim()) return;
        create.mutate({ ...form, assignToUserId: form.assignToUserId || null });
    };

    const userName = (id) => {
        if (!id) return "Any";
        const u = users.find((u) => (u.id || u.Id) === id);
        if (!u) return "Unknown";
        return u.fullName || ((u.firstName || "") + " " + (u.lastName || "")).trim() || u.email || "Unknown";
    };

    return (
        <AppLayout>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                .wf-primary-btn {
                    padding: 9px 18px;
                    background: linear-gradient(135deg, #47bfff, #4F46E5);
                    border: none; border-radius: 10px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity 0.2s, transform 0.2s;
                    box-shadow: 0 4px 12px rgba(79,70,229,0.3);
                    white-space: nowrap;
                }
                .wf-primary-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .wf-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .wf-ghost-btn {
                    padding: 9px 18px; background: transparent;
                    border: 1px solid var(--border-input);
                    border-radius: 10px; color: var(--text-muted);
                    font-size: 13px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s, color 0.2s;
                }
                .wf-ghost-btn:hover { background: var(--bg-hover); color: var(--text-secondary); }
                .rule-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px; padding: 18px;
                    display: flex; flex-direction: column; gap: 12px;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                    animation: fadeUp 0.4s ease both;
                }
                .rule-card:hover {
                    transform: translateY(-2px);
                    border-color: var(--border-input);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                }
                .toggle-btn {
                    background: none; border: none; cursor: pointer;
                    font-size: 12px; font-weight: 600;
                    padding: 5px 10px; border-radius: 8px;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s;
                }
                .delete-btn {
                    background: none; border: none; cursor: pointer;
                    color: var(--text-muted); font-size: 12px; font-weight: 500;
                    padding: 5px 10px; border-radius: 8px;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s, color 0.2s;
                }
                .delete-btn:hover { background: rgba(248,113,113,0.1); color: #f87171; }
                .modal-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 100; padding: 20px;
                }
                .modal-box {
                    background: var(--modal-bg);
                    border: 1px solid var(--border);
                    border-radius: 16px; width: 100%;
                    max-width: 480px; max-height: 90vh;
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
                .wf-input {
                    width: 100%; padding: 9px 12px;
                    background: var(--bg-input);
                    border: 1px solid var(--border-input);
                    border-radius: 8px; color: var(--text-secondary);
                    font-size: 13px; outline: none;
                    box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                    transition: border-color 0.2s;
                }
                .wf-input:focus { border-color: rgba(71,191,255,0.4); }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 28, animation: 'fadeUp 0.3s ease both' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Workflow Rules</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{rules.length} rules configured</p>
                    </div>
                    <button className="wf-primary-btn" onClick={() => { setForm(EMPTY); setModal(true); }}>+ Add Rule</button>
                </div>

                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                ) : rules.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 64, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', gap: 12 }}>
                        <div style={{ fontSize: 32, opacity: 0.3 }}>⚡</div>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>No workflow rules yet</p>
                        <button className="wf-primary-btn" onClick={() => setModal(true)}>Create your first rule</button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px,1fr))' }}>
                        {rules.map((rule, i) => {
                            const triggerColor = STATUS_COLORS[rule.triggerStatus] || STATUS_COLORS[0];
                            const nextColor = STATUS_COLORS[rule.nextStatus] || STATUS_COLORS[0];
                            return (
                                <div key={rule.id} className="rule-card" style={{ animationDelay: `${i * 0.07}s` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-accent)', background: 'rgba(74,127,165,0.12)', padding: '3px 9px', borderRadius: 20 }}>
                                            #{rule.order || i + 1}
                                        </span>
                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, ...(rule.isActive ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80' } : { background: 'var(--bg-input)', color: 'var(--text-muted)' }) }}>
                                            {rule.isActive ? '● Active' : '○ Inactive'}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{rule.name}</h3>
                                        {rule.note && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{rule.note}</p>}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                        <div>
                                            <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>When</p>
                                            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: triggerColor.bg, color: triggerColor.color }}>
                                                {STATUS_LABELS[rule.triggerStatus] ?? String(rule.triggerStatus)}
                                            </span>
                                        </div>
                                        <span style={{ color: 'var(--text-accent)', fontSize: 16, fontWeight: 300 }}>→</span>
                                        <div>
                                            <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Set to</p>
                                            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: nextColor.bg, color: nextColor.color }}>
                                                {STATUS_LABELS[rule.nextStatus] ?? String(rule.nextStatus)}
                                            </span>
                                        </div>
                                    </div>

                                    {rule.assignToUserId && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#47bfff,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                                {(userName(rule.assignToUserId)?.[0] || '?').toUpperCase()}
                                            </div>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assign to <strong style={{ color: 'var(--text-secondary)' }}>{userName(rule.assignToUserId)}</strong></span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 2 }}>
                                        <button
                                            className="toggle-btn"
                                            style={{ color: rule.isActive ? '#f59e0b' : '#4ade80', background: rule.isActive ? 'rgba(245,158,11,0.08)' : 'rgba(74,222,128,0.08)' }}
                                            onClick={() => toggle.mutate(rule.id)}
                                            disabled={toggle.isPending}
                                        >
                                            {rule.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button className="delete-btn" onClick={() => { if (window.confirm('Delete rule ' + rule.name + '?')) remove.mutate(rule.id); }}>
                                            Delete
                                        </button>
                                    </div>
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
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>New Workflow Rule</h2>
                            <button className="modal-close-btn" onClick={() => { setModal(false); setForm(EMPTY); }}>✕</button>
                        </div>
                        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, fontFamily: "'Inter', sans-serif" }}>
                            <Field label="Rule Name *">
                                <input className="wf-input" value={form.name} onChange={set('name')} placeholder="e.g. Auto-route to dean" />
                            </Field>
                            <Field label="Trigger when status is">
                                <select className="wf-input" value={form.triggerStatus} onChange={setNum('triggerStatus')}>
                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Assign to User">
                                <select className="wf-input" value={form.assignToUserId} onChange={set('assignToUserId')}>
                                    <option value="">Anyone</option>
                                    {users.map((u) => (
                                        <option key={u.id || u.Id} value={u.id || u.Id}>
                                            {u.fullName || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || u.email}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Set next status to">
                                <select className="wf-input" value={form.nextStatus} onChange={setNum('nextStatus')}>
                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Note">
                                <textarea className="wf-input" style={{ height: 60, resize: 'vertical' }} value={form.note} onChange={set('note')} placeholder="Description of this rule..." />
                            </Field>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button className="wf-ghost-btn" onClick={() => { setModal(false); setForm(EMPTY); }}>Cancel</button>
                                <button className="wf-primary-btn" onClick={handleSubmit} disabled={create.isPending}>
                                    {create.isPending ? 'Creating...' : 'Create Rule'}
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