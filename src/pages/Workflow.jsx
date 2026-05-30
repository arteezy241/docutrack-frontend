import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";

const fetchWorkflows = () => client.get("/workflow").then((r) => r.data);
const fetchUsers    = () => client.get("/Users").then((r) => r.data);
const createWorkflow = (body) => client.post("/workflow", body).then((r) => r.data);
const deleteWorkflow = (id)  => client.delete("/workflow/" + id).then((r) => r.data);
const toggleWorkflow = (id)  => client.patch("/workflow/" + id + "/toggle").then((r) => r.data);

const STATUS_LABELS = { 0: "Draft", 1: "In Review", 2: "Approved", 3: "Rejected", 4: "Archived" };
const STATUS_COLORS = {
    0: { bg: "rgba(143,152,160,0.12)", color: "#8f98a0" },
    1: { bg: "var(--warning-bg)",      color: "var(--warning)" },
    2: { bg: "var(--success-bg)",      color: "var(--success)" },
    3: { bg: "var(--danger-bg)",       color: "var(--danger)" },
    4: { bg: "rgba(129,140,248,0.12)", color: "#818cf8" },
};

const EMPTY = { name: "", triggerStatus: 0, assignToUserId: "", nextStatus: 2, note: "" };

function Toggle({ checked, onToggle, disabled }) {
    return (
        <div onClick={disabled ? undefined : onToggle} style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', background: checked ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.12)', boxShadow: checked ? '0 2px 8px rgba(79,70,229,0.45)' : 'none', transition: 'background 0.25s, box-shadow 0.25s', opacity: disabled ? 0.5 : 1, flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'transform 0.25s var(--ease-spring)', transform: checked ? 'translateX(22px)' : 'translateX(3px)', boxShadow: '0 1px 4px rgba(0,0,0,0.35)' }} />
        </div>
    );
}

export default function Workflow() {
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const { data: rules = [], isLoading } = useQuery({ queryKey: ["workflow"], queryFn: fetchWorkflows });
    const { data: users = [] }            = useQuery({ queryKey: ["users"],    queryFn: fetchUsers });

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

    const set    = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
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
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                .wf-primary-btn {
                    display: inline-flex; align-items: center; gap: 7px;
                    height: 36px; padding: 0 16px;
                    background: var(--accent-gradient);
                    border: none; border-radius: 12px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity var(--duration-base), transform var(--duration-base);
                    box-shadow: var(--shadow-accent); white-space: nowrap;
                }
                .wf-primary-btn:hover { opacity: 0.88; transform: translateY(-1px); }
                .wf-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .wf-ghost-btn {
                    height: 36px; padding: 0 16px;
                    background: transparent; border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif;
                    transition: background var(--duration-fast), color var(--duration-fast);
                }
                .wf-ghost-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
                .rule-card {
                    background: rgba(255,255,255,0.06);
                    backdrop-filter: blur(24px) saturate(180%);
                    -webkit-backdrop-filter: blur(24px) saturate(180%);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 20px; padding: 20px;
                    display: flex; flex-direction: column; gap: 14px;
                    box-shadow: 0 8px 40px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.08) inset;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast), transform var(--duration-fast);
                    animation: fadeUp 0.4s ease both;
                }
                .rule-card:hover { border-color: rgba(255,255,255,0.20); box-shadow: 0 14px 48px rgba(0,0,0,0.50), 0 1px 0 rgba(255,255,255,0.12) inset; transform: translateY(-2px); }
                .action-icon-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 32px; height: 32px; border-radius: 50%;
                    background: none; border: 1px solid var(--border-subtle);
                    cursor: pointer; color: var(--text-tertiary);
                    transition: background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast);
                }
                .action-icon-btn:hover { background: var(--bg-card-hover); color: var(--text-secondary); border-color: var(--border-default); }
                .action-icon-btn.danger:hover { background: var(--danger-bg); color: var(--danger); border-color: rgba(248,113,113,0.3); }
                .modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
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
                .wf-input {
                    width: 100%; height: 40px; padding: 0 12px;
                    background: var(--bg-card); border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 14px; outline: none; box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
                }
                .wf-input:focus { border-color: var(--accent-from); box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
                textarea.wf-input { height: auto; padding: 10px 12px; }
                select.wf-input { cursor: pointer; }
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
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 28, animation: 'fadeUp 0.3s ease both' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Workflow Rules</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>{rules.length} rules configured</p>
                    </div>
                    <button className="wf-primary-btn" onClick={() => { setForm(EMPTY); setModal(true); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Rule
                    </button>
                </div>

                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                ) : rules.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 64, background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-subtle)', gap: 12 }}>
                        <div style={{ opacity: 0.3 }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        </div>
                        <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 13 }}>No workflow rules yet</p>
                        <button className="wf-primary-btn" onClick={() => setModal(true)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Create your first rule
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {rules.map((rule, i) => {
                            const triggerColor = STATUS_COLORS[rule.triggerStatus] || STATUS_COLORS[0];
                            const nextColor    = STATUS_COLORS[rule.nextStatus]    || STATUS_COLORS[0];
                            return (
                                <div key={rule.id} className="rule-card" style={{ animationDelay: `${i * 0.07}s` }}>

                                    {/* Card header: name + toggle */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border-subtle)' }}>
                                                    #{rule.order || i + 1}
                                                </span>
                                            </div>
                                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{rule.name}</h3>
                                            {rule.note && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{rule.note}</p>}
                                        </div>
                                        <Toggle checked={rule.isActive} onToggle={() => toggle.mutate(rule.id)} disabled={toggle.isPending} />
                                    </div>

                                    {/* Status flow pill */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-full)', background: triggerColor.bg, color: triggerColor.color }}>
                                            {STATUS_LABELS[rule.triggerStatus] ?? String(rule.triggerStatus)}
                                        </span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                                        <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-full)', background: nextColor.bg, color: nextColor.color }}>
                                            {STATUS_LABELS[rule.nextStatus] ?? String(rule.nextStatus)}
                                        </span>
                                    </div>

                                    {/* Assignee */}
                                    {rule.assignToUserId && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                                {(userName(rule.assignToUserId)?.[0] || '?').toUpperCase()}
                                            </div>
                                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                                Assign to <strong style={{ color: 'var(--text-secondary)' }}>{userName(rule.assignToUserId)}</strong>
                                            </span>
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="action-icon-btn danger" title="Delete rule" onClick={() => { if (window.confirm('Delete rule ' + rule.name + '?')) remove.mutate(rule.id); }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create rule modal */}
            {modal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>New Workflow Rule</h2>
                            <button className="modal-close-btn" onClick={() => { setModal(false); setForm(EMPTY); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                                <textarea className="wf-input" style={{ height: 60, resize: 'vertical' }} value={form.note} onChange={set('note')} placeholder="Description of this rule…" />
                            </Field>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button className="wf-ghost-btn" onClick={() => { setModal(false); setForm(EMPTY); }}>Cancel</button>
                                <button className="modal-submit-btn" style={{ flex: 1 }} onClick={handleSubmit} disabled={create.isPending}>
                                    {create.isPending ? 'Creating…' : 'Create Rule'}
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
