import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";

const fetchDocuments = () => client.get("/Documents").then((r) => r.data);
const fetchUsers = () => client.get("/Users").then((r) => r.data);
const fetchRouting = (docId) => client.get("/Documents/" + docId + "/routing").then((r) => r.data);
const createRoute = ({ documentId, ...body }) =>
    client.post("/Documents/" + documentId + "/routing", body).then((r) => r.data);

const STATUS_COLORS = {
    0: { bg: "rgba(255,255,255,0.06)", color: "#8f98a0" },
    1: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    2: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
    3: { bg: "rgba(201,64,64,0.12)", color: "#c94040" },
    Pending: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    InProgress: { bg: "rgba(71,191,255,0.12)", color: "#47bfff" },
    Completed: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
    Rejected: { bg: "rgba(201,64,64,0.12)", color: "#c94040" },
};
const EMPTY = { documentId: "", toUserId: "", notes: "" };

export default function Routing() {
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [search, setSearch] = useState("");
    const [selDocId, setSelDocId] = useState(null);

    const { data: documents = [] } = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });
    const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

    const { data: events = [], isLoading } = useQuery({
        queryKey: ["routing", selDocId],
        queryFn: () => fetchRouting(selDocId),
        enabled: !!selDocId,
    });

    const create = useMutation({
        mutationFn: createRoute,
        onSuccess: () => {
            qc.invalidateQueries(["routing", form.documentId]);
            setModal(false);
            setSelDocId(form.documentId);
            setForm(EMPTY);
        },
    });

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const filteredDocs = documents.filter((d) =>
        d.title && d.title.toLowerCase().includes(search.toLowerCase())
    );

    const userName = (id) => {
        const u = users.find((u) => u.id === id);
        if (!u) return id;
        if (u.firstName || u.lastName) return (u.firstName + " " + u.lastName).trim();
        if (u.fullName) return u.fullName;
        if (u.email) return u.email;
        return "Unknown";
    };

    return (
        <AppLayout>
            <div style={s.page}>

                <div style={{ ...s.pageHeader, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
                    <div>
                        <h1 style={s.pageTitle}>Routing</h1>
                        <p style={s.pageSub}>Route documents between users and track history</p>
                    </div>
                    <button onClick={() => { setForm(EMPTY); setModal(true); }} style={s.primaryBtn}>
                        + Route Document
                    </button>
                </div>

                {/* Document selector */}
                <div style={s.docSelector}>
                    <p style={s.sectionLabel}>SELECT A DOCUMENT TO VIEW ROUTING HISTORY</p>
                    <input
                        style={{ ...s.searchInput, width: "100%", marginBottom: 12, boxSizing: "border-box" }}
                        placeholder="Search documents..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div style={{ ...s.docList, flexDirection: isMobile ? "column" : "row" }}>
                        {filteredDocs.length === 0 ? (
                            <p style={{ color: "#8f98a0", fontSize: 13, padding: "12px 0", margin: 0 }}>No documents found</p>
                        ) : (
                            filteredDocs.map((doc) => (
                                <div
                                    key={doc.id}
                                    onClick={() => setSelDocId(doc.id)}
                                    style={{
                                        ...s.docChip,
                                        ...(selDocId === doc.id ? s.docChipActive : {}),
                                        width: isMobile ? "100%" : "auto",
                                    }}
                                >
                                    {doc.title}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Routing history */}
                {selDocId && (
                    <div style={s.tableWrap}>
                        <div style={s.tableHeader}>
                            <span style={s.tableTitle}>
                                Routing history — {documents.find((d) => d.id === selDocId)?.title}
                            </span>
                        </div>
                        {isLoading ? (
                            <div style={s.centered}><Spinner /></div>
                        ) : events.length === 0 ? (
                            <div style={s.centered}>
                                <p style={{ color: "#8f98a0" }}>No routing events for this document</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={s.table}>
                                    <thead>
                                        <tr>
                                            {["Routed To", "Notes", "Status", "Date"].map((h) => (
                                                <th key={h} style={s.th}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.map((ev) => {
                                            const sc = STATUS_COLORS[ev.status] || STATUS_COLORS.Pending;
                                            return (
                                                <tr
                                                    key={ev.id}
                                                    style={s.tr}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                                >
                                                    <td style={s.td}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            <div style={s.miniAvatar}>
                                                                {(userName(ev.toUserId)?.[0] || "?").toUpperCase()}
                                                            </div>
                                                            <span style={{ whiteSpace: "nowrap" }}>{userName(ev.toUserId)}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...s.td, color: "#8f98a0", fontSize: 12 }}>{ev.notes || "—"}</td>
                                                    <td style={s.td}>
                                                        <span style={{ ...s.pill, background: sc.bg, color: sc.color }}>
                                                            {ev.statusAfter || ev.status || "Pending"}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...s.td, color: "#8f98a0", fontSize: 12, whiteSpace: "nowrap" }}>
                                                        {ev.timestamp || ev.createdAt ? new Date(ev.timestamp || ev.createdAt).toLocaleDateString() : "—"}
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

            {modal && (
                <Modal title="Route Document" onClose={() => { setModal(false); setForm(EMPTY); }} isMobile={isMobile}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="Document *">
                            <select style={s.input} value={form.documentId} onChange={set("documentId")}>
                                <option value="">Select a document...</option>
                                {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                            </select>
                        </Field>
                        <Field label="Route To *">
                            <select style={s.input} value={form.toUserId} onChange={set("toUserId")}>
                                <option value="">Select a user...</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {(u.firstName + " " + u.lastName).trim() || u.email} — {u.email}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Notes">
                            <textarea
                                style={{ ...s.input, height: 70, resize: "vertical" }}
                                value={form.notes}
                                onChange={set("notes")}
                                placeholder="Optional instructions..."
                            />
                        </Field>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                            <button style={s.ghostBtn} onClick={() => { setModal(false); setForm(EMPTY); }}>Cancel</button>
                            <button
                                style={s.primaryBtn}
                                disabled={!form.documentId || !form.toUserId || create.isPending}
                                onClick={() => create.mutate(form)}
                            >
                                {create.isPending ? "Routing..." : "Route"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}

function Field({ label, children }) {
    return <div><label style={s.fieldLabel}>{label}</label><div style={{ marginTop: 4 }}>{children}</div></div>;
}

function Modal({ title, onClose, children, isMobile }) {
    return (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={{
                ...s.modal,
                maxWidth: isMobile ? "100%" : 460,
                maxHeight: isMobile ? "100vh" : "90vh",
                borderRadius: isMobile ? 0 : 6,
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
    return <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(71,191,255,0.2)", borderTopColor: "#47bfff", animation: "dtSpin 0.8s linear infinite" }} />;
}

const s = {
    page: { padding: "24px 16px", color: "#c6d4df", fontFamily: "'Segoe UI', sans-serif" },
    pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
    pageTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: "#c6d4df" },
    pageSub: { margin: "4px 0 0", fontSize: 12, color: "#8f98a0" },
    sectionLabel: { margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "#4a7fa5", letterSpacing: "0.08em" },
    docSelector: { background: "#171a21", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: 16, marginBottom: 20 },
    searchInput: { padding: "8px 12px", background: "#0e1621", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#c6d4df", fontSize: 13, outline: "none" },
    docList: { display: "flex", flexWrap: "wrap", gap: 8 },
    docChip: { padding: "6px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, fontSize: 12, color: "#8f98a0", cursor: "pointer" },
    docChipActive: { background: "rgba(79,70,229,0.2)", borderColor: "#4F46E5", color: "#818cf8" },
    tableWrap: { background: "#171a21", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" },
    tableHeader: { padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
    tableTitle: { fontSize: 14, fontWeight: 600, color: "#c6d4df" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#4a7fa5", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" },
    tr: { borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" },
    td: { padding: "12px 16px", fontSize: 13, color: "#c6d4df", verticalAlign: "middle" },
    pill: { padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
    miniAvatar: { width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#47bfff,#4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0 },
    centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48 },
    primaryBtn: { padding: "9px 18px", background: "linear-gradient(to bottom,#47bfff 5%,#1a44c2 95%)", border: "none", borderRadius: 3, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    ghostBtn: { padding: "9px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#8f98a0", fontSize: 13, cursor: "pointer" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
    modal: { background: "#1b2838", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" },
    modalTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#c6d4df" },
    closeBtn: { background: "none", border: "none", color: "#8f98a0", fontSize: 16, cursor: "pointer" },
    modalBody: { padding: 20, overflowY: "auto" },
    fieldLabel: { fontSize: 11, fontWeight: 700, color: "#4a7fa5", letterSpacing: "0.05em", margin: 0 },
    input: { width: "100%", padding: "9px 12px", background: "#0e1621", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#c6d4df", fontSize: 13, outline: "none", boxSizing: "border-box" },
};