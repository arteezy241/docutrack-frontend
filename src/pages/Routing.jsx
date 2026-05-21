import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useAuthStore from "../store/authStore";
import useWindowWidth from "../hooks/useWindowWidth";

const fetchDocuments = () => client.get("/Documents").then((r) => r.data);
const fetchUsers = () => client.get("/Users").then((r) => r.data);
const fetchRouting = (docId) => client.get("/Documents/" + docId + "/routing").then((r) => r.data);
const createRoute = ({ documentId, ...body }) =>
    client.post("/Documents/" + documentId + "/routing", body).then((r) => r.data);
const approveRoute = ({ documentId, eventId }) =>
    client.patch("/Documents/" + documentId + "/routing/" + eventId + "/approve").then((r) => r.data);
const rejectRoute = ({ documentId, eventId, reason }) =>
    client.patch("/Documents/" + documentId + "/routing/" + eventId + "/reject", { reason }).then((r) => r.data);

const STATUS_COLORS = {
    0: { bg: "rgba(143,152,160,0.12)", color: "#8f98a0" },
    1: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    2: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
    3: { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
    4: { bg: "rgba(129,140,248,0.12)", color: "#818cf8" },
    Approved: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
    Rejected: { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
    InReview: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    Draft: { bg: "rgba(143,152,160,0.12)", color: "#8f98a0" },
    Archived: { bg: "rgba(129,140,248,0.12)", color: "#818cf8" },
};

const STATUS_LABELS = {
    0: "Draft", 1: "In Review", 2: "Approved", 3: "Rejected", 4: "Archived",
    Draft: "Draft", InReview: "In Review", Approved: "Approved",
    Rejected: "Rejected", Archived: "Archived",
};

const EMPTY = { documentId: "", toUserId: "", notes: "" };

export default function Routing() {
    const qc = useQueryClient();
    const { user } = useAuthStore();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [modal, setModal] = useState(false);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [form, setForm] = useState(EMPTY);
    const [search, setSearch] = useState("");
    const [selDocId, setSelDocId] = useState(null);

    const { data: documents = [] } = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });
    const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
    const { data: events = [], isLoading } = useQuery({
        queryKey: ["routing", selDocId],
        queryFn: () => fetchRouting(selDocId),
        enabled: !!selDocId,
        staleTime: 0,
    });

    const create = useMutation({
        mutationFn: createRoute,
        onSuccess: () => {
            qc.invalidateQueries(["routing", form.documentId]);
            qc.invalidateQueries(["documents"]);
            setModal(false);
            setSelDocId(form.documentId);
            setForm(EMPTY);
        },
    });
    const approve = useMutation({
        mutationFn: approveRoute,
        onSuccess: () => { qc.invalidateQueries(["routing", selDocId]); qc.invalidateQueries(["documents"]); },
    });
    const reject = useMutation({
        mutationFn: rejectRoute,
        onSuccess: () => {
            qc.invalidateQueries(["routing", selDocId]);
            qc.invalidateQueries(["documents"]);
            setRejectModal(null);
            setRejectReason("");
        },
    });

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const filteredDocs = documents.filter((d) =>
        d.title?.toLowerCase().includes(search.toLowerCase())
    );

    const userName = (id) => {
        if (!id) return "System";
        const u = users.find((u) => (u.id || u.Id || "").toString().toLowerCase() === id.toString().toLowerCase());
        if (!u) return "Deleted User";
        return u.fullName || (u.firstName && u.lastName ? (u.firstName + " " + u.lastName).trim() : u.email) || "Unknown";
    };

    const currentUserId = user?.id || user?.Id;
    const isRecipient = (ev) => ev.toUserId && currentUserId && ev.toUserId.toString().toLowerCase() === currentUserId.toString().toLowerCase();
    const canActOn = (ev) => {
        const status = ev.statusAfter ?? ev.status;
        return isRecipient(ev) && status !== "Approved" && status !== "Rejected" && status !== 2 && status !== 3;
    };

    const routingEvents = events.filter(ev => ev.toUserId != null);
    const statusEvents = events.filter(ev => ev.toUserId == null);
    const selectedDoc = documents.find((d) => d.id === selDocId);

    return (
        <AppLayout>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                .rt-primary-btn {
                    padding: 9px 18px;
                    background: linear-gradient(135deg, #47bfff, #4F46E5);
                    border: none; border-radius: 10px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity 0.2s, transform 0.2s;
                    box-shadow: 0 4px 12px rgba(79,70,229,0.3);
                    white-space: nowrap;
                }
                .rt-primary-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .rt-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .rt-ghost-btn {
                    padding: 9px 18px; background: transparent;
                    border: 1px solid var(--border-input);
                    border-radius: 10px; color: var(--text-muted);
                    font-size: 13px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s, color 0.2s;
                }
                .rt-ghost-btn:hover { background: var(--bg-hover); color: var(--text-secondary); }
                .rt-reject-btn {
                    padding: 9px 18px;
                    background: linear-gradient(135deg, #c94040, #8b0000);
                    border: none; border-radius: 10px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif; transition: opacity 0.2s;
                }
                .rt-reject-btn:hover { opacity: 0.9; }
                .rt-reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .rt-search {
                    padding: 9px 14px 9px 38px;
                    background: var(--bg-input);
                    border: 1px solid var(--border);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; outline: none;
                    font-family: 'Inter', sans-serif;
                    transition: border-color 0.2s, background 0.2s;
                    box-sizing: border-box; width: 100%;
                }
                .rt-search:focus { border-color: rgba(71,191,255,0.4); background: var(--bg-hover); }
                .rt-search::placeholder { color: var(--text-accent); }
                .doc-chip {
                    padding: 7px 14px;
                    background: var(--bg-input);
                    border: 1px solid var(--border);
                    border-radius: 10px; font-size: 12px;
                    color: var(--text-muted); cursor: pointer;
                    font-family: 'Inter', sans-serif; font-weight: 500;
                    transition: all 0.2s; white-space: nowrap;
                }
                .doc-chip:hover { background: var(--bg-hover); color: var(--text-secondary); border-color: var(--border-input); }
                .doc-chip.active { background: rgba(79,70,229,0.2); border-color: rgba(79,70,229,0.5); color: #818cf8; }
                .rt-row { border-bottom: 1px solid var(--border); transition: background 0.15s; }
                .rt-row:hover { background: var(--bg-hover); }
                .rt-row:last-child { border-bottom: none; }
                .approve-btn {
                    padding: 5px 12px;
                    background: rgba(74,222,128,0.1);
                    border: 1px solid rgba(74,222,128,0.25);
                    border-radius: 8px; color: #4ade80;
                    font-size: 12px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif; transition: background 0.2s;
                }
                .approve-btn:hover { background: rgba(74,222,128,0.18); }
                .approve-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .reject-action-btn {
                    padding: 5px 12px;
                    background: rgba(248,113,113,0.1);
                    border: 1px solid rgba(248,113,113,0.25);
                    border-radius: 8px; color: #f87171;
                    font-size: 12px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif; transition: background 0.2s;
                }
                .reject-action-btn:hover { background: rgba(248,113,113,0.18); }
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
                    max-width: 460px; max-height: 90vh;
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
                .rt-input {
                    width: 100%; padding: 9px 12px;
                    background: var(--bg-input);
                    border: 1px solid var(--border-input);
                    border-radius: 8px; color: var(--text-secondary);
                    font-size: 13px; outline: none;
                    box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                    transition: border-color 0.2s;
                }
                .rt-input:focus { border-color: rgba(71,191,255,0.4); }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 24, animation: 'fadeUp 0.3s ease both' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Routing</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Route documents between users and track history</p>
                    </div>
                    <button className="rt-primary-btn" onClick={() => { setForm(EMPTY); setModal(true); }}>
                        + Route Document
                    </button>
                </div>

                {/* Document selector */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 20, animation: 'fadeUp 0.35s ease both' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Select a document to view routing history
                    </p>
                    <div style={{ position: 'relative', marginBottom: 14 }}>
                        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-accent)', pointerEvents: 'none' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        </span>
                        <input className="rt-search" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {filteredDocs.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No documents found</p>
                        ) : filteredDocs.map((doc) => (
                            <div key={doc.id} className={`doc-chip${selDocId === doc.id ? ' active' : ''}`} onClick={() => setSelDocId(doc.id)}>
                                {doc.title}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Routing history */}
                {selDocId && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.4s ease both' }}>

                        {/* Routing events */}
                        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Routing History</span>
                                {selectedDoc && (
                                    <span style={{ fontSize: 11, color: 'var(--text-accent)', background: 'rgba(74,127,165,0.12)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                                        {selectedDoc.title}
                                    </span>
                                )}
                            </div>
                            {isLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                            ) : routingEvents.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 8 }}>
                                    <div style={{ fontSize: 28, opacity: 0.3 }}>📋</div>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>No routing events for this document</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--table-head)' }}>
                                                {['Routed To', 'Note', 'Status', 'Date', 'Action'].map((h) => (
                                                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {routingEvents.map((ev) => {
                                                const status = ev.statusAfter ?? ev.status;
                                                const sc = STATUS_COLORS[status] || STATUS_COLORS[0];
                                                const label = STATUS_LABELS[status] || String(status);
                                                return (
                                                    <tr key={ev.id} className="rt-row">
                                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#47bfff,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 6px rgba(79,70,229,0.3)' }}>
                                                                    {(userName(ev.toUserId)?.[0] || '?').toUpperCase()}
                                                                </div>
                                                                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{userName(ev.toUserId)}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12 }}>
                                                            {ev.note || ev.notes || '—'}
                                                        </td>
                                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                            <span style={{ background: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                {label}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                            {ev.timestamp || ev.createdAt ? new Date(ev.timestamp || ev.createdAt).toLocaleDateString() : '—'}
                                                        </td>
                                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                            {canActOn(ev) ? (
                                                                <div style={{ display: 'flex', gap: 6 }}>
                                                                    <button className="approve-btn" disabled={approve.isPending} onClick={() => approve.mutate({ documentId: selDocId, eventId: ev.id })}>Approve</button>
                                                                    <button className="reject-action-btn" onClick={() => { setRejectModal(ev); setRejectReason(''); }}>Reject</button>
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: 'var(--text-accent)', fontSize: 12 }}>—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Status change history */}
                        {statusEvents.length > 0 && (
                            <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Status Change History</span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--table-head)' }}>
                                                {['Status Changed To', 'Date'].map((h) => (
                                                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {statusEvents.map((ev) => {
                                                const status = ev.statusAfter ?? ev.status;
                                                const sc = STATUS_COLORS[status] || STATUS_COLORS[0];
                                                const label = STATUS_LABELS[status] || String(status);
                                                return (
                                                    <tr key={ev.id} className="rt-row">
                                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                            <span style={{ background: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                                                                {label}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                            {ev.timestamp || ev.createdAt ? new Date(ev.timestamp || ev.createdAt).toLocaleString() : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Route modal */}
            {modal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>Route Document</h2>
                            <button className="modal-close-btn" onClick={() => setModal(false)}>✕</button>
                        </div>
                        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, fontFamily: "'Inter', sans-serif" }}>
                            <Field label="Document *">
                                <select className="rt-input" value={form.documentId} onChange={set('documentId')}>
                                    <option value="">Select a document...</option>
                                    {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                                </select>
                            </Field>
                            <Field label="Route To *">
                                <select className="rt-input" value={form.toUserId} onChange={set('toUserId')}>
                                    <option value="">Select a user...</option>
                                    {users.map((u) => (
                                        <option key={u.id || u.Id} value={u.id || u.Id}>
                                            {u.fullName || (u.firstName && u.lastName ? (u.firstName + ' ' + u.lastName).trim() : u.email)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Notes">
                                <textarea className="rt-input" style={{ height: 70, resize: 'vertical' }} value={form.notes} onChange={set('notes')} placeholder="Optional instructions..." />
                            </Field>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button className="rt-ghost-btn" onClick={() => { setModal(false); setForm(EMPTY); }}>Cancel</button>
                                <button className="rt-primary-btn" disabled={!form.documentId || !form.toUserId || create.isPending} onClick={() => create.mutate(form)}>
                                    {create.isPending ? 'Routing...' : 'Route'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject modal */}
            {rejectModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f87171', fontFamily: "'Inter', sans-serif" }}>Reject Document</h2>
                            <button className="modal-close-btn" onClick={() => setRejectModal(null)}>✕</button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: "'Inter', sans-serif" }}>
                            <Field label="Reason (optional)">
                                <textarea className="rt-input" style={{ height: 80, resize: 'vertical' }} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why are you rejecting this document?" />
                            </Field>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button className="rt-ghost-btn" onClick={() => setRejectModal(null)}>Cancel</button>
                                <button className="rt-reject-btn" disabled={reject.isPending} onClick={() => reject.mutate({ documentId: selDocId, eventId: rejectModal.id, reason: rejectReason })}>
                                    {reject.isPending ? 'Rejecting...' : 'Reject'}
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