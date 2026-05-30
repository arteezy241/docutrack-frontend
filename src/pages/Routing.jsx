import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useAuthStore from "../store/authStore";
import useWindowWidth from "../hooks/useWindowWidth";

const fetchDocuments = () => client.get("/Documents").then((r) => r.data);
const fetchUsers = () => client.get("/Users").then((r) => r.data);
const fetchRouting = (docId) => client.get("/Documents/" + docId + "/routing").then((r) => r.data);
const fetchTemplates = () => client.get("/routing-templates").then((r) => r.data);
const createRoute = ({ documentId, ...body }) =>
    client.post("/Documents/" + documentId + "/routing", body).then((r) => r.data);
const approveRoute = ({ documentId, eventId }) =>
    client.patch("/Documents/" + documentId + "/routing/" + eventId + "/approve").then((r) => r.data);
const rejectRoute = ({ documentId, eventId, reason }) =>
    client.patch("/Documents/" + documentId + "/routing/" + eventId + "/reject", { reason }).then((r) => r.data);
const createTemplate = (body) => client.post("/routing-templates", body).then((r) => r.data);
const deleteTemplate = (id) => client.delete("/routing-templates/" + id).then((r) => r.data);

const STATUS_COLORS = {
    0: { bg: "rgba(143,152,160,0.12)", color: "#8f98a0" },
    1: { bg: "var(--warning-bg)",      color: "var(--warning)" },
    2: { bg: "var(--success-bg)",      color: "var(--success)" },
    3: { bg: "var(--danger-bg)",       color: "var(--danger)" },
    4: { bg: "rgba(129,140,248,0.12)", color: "#818cf8" },
    Approved: { bg: "var(--success-bg)", color: "var(--success)" },
    Rejected:  { bg: "var(--danger-bg)", color: "var(--danger)" },
    InReview:  { bg: "var(--warning-bg)", color: "var(--warning)" },
    Draft:     { bg: "rgba(143,152,160,0.12)", color: "#8f98a0" },
    Archived:  { bg: "rgba(129,140,248,0.12)", color: "#818cf8" },
};
const STATUS_LABELS = {
    0: "Draft", 1: "In Review", 2: "Approved", 3: "Rejected", 4: "Archived",
    Draft: "Draft", InReview: "In Review", Approved: "Approved",
    Rejected: "Rejected", Archived: "Archived",
};

const EMPTY = { documentId: "", toUserId: "", notes: "" };
const EMPTY_TEMPLATE = { name: "", description: "", steps: [] };

export default function Routing() {
    const qc = useQueryClient();
    const { user } = useAuthStore();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [tab, setTab] = useState('routing');
    const [modal, setModal] = useState(false);
    const [templateModal, setTemplateModal] = useState(false);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [form, setForm] = useState(EMPTY);
    const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE);
    const [newStep, setNewStep] = useState({ userId: '', note: '' });
    const [search, setSearch] = useState("");
    const [selDocId, setSelDocId] = useState(null);
    const [applyTemplateModal, setApplyTemplateModal] = useState(false);

    const { data: documents = [] } = useQuery({ queryKey: ["documents"],         queryFn: fetchDocuments });
    const { data: users = [] }     = useQuery({ queryKey: ["users"],              queryFn: fetchUsers });
    const { data: templates = [] } = useQuery({ queryKey: ["routing-templates"], queryFn: fetchTemplates });
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
            setModal(false); setSelDocId(form.documentId); setForm(EMPTY);
        },
    });
    const approve = useMutation({
        mutationFn: approveRoute,
        onSuccess: () => { qc.invalidateQueries(["routing", selDocId]); qc.invalidateQueries(["documents"]); },
    });
    const reject = useMutation({
        mutationFn: rejectRoute,
        onSuccess: () => {
            qc.invalidateQueries(["routing", selDocId]); qc.invalidateQueries(["documents"]);
            setRejectModal(null); setRejectReason("");
        },
    });
    const createTemplateMut = useMutation({
        mutationFn: createTemplate,
        onSuccess: () => { qc.invalidateQueries(["routing-templates"]); setTemplateModal(false); setTemplateForm(EMPTY_TEMPLATE); setNewStep({ userId: '', note: '' }); },
    });
    const deleteTemplateMut = useMutation({
        mutationFn: deleteTemplate,
        onSuccess: () => qc.invalidateQueries(["routing-templates"]),
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
    const statusEvents  = events.filter(ev => ev.toUserId == null);
    const selectedDoc   = documents.find((d) => d.id === selDocId);

    const addStep = () => {
        if (!newStep.userId) return;
        setTemplateForm(f => ({ ...f, steps: [...f.steps, { ...newStep }] }));
        setNewStep({ userId: '', note: '' });
    };
    const removeStep = (i) => {
        setTemplateForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
    };
    const applyTemplate = (template) => {
        const steps = JSON.parse(template.stepsJson || '[]');
        if (steps.length === 0) return;
        setForm(f => ({ ...f, toUserId: steps[0].userId, notes: steps[0].note || '' }));
        setApplyTemplateModal(false); setModal(true);
    };

    return (
        <AppLayout>
            <style>{`
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                .rt-primary-btn {
                    display: inline-flex; align-items: center; gap: 7px;
                    height: 36px; padding: 0 16px;
                    background: var(--accent-gradient);
                    border: none; border-radius: 12px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity var(--duration-base), transform var(--duration-base);
                    box-shadow: var(--shadow-accent); white-space: nowrap;
                }
                .rt-primary-btn:hover { opacity: 0.88; transform: translateY(-1px); }
                .rt-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .rt-ghost-btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    height: 36px; padding: 0 16px;
                    background: transparent;
                    border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: background var(--duration-fast), color var(--duration-fast);
                }
                .rt-ghost-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
                .rt-search {
                    padding: 9px 14px 9px 38px; background: var(--bg-card);
                    border: 1px solid var(--border-default); border-radius: 10px;
                    color: var(--text-secondary); font-size: 13px; outline: none;
                    font-family: 'Inter', sans-serif;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
                    box-sizing: border-box; width: 100%;
                }
                .rt-search:focus { border-color: var(--accent-from); box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
                .rt-search::placeholder { color: var(--text-tertiary); }
                .doc-chip {
                    padding: 7px 14px; background: var(--bg-card);
                    border: 1px solid var(--border-subtle); border-radius: 10px;
                    font-size: 12px; color: var(--text-tertiary); cursor: pointer;
                    font-family: 'Inter', sans-serif; font-weight: 500;
                    transition: all var(--duration-fast); white-space: nowrap;
                }
                .doc-chip:hover { background: var(--bg-card-hover); color: var(--text-secondary); border-color: var(--border-default); }
                .doc-chip.active { background: rgba(79,70,229,0.18); border-color: rgba(79,70,229,0.45); color: #818cf8; }
                .rt-row { border-bottom: 1px solid var(--border-subtle); transition: background var(--duration-fast); }
                .rt-row:hover { background: var(--bg-card-hover); }
                .rt-row:last-child { border-bottom: none; }
                .action-icon-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 32px; height: 32px; border-radius: 50%;
                    background: none; border: 1px solid var(--border-subtle);
                    cursor: pointer; color: var(--text-tertiary);
                    transition: background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast);
                    flex-shrink: 0;
                }
                .action-icon-btn:hover { background: var(--bg-card-hover); color: var(--text-secondary); border-color: var(--border-default); }
                .action-icon-btn.approve:hover { background: var(--success-bg); color: var(--success); border-color: rgba(52,211,153,0.3); }
                .action-icon-btn.danger:hover  { background: var(--danger-bg);  color: var(--danger);  border-color: rgba(248,113,113,0.3); }
                .tab-btn {
                    padding: 7px 16px; border-radius: 8px;
                    font-size: 12px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif; transition: all var(--duration-fast);
                }
                .tab-btn.active {
                    background: linear-gradient(135deg, rgba(71,191,255,0.18), rgba(79,70,229,0.18));
                    color: var(--accent-to); border: 1px solid rgba(71,191,255,0.3);
                }
                .tab-btn.inactive {
                    background: transparent; color: var(--text-tertiary);
                    border: 1px solid var(--border-subtle);
                }
                .tab-btn.inactive:hover { background: var(--bg-card-hover); color: var(--text-secondary); }
                .template-card {
                    background: var(--bg-card); border: 1px solid var(--border-subtle);
                    border-radius: 14px; padding: 16px 18px;
                    transition: border-color var(--duration-fast); animation: fadeUp 0.4s ease both;
                }
                .template-card:hover { border-color: rgba(71,191,255,0.3); }
                .modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 100; padding: 20px;
                }
                .modal-box {
                    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
                    border-radius: 16px; width: 100%; max-width: 480px;
                    max-height: 90vh; display: flex; flex-direction: column;
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
                .rt-input {
                    width: 100%; height: 40px; padding: 0 12px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 14px; outline: none; box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
                }
                .rt-input:focus { border-color: var(--accent-from); box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
                textarea.rt-input { height: auto; padding: 10px 12px; }
                select.rt-input { cursor: pointer; }
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
                .modal-reject-btn {
                    height: 40px; border: none; border-radius: 10px; color: #fff;
                    background: linear-gradient(135deg, #c94040, #8b1010);
                    font-size: 14px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif; transition: opacity var(--duration-base);
                }
                .modal-reject-btn:hover { opacity: 0.88; }
                .modal-reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .step-row {
                    display: flex; align-items: center; gap: 10px;
                    padding: 10px 12px; background: var(--bg-card);
                    border: 1px solid var(--border-subtle); border-radius: 10px; margin-bottom: 8px;
                }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 20, animation: 'fadeUp 0.3s ease both' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Routing</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Route documents and manage routing templates</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {tab === 'templates' && (
                            <button className="rt-primary-btn" onClick={() => { setTemplateForm(EMPTY_TEMPLATE); setNewStep({ userId: '', note: '' }); setTemplateModal(true); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                New Template
                            </button>
                        )}
                        {tab === 'routing' && (
                            <>
                                <button className="rt-ghost-btn" onClick={() => setApplyTemplateModal(true)}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                    Use Template
                                </button>
                                <button className="rt-primary-btn" onClick={() => { setForm(EMPTY); setModal(true); }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                                    Route Document
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button className={`tab-btn ${tab === 'routing' ? 'active' : 'inactive'}`} onClick={() => setTab('routing')}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                        Routing
                    </button>
                    <button className={`tab-btn ${tab === 'templates' ? 'active' : 'inactive'}`} onClick={() => setTab('templates')}>
                        Templates ({templates.length})
                    </button>
                </div>

                {tab === 'routing' && (
                    <>
                        {/* Document selector */}
                        <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 20, marginBottom: 20, animation: 'fadeUp 0.35s ease both' }}>
                            <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                Select a document to view routing history
                            </p>
                            <div style={{ position: 'relative', marginBottom: 14 }}>
                                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                </span>
                                <input className="rt-search" placeholder="Search documents…" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {filteredDocs.length === 0 ? (
                                    <p style={{ color: 'var(--text-tertiary)', fontSize: 13, margin: 0 }}>No documents found</p>
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
                                <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, overflow: 'hidden' }}>
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Routing History</span>
                                        {selectedDoc && (
                                            <span style={{ fontSize: 11, color: 'var(--accent-to)', background: 'rgba(71,191,255,0.1)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                                                {selectedDoc.title}
                                            </span>
                                        )}
                                    </div>
                                    {isLoading ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                                    ) : routingEvents.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 8 }}>
                                            <div style={{ opacity: 0.3 }}>
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                            </div>
                                            <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 13 }}>No routing events for this document</p>
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr>
                                                        {['Routed To', 'Note', 'Status', 'Date', 'Action'].map((h) => (
                                                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
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
                                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                                                            {(userName(ev.toUserId)?.[0] || '?').toUpperCase()}
                                                                        </div>
                                                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{userName(ev.toUserId)}</span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle', color: 'var(--text-tertiary)', fontSize: 12 }}>
                                                                    {ev.note || ev.notes || '—'}
                                                                </td>
                                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle' }}>
                                                                    <span style={{ background: sc.bg, color: sc.color, padding: '5px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                        {label}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle', color: 'var(--text-tertiary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                                    {ev.timestamp || ev.createdAt ? new Date(ev.timestamp || ev.createdAt).toLocaleDateString() : '—'}
                                                                </td>
                                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                                    {canActOn(ev) ? (
                                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                                            <button className="action-icon-btn approve" title="Approve" disabled={approve.isPending} onClick={() => approve.mutate({ documentId: selDocId, eventId: ev.id })}>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                                                            </button>
                                                                            <button className="action-icon-btn danger" title="Reject" onClick={() => { setRejectModal(ev); setRejectReason(''); }}>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>
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

                                {statusEvents.length > 0 && (
                                    <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, overflow: 'hidden' }}>
                                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Status Change History</span>
                                        </div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr>
                                                        {['Status Changed To', 'Date'].map((h) => (
                                                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
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
                                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle' }}>
                                                                    <span style={{ background: sc.bg, color: sc.color, padding: '5px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600 }}>{label}</span>
                                                                </td>
                                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle', color: 'var(--text-tertiary)', fontSize: 12, whiteSpace: 'nowrap' }}>
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
                    </>
                )}

                {tab === 'templates' && (
                    <div style={{ animation: 'fadeUp 0.4s ease both' }}>
                        {templates.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 64, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, gap: 12 }}>
                                <div style={{ opacity: 0.3 }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                </div>
                                <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 13 }}>No routing templates yet</p>
                                <button className="rt-primary-btn" onClick={() => { setTemplateForm(EMPTY_TEMPLATE); setTemplateModal(true); }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    Create first template
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {templates.map((t, i) => {
                                    const steps = JSON.parse(t.stepsJson || '[]');
                                    return (
                                        <div key={t.id} className="template-card" style={{ animationDelay: `${i * 0.06}s` }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t.name}</div>
                                                    {t.description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>{t.description}</div>}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        {steps.map((step, idx) => (
                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                                                    {idx + 1}
                                                                </div>
                                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{userName(step.userId)}</span>
                                                                {step.note && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>— {step.note}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                                    <button onClick={() => { applyTemplate(t); setTab('routing'); }}
                                                        style={{ padding: '6px 12px', background: 'rgba(71,191,255,0.1)', border: '1px solid rgba(71,191,255,0.2)', borderRadius: 8, color: 'var(--accent-to)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                                                        Use
                                                    </button>
                                                    <button onClick={() => { if (window.confirm('Delete ' + t.name + '?')) deleteTemplateMut.mutate(t.id); }}
                                                        style={{ padding: '6px 12px', background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Route modal */}
            {modal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Route Document</h2>
                            <button className="modal-close-btn" onClick={() => setModal(false)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <Field label="Document *">
                                <select className="rt-input" value={form.documentId} onChange={set('documentId')}>
                                    <option value="">Select a document…</option>
                                    {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                                </select>
                            </Field>
                            <Field label="Route To *">
                                <select className="rt-input" value={form.toUserId} onChange={set('toUserId')}>
                                    <option value="">Select a user…</option>
                                    {users.map((u) => (
                                        <option key={u.id || u.Id} value={u.id || u.Id}>
                                            {u.fullName || (u.firstName && u.lastName ? (u.firstName + ' ' + u.lastName).trim() : u.email)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Notes">
                                <textarea className="rt-input" style={{ height: 70, resize: 'vertical' }} value={form.notes} onChange={set('notes')} placeholder="Optional instructions…" />
                            </Field>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button className="rt-ghost-btn" onClick={() => { setModal(false); setForm(EMPTY); }}>Cancel</button>
                                <button className="modal-submit-btn" style={{ flex: 1 }} disabled={!form.documentId || !form.toUserId || create.isPending} onClick={() => create.mutate(form)}>
                                    {create.isPending ? 'Routing…' : 'Route Document'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Apply template modal */}
            {applyTemplateModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setApplyTemplateModal(false)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Choose Template</h2>
                            <button className="modal-close-btn" onClick={() => setApplyTemplateModal(false)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {templates.length === 0 ? (
                                <p style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No templates yet. Create one in the Templates tab.</p>
                            ) : templates.map((t) => {
                                const steps = JSON.parse(t.stepsJson || '[]');
                                return (
                                    <div key={t.id} onClick={() => applyTemplate(t)}
                                        style={{ padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, cursor: 'pointer', transition: 'border-color var(--duration-fast), background var(--duration-fast)' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(71,191,255,0.35)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-card)'; }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{steps.length} step{steps.length !== 1 ? 's' : ''} · {steps.map(s => userName(s.userId)).join(' → ')}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Create template modal */}
            {templateModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setTemplateModal(false)}>
                    <div className="modal-box" style={{ maxWidth: 520 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>New Routing Template</h2>
                            <button className="modal-close-btn" onClick={() => setTemplateModal(false)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <Field label="Template Name *">
                                <input className="rt-input" value={templateForm.name} onChange={(e) => setTemplateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dean → Registrar → VP" />
                            </Field>
                            <Field label="Description">
                                <input className="rt-input" value={templateForm.description} onChange={(e) => setTemplateForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
                            </Field>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>STEPS (in order)</label>
                                {templateForm.steps.map((step, idx) => (
                                    <div key={idx} className="step-row">
                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                            {idx + 1}
                                        </div>
                                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{userName(step.userId)}</span>
                                        {step.note && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{step.note}</span>}
                                        <button onClick={() => removeStep(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0 }}>✕</button>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <select className="rt-input" style={{ flex: 1 }} value={newStep.userId} onChange={(e) => setNewStep(s => ({ ...s, userId: e.target.value }))}>
                                        <option value="">Add user…</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
                                        ))}
                                    </select>
                                    <input className="rt-input" style={{ flex: 1 }} placeholder="Note (optional)" value={newStep.note} onChange={(e) => setNewStep(s => ({ ...s, note: e.target.value }))} />
                                    <button className="rt-primary-btn" style={{ height: 40, padding: '0 14px', flexShrink: 0 }} onClick={addStep} disabled={!newStep.userId}>+ Add</button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button className="rt-ghost-btn" onClick={() => setTemplateModal(false)}>Cancel</button>
                                <button className="modal-submit-btn" style={{ flex: 1 }} disabled={!templateForm.name.trim() || templateForm.steps.length === 0 || createTemplateMut.isPending} onClick={() => createTemplateMut.mutate(templateForm)}>
                                    {createTemplateMut.isPending ? 'Saving…' : 'Save Template'}
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--danger)' }}>Reject Document</h2>
                            <button className="modal-close-btn" onClick={() => setRejectModal(null)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <Field label="Reason (optional)">
                                <textarea className="rt-input" style={{ height: 80, resize: 'vertical' }} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why are you rejecting this document?" />
                            </Field>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button className="rt-ghost-btn" onClick={() => setRejectModal(null)}>Cancel</button>
                                <button className="modal-reject-btn" style={{ flex: 1 }} disabled={reject.isPending} onClick={() => reject.mutate({ documentId: selDocId, eventId: rejectModal.id, reason: rejectReason })}>
                                    {reject.isPending ? 'Rejecting…' : 'Reject Document'}
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
