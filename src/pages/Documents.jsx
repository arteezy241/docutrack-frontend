import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";


const triggerWorkflow = (id) => client.post("/workflow/trigger/" + id).then((r) => r.data);
const fetchDocs = () => client.get("/Documents").then((r) => r.data);
const createDoc = (body) => client.post("/Documents", body).then((r) => r.data);
const patchStatus = ({ id, status }) =>
    client.patch("/Documents/" + id + "/status", {
        status: STATUS_MAP[status] ?? status
    }).then((r) => r.data);
const deleteDoc = (id) => client.delete("/Documents/" + id).then((r) => r.data);
const deleteFile = (id) => client.delete("/Documents/" + id + "/file").then((r) => r.data);
const uploadFile = ({ id, file }) => {
    const form = new FormData();
    form.append("file", file);
    return client.post("/Documents/" + id + "/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
};

const STATUS_OPTIONS = ["Draft", "InReview", "Approved", "Rejected", "Archived"];

const STATUS_MAP = {
    "Draft": 0,
    "InReview": 1,
    "Approved": 2,
    "Rejected": 3,
    "Archived": 4,
};

const STATUS_COLORS = {
    Draft: { bg: "rgba(255,255,255,0.06)", color: "#8f98a0" },
    InReview: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    Approved: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
    Rejected: { bg: "rgba(201,64,64,0.12)", color: "#c94040" },
    Archived: { bg: "rgba(79,70,229,0.15)", color: "#818cf8" },
    0: { bg: "rgba(255,255,255,0.06)", color: "#8f98a0" },
    1: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    2: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
    3: { bg: "rgba(201,64,64,0.12)", color: "#c94040" },
    4: { bg: "rgba(79,70,229,0.15)", color: "#818cf8" },
};

const getStatusLabel = (status) => {
    const labels = {
        0: "Draft", 1: "In Review", 2: "Approved", 3: "Rejected", 4: "Archived",
        Draft: "Draft", InReview: "In Review", Approved: "Approved",
        Rejected: "Rejected", Archived: "Archived",
    };
    return labels[status] || String(status);
};

const EMPTY_FORM = { title: "", description: "", type: "", status: "Draft" };

export default function Documents() {
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [search, setSearch] = useState("");
    const [filterStatus, setFS] = useState("All");
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [newStatus, setNewStatus] = useState("");
    const [page, setPage] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const PER_PAGE = 10;

    const { data: docs = [], isLoading, error } = useQuery({
        queryKey: ["documents"],
        queryFn: fetchDocs,
    });
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
    const remove = useMutation({
        mutationFn: deleteDoc,
        onSuccess: () => qc.invalidateQueries(["documents"]),
    });
    const removeFile = useMutation({
        mutationFn: deleteFile,
        onSuccess: () => {
            qc.invalidateQueries(["documents"]);
            setSelected((prev) => prev ? { ...prev, fileUrl: null, fileName: null } : null);
        },
    });

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const openView = (doc) => { setSelected(doc); setModal("view"); setUploadError(""); };
    const openStatus = (doc) => { setSelected(doc); setNewStatus(doc.status); setModal("status"); };
    const openCreate = () => { setForm(EMPTY_FORM); setModal("create"); };

    const handleFileUpload = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file || !selected) return;
        setUploading(true);
        setUploadError("");
        try {
            const result = await uploadFile({ id: selected.id, file });
            qc.invalidateQueries(["documents"]);
            setSelected((prev) => prev ? { ...prev, fileUrl: result.fileUrl, fileName: result.fileName } : null);
        } catch (err) {
            setUploadError(err.response && err.response.data && err.response.data.error ? err.response.data.error : "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const filtered = docs.filter((d) => {
        const matchSearch = (d.title && d.title.toLowerCase().includes(search.toLowerCase())) || (d.type && d.type.toLowerCase().includes(search.toLowerCase()));
        const matchStatus = filterStatus === "All" || d.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
        <AppLayout>
            <div style={s.page}>

                <div style={{ ...s.pageHeader, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
                    <div>
                        <h1 style={s.pageTitle}>Documents</h1>
                        <p style={s.pageSub}>{docs.length} total · {filtered.length} shown</p>
                    </div>
                    <button onClick={openCreate} style={s.primaryBtn}>+ New Document</button>
                </div>

                <div style={{ ...s.filterBar, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center" }}>
                    <input
                        style={{ ...s.searchInput, width: isMobile ? "100%" : "auto" }}
                        placeholder="Search by title or type"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                    <div style={s.filterGroup}>
                        {["All", ...STATUS_OPTIONS].map((st) => (
                            <button
                                key={st}
                                onClick={() => { setFS(st); setPage(1); }}
                                style={{ ...s.filterBtn, ...(filterStatus === st ? s.filterBtnActive : {}) }}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={s.tableWrap}>
                    {isLoading ? (
                        <div style={s.centered}><Spinner /></div>
                    ) : error ? (
                        <div style={s.centered}><p style={{ color: "#c94040" }}>Failed to load documents</p></div>
                    ) : paginated.length === 0 ? (
                        <div style={s.centered}>
                            <p style={{ color: "#8f98a0" }}>No documents found</p>
                            <button onClick={openCreate} style={{ ...s.primaryBtn, marginTop: 12 }}>Create one</button>
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={s.table}>
                                <thead>
                                    <tr>
                                        {["Title", "Type", "Status", "File", "Created", ""].map((h) => (
                                            <th key={h} style={s.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((doc) => {
                                        const sc = STATUS_COLORS[doc.status] ?? STATUS_COLORS[0];
                                        return (
                                            <tr
                                                key={doc.id}
                                                style={s.tr}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                            >
                                                <td style={s.td}>
                                                    <span style={s.docTitle} onClick={() => openView(doc)}>{doc.title}</span>
                                                    {doc.description && (
                                                        <span style={s.docDesc}>{doc.description.slice(0, 60)}{doc.description.length > 60 ? "..." : ""}</span>
                                                    )}
                                                </td>
                                                <td style={s.td}><span style={s.typePill}>{doc.type || "n/a"}</span></td>
                                                <td style={s.td}>
                                                    <span style={{ ...s.statusPill, background: sc.bg, color: sc.color }}>
                                                        {getStatusLabel(doc.status)}
                                                    </span>
                                                </td>
                                                <td style={s.td}>
                                                    {doc.fileUrl ? (
                                                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#47bfff", fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>
                                                            {doc.fileName || "View file"}
                                                        </a>
                                                    ) : (
                                                        <span style={{ color: "#8f98a0", fontSize: 12 }}>No file</span>
                                                    )}
                                                </td>
                                                <td style={{ ...s.td, color: "#8f98a0", fontSize: 12, whiteSpace: "nowrap" }}>
                                                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "n/a"}
                                                </td>
                                                <td style={{ ...s.td, textAlign: "right", whiteSpace: "nowrap" }}>
                                                    <button style={s.iconBtn} onClick={() => openStatus(doc)}>Status</button>
                                                    <button style={{ ...s.iconBtn, color: "#c94040" }} onClick={() => { if (window.confirm("Delete " + doc.title + "?")) remove.mutate(doc.id); }}>Delete</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div style={s.pagination}>
                        <button style={s.pageBtn} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                        <span style={{ color: "#8f98a0", fontSize: 12 }}>Page {page} of {totalPages}</span>
                        <button style={s.pageBtn} disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                    </div>
                )}
            </div>

            {modal === "create" && (
                <Modal title="New Document" onClose={() => setModal(null)} isMobile={isMobile}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="Title">
                            <input style={s.input} value={form.title} onChange={set("title")} placeholder="Document title" />
                        </Field>
                        <Field label="Type">
                            <input style={s.input} value={form.type} onChange={set("type")} placeholder="e.g. Memo, Request, Report" />
                        </Field>
                        <Field label="Description">
                            <textarea style={{ ...s.input, height: 80, resize: "vertical" }} value={form.description} onChange={set("description")} placeholder="Optional description" />
                        </Field>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                            <button style={s.ghostBtn} onClick={() => setModal(null)}>Cancel</button>
                            <button style={s.primaryBtn} onClick={() => { if (form.title.trim()) create.mutate(form); }} disabled={create.isPending}>
                                {create.isPending ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {modal === "view" && selected && (
                <Modal title={selected.title} onClose={() => setModal(null)} isMobile={isMobile}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                            <p style={s.fieldLabel}>Type</p>
                            <p style={{ margin: 0, fontSize: 14, color: "#c6d4df" }}>{selected.type || "n/a"}</p>
                        </div>
                        <div>
                            <p style={s.fieldLabel}>Status</p>
                            <p style={{ margin: 0, fontSize: 14, color: "#c6d4df" }}>{getStatusLabel(selected.status)}</p>
                        </div>
                        <div>
                            <p style={s.fieldLabel}>Description</p>
                            <p style={{ margin: 0, fontSize: 14, color: "#c6d4df" }}>{selected.description || "n/a"}</p>
                        </div>
                        <div>
                            <p style={s.fieldLabel}>Created</p>
                            <p style={{ margin: 0, fontSize: 14, color: "#c6d4df" }}>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "n/a"}</p>
                        </div>
                        {/* Workflow trigger */}
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14, marginTop: 4 }}>
                            <p style={s.fieldLabel}>WORKFLOW</p>
                            <p style={{ margin: "4px 0 8px", fontSize: 12, color: "#8f98a0" }}>
                                Automatically route this document based on workflow rules.
                            </p>
                            <button
                                style={{ ...s.primaryBtn, fontSize: 12, padding: "6px 14px" }}
                                disabled={trigger.isPending}
                                onClick={() => trigger.mutate(selected.id)}
                            >
                                {trigger.isPending ? "Triggering..." : "Trigger Workflow"}
                            </button>
                        </div>

                        
                        <div style={s.fileSection}>
                            <p style={s.fieldLabel}>ATTACHED FILE</p>
                            {selected.fileUrl ? (
                                <div style={s.fileRow}>
                                    <span style={{ fontSize: 13, color: "#c6d4df", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{selected.fileName || "File"}</span>
                                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                        <a href={selected.fileUrl} target="_blank" rel="noopener noreferrer" style={s.downloadBtn}>Download</a>
                                        <button style={{ ...s.iconBtn, color: "#c94040" }} onClick={() => { if (window.confirm("Remove this file?")) removeFile.mutate(selected.id); }}>Remove</button>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ margin: "4px 0 8px", fontSize: 12, color: "#8f98a0" }}>No file attached</p>
                            )}
                            <label style={{ display: "inline-block", cursor: "pointer", marginTop: 8 }}>
                                <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={handleFileUpload} disabled={uploading} />
                                <span style={s.uploadBtn}>{uploading ? "Uploading..." : selected.fileUrl ? "Replace file" : "Upload PDF or DOCX"}</span>
                            </label>
                            {uploadError && <p style={{ color: "#c94040", fontSize: 12, margin: "6px 0 0" }}>{uploadError}</p>}
                        </div>
                    </div>
                </Modal>
            )}

            {modal === "status" && selected && (
                <Modal title={"Update Status — " + selected.title} onClose={() => setModal(null)} isMobile={isMobile}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="New Status">
                            <select style={s.input} value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                                {STATUS_OPTIONS.map((st) => (<option key={st}>{st}</option>))}
                            </select>
                        </Field>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                            <button style={s.ghostBtn} onClick={() => setModal(null)}>Cancel</button>
                            <button style={s.primaryBtn} disabled={patch.isPending} onClick={() => patch.mutate({ id: selected.id, status: newStatus })}>
                                {patch.isPending ? "Saving..." : "Update Status"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
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

function Modal({ title, onClose, children, isMobile }) {
    return (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={{
                ...s.modal,
                maxWidth: isMobile ? "100%" : 480,
                maxHeight: isMobile ? "100vh" : "90vh",
                borderRadius: isMobile ? 0 : 6,
                margin: isMobile ? 0 : "auto",
                width: "100%",
            }}>
                <div style={s.modalHeader}>
                    <h2 style={s.modalTitle}>{title}</h2>
                    <button style={s.closeBtn} onClick={onClose}>X</button>
                </div>
                <div style={s.modalBody}>{children}</div>
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(71,191,255,0.2)", borderTopColor: "#47bfff", animation: "dtSpin 0.8s linear infinite" }} />
    );
}

const s = {
    page: { padding: "24px 16px", color: "#c6d4df", fontFamily: "'Segoe UI', sans-serif" },
    pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
    pageTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: "#c6d4df" },
    pageSub: { margin: "4px 0 0", fontSize: 12, color: "#8f98a0" },
    filterBar: { display: "flex", gap: 12, marginBottom: 18 },
    searchInput: { padding: "8px 12px", background: "#171a21", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#c6d4df", fontSize: 13, outline: "none", boxSizing: "border-box" },
    filterGroup: { display: "flex", gap: 4, flexWrap: "wrap" },
    filterBtn: { padding: "6px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#8f98a0", fontSize: 12, cursor: "pointer" },
    filterBtnActive: { background: "rgba(79,70,229,0.2)", borderColor: "#4F46E5", color: "#818cf8" },
    tableWrap: { background: "#171a21", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", minHeight: 200 },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#4a7fa5", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" },
    tr: { borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" },
    td: { padding: "12px 16px", fontSize: 13, color: "#c6d4df", verticalAlign: "middle" },
    docTitle: { display: "block", fontWeight: 600, cursor: "pointer", color: "#47bfff" },
    docDesc: { display: "block", fontSize: 11, color: "#8f98a0", marginTop: 2 },
    typePill: { padding: "2px 8px", background: "rgba(255,255,255,0.06)", borderRadius: 3, fontSize: 11, color: "#8f98a0" },
    statusPill: { padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "#8f98a0", fontSize: 12, padding: "4px 6px", borderRadius: 3 },
    centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48 },
    pagination: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 16 },
    pageBtn: { padding: "6px 14px", background: "#171a21", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#8f98a0", fontSize: 12, cursor: "pointer" },
    primaryBtn: { padding: "9px 18px", background: "linear-gradient(to bottom, #47bfff 5%, #1a44c2 95%)", border: "none", borderRadius: 3, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    ghostBtn: { padding: "9px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#8f98a0", fontSize: 13, cursor: "pointer" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: isMobile => isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 100, padding: 0 },
    modal: { background: "#1b2838", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" },
    modalTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#c6d4df" },
    closeBtn: { background: "none", border: "none", color: "#8f98a0", fontSize: 16, cursor: "pointer" },
    modalBody: { padding: 20, overflowY: "auto" },
    fieldLabel: { fontSize: 11, fontWeight: 700, color: "#4a7fa5", letterSpacing: "0.05em", margin: "0 0 4px" },
    input: { width: "100%", padding: "9px 12px", background: "#171a21", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#c6d4df", fontSize: 13, outline: "none", boxSizing: "border-box" },
    fileSection: { borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14, marginTop: 4 },
    fileRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 4 },
    downloadBtn: { padding: "4px 10px", background: "rgba(71,191,255,0.12)", border: "1px solid rgba(71,191,255,0.2)", borderRadius: 3, color: "#47bfff", fontSize: 12, textDecoration: "none" },
    uploadBtn: { padding: "6px 14px", background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 4, color: "#8f98a0", fontSize: 12, display: "inline-block" },
};