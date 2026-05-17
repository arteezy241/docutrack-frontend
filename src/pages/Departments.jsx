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
        (d.name && d.name.toLowerCase().includes(search.toLowerCase())) ||
        (d.description && d.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <AppLayout>
            <div style={s.page}>

                <div style={{ ...s.pageHeader, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
                    <div>
                        <h1 style={s.pageTitle}>Departments</h1>
                        <p style={s.pageSub}>{depts.length} departments · {users.length} total users</p>
                    </div>
                    <button onClick={() => { setForm(EMPTY); setModal(true); }} style={s.primaryBtn}>
                        + New Department
                    </button>
                </div>

                <input
                    style={{ ...s.searchInput, width: "100%", marginBottom: 20, boxSizing: "border-box" }}
                    placeholder="Search departments..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {isLoading ? (
                    <div style={s.centered}><Spinner /></div>
                ) : filtered.length === 0 ? (
                    <div style={s.emptyState}>
                        <p style={{ color: "#8f98a0", margin: "0 0 12px" }}>No departments found</p>
                        <button onClick={() => setModal(true)} style={s.primaryBtn}>Create one</button>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {filtered.map((dept) => {
                            const members = membersOf(dept.id);
                            const isExpanded = expanded === dept.id;
                            return (
                                <div key={dept.id} style={s.deptCard}>
                                    <div style={s.deptRow}>
                                        <div style={s.deptLeft}>
                                            <div style={s.deptIcon}>🏢</div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={s.deptName}>{dept.name}</div>
                                                {dept.description && (
                                                    <div style={s.deptDesc}>{dept.description}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={s.deptRight}>
                                            <span style={s.memberCount}>
                                                {members.length} member{members.length !== 1 ? "s" : ""}
                                            </span>
                                            <button
                                                style={{ ...s.iconBtn, color: "#c94040" }}
                                                onClick={() => { if (window.confirm("Delete " + dept.name + "?")) remove.mutate(dept.id); }}
                                            >
                                                Delete
                                            </button>
                                            <button style={s.expandBtn} onClick={() => setExpanded(isExpanded ? null : dept.id)}>
                                                {isExpanded ? "▲" : "▼"}
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={s.memberList}>
                                            {members.length === 0 ? (
                                                <p style={{ color: "#8f98a0", fontSize: 13, margin: 0 }}>No members assigned</p>
                                            ) : (
                                                members.map((u) => (
                                                    <div key={u.id} style={s.memberRow}>
                                                        <div style={s.miniAvatar}>
                                                            {(u.firstName?.[0] || u.fullName?.[0] || "?").toUpperCase()}
                                                        </div>
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ fontSize: 13, color: "#c6d4df", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                {u.firstName && u.lastName ? u.firstName + " " + u.lastName : u.fullName || u.email}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: "#8f98a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                {u.email}
                                                            </div>
                                                        </div>
                                                        <span style={s.roleBadge}>{u.role || "User"}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {modal && (
                <Modal title="New Department" onClose={() => { setModal(false); setForm(EMPTY); }} isMobile={isMobile}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="Department Name *">
                            <input style={s.input} value={form.name} onChange={set("name")} placeholder="e.g. Registrar, Dean's Office" />
                        </Field>
                        <Field label="Description">
                            <textarea
                                style={{ ...s.input, height: 70, resize: "vertical" }}
                                value={form.description}
                                onChange={set("description")}
                                placeholder="Optional description..."
                            />
                        </Field>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                            <button style={s.ghostBtn} onClick={() => { setModal(false); setForm(EMPTY); }}>Cancel</button>
                            <button
                                style={s.primaryBtn}
                                onClick={() => { if (form.name.trim()) create.mutate(form); }}
                                disabled={create.isPending}
                            >
                                {create.isPending ? "Creating..." : "Create"}
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
                maxWidth: isMobile ? "100%" : 440,
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
    page: { padding: "24px 16px", color: "#c6d4df", fontFamily: "'Segoe UI',sans-serif" },
    pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
    pageTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: "#c6d4df" },
    pageSub: { margin: "4px 0 0", fontSize: 12, color: "#8f98a0" },
    searchInput: { padding: "8px 12px", background: "#171a21", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#c6d4df", fontSize: 13, outline: "none" },
    centered: { display: "flex", justifyContent: "center", padding: 48 },
    emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: 64, background: "#171a21", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" },
    deptCard: { background: "#171a21", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, overflow: "hidden" },
    deptRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", gap: 8 },
    deptLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 },
    deptIcon: { fontSize: 20, flexShrink: 0 },
    deptName: { fontSize: 15, fontWeight: 700, color: "#c6d4df", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    deptDesc: { fontSize: 12, color: "#8f98a0", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    deptRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
    memberCount: { fontSize: 12, color: "#4a7fa5", padding: "2px 8px", background: "rgba(74,127,165,0.12)", borderRadius: 3, whiteSpace: "nowrap" },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "#8f98a0", fontSize: 12, padding: "4px 6px", borderRadius: 3 },
    expandBtn: { background: "none", border: "none", cursor: "pointer", color: "#4a7fa5", fontSize: 11, padding: "4px 8px" },
    memberList: { borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, background: "rgba(0,0,0,0.15)" },
    memberRow: { display: "flex", alignItems: "center", gap: 10 },
    miniAvatar: { width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#47bfff,#4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 },
    roleBadge: { marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "2px 7px", background: "rgba(79,70,229,0.15)", border: "1px solid rgba(79,70,229,0.2)", borderRadius: 3, color: "#818cf8", flexShrink: 0 },
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