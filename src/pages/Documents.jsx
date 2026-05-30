import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";
import useAuthStore from "../store/authStore";
import { useNavigate, useLocation } from "react-router-dom";

const triggerWorkflow = (id) => client.post("/workflow/trigger/" + id).then((r) => r.data);
const fetchDocs = () => client.get("/Documents").then((r) => r.data);
const createDoc = (body) => client.post("/Documents", body).then((r) => r.data);
const patchStatus = ({ id, status }) =>
    client.patch("/Documents/" + id + "/status", { status: STATUS_MAP[status] ?? status }).then((r) => r.data);
const deleteDoc = (id) => client.delete("/Documents/" + id).then((r) => r.data);
const deleteFile = (id) => client.delete("/Documents/" + id + "/file").then((r) => r.data);
const updateDueDate = ({ id, dueDate }) => client.patch("/Documents/" + id + "/due-date", { dueDate }).then((r) => r.data);
const uploadFile = ({ id, file }) => {
    const form = new FormData();
    form.append("file", file);
    return client.post("/Documents/" + id + "/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

const STATUS_OPTIONS = ["Draft", "InReview", "Approved", "Rejected", "Archived"];
const STATUS_MAP = { Draft: 0, InReview: 1, Approved: 2, Rejected: 3, Archived: 4 };
const STATUS_COLORS = {
    Draft:    { bg: "rgba(143,152,160,0.12)", color: "#8f98a0" },
    InReview: { bg: "var(--warning-bg)",      color: "var(--warning)" },
    Approved: { bg: "var(--success-bg)",      color: "var(--success)" },
    Rejected: { bg: "var(--danger-bg)",       color: "var(--danger)" },
    Archived: { bg: "rgba(129,140,248,0.12)", color: "#818cf8" },
    0: { bg: "rgba(143,152,160,0.12)", color: "#8f98a0" },
    1: { bg: "var(--warning-bg)",      color: "var(--warning)" },
    2: { bg: "var(--success-bg)",      color: "var(--success)" },
    3: { bg: "var(--danger-bg)",       color: "var(--danger)" },
    4: { bg: "rgba(129,140,248,0.12)", color: "#818cf8" },
};
const getStatusLabel = (s) =>
    ({ 0:"Draft",1:"In Review",2:"Approved",3:"Rejected",4:"Archived",
       Draft:"Draft",InReview:"In Review",Approved:"Approved",Rejected:"Rejected",Archived:"Archived" })[s] || String(s);
const getDueDateStatus = (dueDate) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / 864e5);
    if (diffDays < 0)  return { label: "Overdue",             color: "var(--danger)",  bg: "var(--danger-bg)" };
    if (diffDays === 0) return { label: "Due today",           color: "var(--warning)", bg: "var(--warning-bg)" };
    if (diffDays <= 3) return { label: `Due in ${diffDays}d`, color: "var(--warning)", bg: "var(--warning-bg)" };
    return { label: `Due ${due.toLocaleDateString()}`, color: "var(--success)", bg: "var(--success-bg)" };
};
const EMPTY_FORM = { title: "", description: "", type: "", status: "Draft", dueDate: "" };

export default function Documents() {
    const qc = useQueryClient();
    const { user } = useAuthStore();
    const width = useWindowWidth();
    const isMobile = width < 768;
    const location = useLocation();
    const [search, setSearch] = useState("");
    const [filterStatus, setFS] = useState(location.state?.filter || "All");
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [newStatus, setNewStatus] = useState("");
    const [page, setPage] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const PER_PAGE = 10;

    const { data: docs = [], isLoading, error } = useQuery({ queryKey: ["documents"], queryFn: fetchDocs });

    const trigger = useMutation({
        mutationFn: triggerWorkflow,
        onSuccess: () => { qc.invalidateQueries(["documents"]); setModal(null); },
        onError: (err) => alert(err.response?.data?.error || err.response?.data?.message || "No matching workflow rule found"),
    });
    const create = useMutation({
        mutationFn: createDoc,
        onSuccess: () => { qc.invalidateQueries(["documents"]); setModal(null); setForm(EMPTY_FORM); },
    });
    const patch = useMutation({
        mutationFn: patchStatus,
        onSuccess: () => { qc.invalidateQueries(["documents"]); setModal(null); },
    });
    const remove = useMutation({ mutationFn: deleteDoc, onSuccess: () => qc.invalidateQueries(["documents"]) });
    const removeFile = useMutation({
        mutationFn: deleteFile,
        onSuccess: () => {
            qc.invalidateQueries(["documents"]);
            setSelected((prev) => prev ? { ...prev, fileUrl: null, fileName: null } : null);
        },
    });
    const dueDateMut = useMutation({
        mutationFn: updateDueDate,
        onSuccess: () => qc.invalidateQueries(["documents"]),
    });

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const openView   = (doc) => { setSelected(doc); setModal("view"); setUploadError(""); };
    const openStatus = (doc) => { setSelected(doc); setNewStatus(doc.status); setModal("status"); };
    const openCreate = () => { setForm(EMPTY_FORM); setModal("create"); };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selected) return;
        setUploading(true); setUploadError("");
        try {
            const result = await uploadFile({ id: selected.id, file });
            qc.invalidateQueries(["documents"]);
            setSelected((prev) => prev ? { ...prev, fileUrl: result.fileUrl, fileName: result.fileName } : null);
        } catch (err) {
            setUploadError(err.response?.data?.error || "Upload failed");
        } finally { setUploading(false); }
    };

    const filtered = docs.filter((d) => {
        const matchSearch = d.title?.toLowerCase().includes(search.toLowerCase()) ||
                            d.type?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "All" ||
            d.status === STATUS_MAP[filterStatus] || d.status === filterStatus;
        return matchSearch && matchStatus;
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
        <AppLayout>
            <style>{`
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                .doc-primary-btn {
                    display: inline-flex; align-items: center; gap: 7px;
                    height: 36px; padding: 0 16px;
                    background: var(--accent-gradient);
                    border: none; border-radius: 12px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity var(--duration-base), transform var(--duration-base);
                    box-shadow: var(--shadow-accent); white-space: nowrap;
                }
                .doc-primary-btn:hover { opacity: 0.88; transform: translateY(-1px); }
                .doc-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .doc-ghost-btn {
                    padding: 0 16px; height: 36px;
                    background: transparent;
                    border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: background var(--duration-fast), color var(--duration-fast);
                }
                .doc-ghost-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
                .doc-search {
                    padding: 9px 14px 9px 38px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; outline: none;
                    font-family: 'Inter', sans-serif;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
                    box-sizing: border-box;
                }
                .doc-search:focus { border-color: var(--accent-from); box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
                .doc-search::placeholder { color: var(--text-tertiary); }
                .filter-btn {
                    padding: 6px 12px;
                    background: transparent;
                    border: 1px solid var(--border-subtle);
                    border-radius: 8px; color: var(--text-tertiary);
                    font-size: 12px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: all var(--duration-fast); white-space: nowrap;
                }
                .filter-btn:hover { background: var(--bg-card-hover); color: var(--text-secondary); }
                .filter-btn.active { background: rgba(79,70,229,0.18); border-color: rgba(79,70,229,0.45); color: #818cf8; }
                .doc-row { border-bottom: 1px solid var(--border-subtle); transition: background var(--duration-fast); }
                .doc-row:hover { background: var(--bg-card-hover); }
                .doc-row:last-child { border-bottom: none; }
                .action-icon-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 32px; height: 32px; border-radius: 50%;
                    background: none; border: 1px solid var(--border-subtle);
                    cursor: pointer; color: var(--text-tertiary);
                    transition: background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast);
                    flex-shrink: 0;
                }
                .action-icon-btn:hover { background: var(--bg-card-hover); color: var(--text-secondary); border-color: var(--border-default); }
                .action-icon-btn.danger:hover { background: var(--danger-bg); color: var(--danger); border-color: rgba(248,113,113,0.3); }
                .page-btn {
                    padding: 7px 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 8px; color: var(--text-secondary);
                    font-size: 12px; cursor: pointer;
                    font-family: 'Inter', sans-serif; transition: all var(--duration-fast);
                }
                .page-btn:hover:not(:disabled) { background: var(--bg-card-hover); color: var(--text-primary); }
                .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .modal-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 100; padding: 20px;
                }
                .modal-box {
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-subtle);
                    border-radius: 16px; width: 100%; max-width: 480px;
                    max-height: 90vh; display: flex; flex-direction: column;
                    box-shadow: var(--shadow-lg);
                    animation: scaleIn 0.2s var(--ease-out) both;
                }
                .modal-close-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 28px; height: 28px; border-radius: 50%;
                    background: var(--bg-card); border: 1px solid var(--border-subtle);
                    color: var(--text-tertiary); cursor: pointer;
                    transition: background var(--duration-fast), color var(--duration-fast);
                }
                .modal-close-btn:hover { background: var(--bg-card-hover); color: var(--text-secondary); }
                .doc-input {
                    width: 100%; height: 40px; padding: 0 12px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 14px; outline: none; box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
                }
                .doc-input:focus { border-color: var(--accent-from); box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
                textarea.doc-input { height: auto; padding: 10px 12px; }
                select.doc-input { cursor: pointer; }
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
                .upload-zone {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 8px 14px;
                    background: var(--bg-card); border: 1px dashed var(--border-default);
                    border-radius: 8px; color: var(--text-tertiary);
                    font-size: 12px; cursor: pointer; font-family: 'Inter', sans-serif;
                    transition: background var(--duration-fast), border-color var(--duration-fast), color var(--duration-fast);
                }
                .upload-zone:hover { background: var(--bg-card-hover); border-color: rgba(71,191,255,0.35); color: var(--accent-to); }
                .info-card {
                    padding: 14px; background: var(--bg-card);
                    border-radius: 10px; border: 1px solid var(--border-subtle);
                }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 24, animation: 'fadeUp 0.3s ease both' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Documents</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>{docs.length} total · {filtered.length} shown</p>
                    </div>
                    <button className="doc-primary-btn" onClick={openCreate}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        New Document
                    </button>
                </div>

                {/* Filter bar */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 20, animation: 'fadeUp 0.35s ease both' }}>
                    <div style={{ position: 'relative', width: isMobile ? '100%' : 260 }}>
                        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </span>
                        <input className="doc-search" style={{ width: '100%' }} placeholder="Search by title or type" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {["All", ...STATUS_OPTIONS].map((st) => (
                            <button key={st} className={`filter-btn${filterStatus === st ? ' active' : ''}`} onClick={() => { setFS(st); setPage(1); }}>
                                {st === 'InReview' ? 'In Review' : st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table card */}
                <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', animation: 'fadeUp 0.4s ease both', boxShadow: '0 8px 40px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.08) inset' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                    ) : error ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                            <p style={{ color: 'var(--danger)', margin: 0 }}>Failed to load documents</p>
                        </div>
                    ) : paginated.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
                            <div style={{ opacity: 0.3 }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            </div>
                            <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 13 }}>
                                {search ? 'No documents match your search.' : 'No documents yet.'}
                            </p>
                            {!search && <button className="doc-primary-btn" onClick={openCreate}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                Create one
                            </button>}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {['Title', 'Type', 'Status', 'Due Date', 'File', 'Created', ''].map((h) => (
                                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((doc) => {
                                        const sc = STATUS_COLORS[doc.status] ?? STATUS_COLORS[0];
                                        const ds = getDueDateStatus(doc.dueDate);
                                        return (
                                            <tr key={doc.id} className="doc-row">
                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle' }}>
                                                    <span style={{ display: 'block', fontWeight: 600, cursor: 'pointer', color: 'var(--accent-to)', fontSize: 13 }} onClick={() => openView(doc)}>
                                                        {doc.title}
                                                    </span>
                                                    {doc.description && (
                                                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                            {doc.description.slice(0, 60)}{doc.description.length > 60 ? '…' : ''}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle' }}>
                                                    <span style={{ padding: '3px 9px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                                        {doc.type || 'n/a'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle' }}>
                                                    <span style={{ background: sc.bg, color: sc.color, padding: '5px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600 }}>
                                                        {getStatusLabel(doc.status)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                                    {ds ? (
                                                        <span style={{ background: ds.bg, color: ds.color, padding: '5px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600 }}>{ds.label}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle' }}>
                                                    {doc.fileUrl ? (
                                                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-to)', fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                                            {doc.fileName || 'View file'}
                                                        </a>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>No file</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle', color: 'var(--text-tertiary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'n/a'}
                                                </td>
                                                <td style={{ padding: '15px 16px', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                        <button className="action-icon-btn" title="Update status" onClick={() => openStatus(doc)}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                        </button>
                                                        <button className="action-icon-btn danger" title="Delete document" onClick={() => { if (window.confirm('Delete ' + doc.title + '?')) remove.mutate(doc.id); }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 18 }}>
                        <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 500 }}>Page {page} of {totalPages}</span>
                        <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
                    </div>
                )}
            </div>

            {/* Create modal */}
            {modal === 'create' && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>New Document</h2>
                            <button className="modal-close-btn" onClick={() => setModal(null)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <Field label="Title"><input className="doc-input" value={form.title} onChange={set('title')} placeholder="Document title" /></Field>
                            <Field label="Type"><input className="doc-input" value={form.type} onChange={set('type')} placeholder="e.g. Memo, Request, Report" /></Field>
                            <Field label="Description"><textarea className="doc-input" style={{ height: 80, resize: 'vertical' }} value={form.description} onChange={set('description')} placeholder="Optional description" /></Field>
                            <Field label="Due Date (optional)"><input className="doc-input" type="date" value={form.dueDate} onChange={set('dueDate')} /></Field>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button className="doc-ghost-btn" onClick={() => setModal(null)}>Cancel</button>
                                <button className="modal-submit-btn" style={{ flex: 1 }} disabled={create.isPending} onClick={() => {
                                    if (!form.title.trim()) return;
                                    create.mutate({
                                        title: form.title,
                                        description: form.description || null,
                                        type: form.type || null,
                                        ownerId: user?.id,
                                        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
                                        status: 0,
                                    });
                                }}>
                                    {create.isPending ? 'Creating…' : 'Create Document'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View modal */}
            {modal === 'view' && selected && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>{selected.title}</h2>
                            <button className="modal-close-btn" onClick={() => setModal(null)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div className="info-card">
                                    <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Type</p>
                                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{selected.type || 'n/a'}</p>
                                </div>
                                <div className="info-card">
                                    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Status</p>
                                    {(() => { const sc = STATUS_COLORS[selected.status] ?? STATUS_COLORS[0]; return (
                                        <span style={{ background: sc.bg, color: sc.color, padding: '5px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600 }}>
                                            {getStatusLabel(selected.status)}
                                        </span>
                                    ); })()}
                                </div>
                            </div>
                            <div className="info-card">
                                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Description</p>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.description || 'n/a'}</p>
                            </div>
                            <div className="info-card">
                                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Created</p>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : 'n/a'}</p>
                            </div>
                            <div className="info-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <div>
                                    <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Due Date</p>
                                    {(() => {
                                        const ds = getDueDateStatus(selected.dueDate);
                                        if (!ds) return <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>No due date set</p>;
                                        return <span style={{ background: ds.bg, color: ds.color, padding: '5px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600 }}>{ds.label}</span>;
                                    })()}
                                </div>
                                <input type="date" className="doc-input" style={{ width: 'auto', fontSize: 12, height: 36 }}
                                    value={selected.dueDate ? new Date(selected.dueDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                        const val = e.target.value || null;
                                        dueDateMut.mutate({ id: selected.id, dueDate: val });
                                        setSelected(prev => prev ? { ...prev, dueDate: val } : null);
                                    }}
                                />
                            </div>
                            <div style={{ padding: 14, background: 'rgba(79,70,229,0.06)', borderRadius: 10, border: '1px solid rgba(79,70,229,0.2)' }}>
                                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#818cf8', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Workflow</p>
                                <p style={{ margin: '4px 0 10px', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                                    Automatically route this document based on workflow rules.
                                </p>
                                <button className="doc-primary-btn" style={{ fontSize: 12, height: 32 }} disabled={trigger.isPending} onClick={() => trigger.mutate(selected.id)}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                    {trigger.isPending ? 'Triggering…' : 'Trigger Workflow'}
                                </button>
                            </div>
                            <div className="info-card">
                                <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Attached File</p>
                                {selected.fileUrl ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '8px 12px', background: 'rgba(71,191,255,0.06)', borderRadius: 8, border: '1px solid rgba(71,191,255,0.15)' }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{selected.fileName || 'File'}</span>
                                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                            <a href={selected.fileUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '4px 10px', background: 'rgba(71,191,255,0.12)', border: '1px solid rgba(71,191,255,0.2)', borderRadius: 6, color: 'var(--accent-to)', fontSize: 12, textDecoration: 'none' }}>Download</a>
                                            <button className="action-icon-btn danger" title="Remove file" onClick={() => { if (window.confirm('Remove this file?')) removeFile.mutate(selected.id); }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-tertiary)' }}>No file attached</p>
                                )}
                                <label style={{ cursor: 'pointer' }}>
                                    <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                                    <span className="upload-zone">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
                                        {uploading ? 'Uploading…' : selected.fileUrl ? 'Replace file' : 'Upload PDF or DOCX'}
                                    </span>
                                </label>
                                {uploadError && <p style={{ color: 'var(--danger)', fontSize: 12, margin: '8px 0 0' }}>{uploadError}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status modal */}
            {modal === 'status' && selected && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Update Status</h2>
                            <button className="modal-close-btn" onClick={() => setModal(null)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                                Updating status for <strong style={{ color: 'var(--text-primary)' }}>{selected.title}</strong>
                            </p>
                            <Field label="New Status">
                                <select className="doc-input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                                    {STATUS_OPTIONS.map((st) => <option key={st}>{st}</option>)}
                                </select>
                            </Field>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button className="doc-ghost-btn" onClick={() => setModal(null)}>Cancel</button>
                                <button className="modal-submit-btn" style={{ flex: 1 }} disabled={patch.isPending} onClick={() => patch.mutate({ id: selected.id, status: newStatus })}>
                                    {patch.isPending ? 'Saving…' : 'Update Status'}
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
