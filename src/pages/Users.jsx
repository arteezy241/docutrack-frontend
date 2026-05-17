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

    const openAssign = (u) => {
        setSelected(u);
        setDeptId(u.departmentId || "");
        setModal(true);
    };

    const deptName = (id) => depts.find((d) => d.id === id)?.name || "—";

    const filtered = users.filter((u) => {
        const name = ((u.firstName || "") + " " + (u.lastName || "") + " " + (u.fullName || "") + " " + (u.email || "")).toLowerCase();
        return (
            name.includes(search.toLowerCase()) &&
            (roleFilter === "All" || u.role === roleFilter)
        );
    });

    const displayName = (u) => {
        if (u.firstName || u.lastName) return (u.firstName + " " + u.lastName).trim();
        if (u.fullName) return u.fullName;
        return u.email || "Unknown";
    };

    const displayInitial = (u) => {
        return (u.firstName?.[0] || u.fullName?.[0] || u.email?.[0] || "?").toUpperCase();
    };

    return (
        <AppLayout>
            <div style={s.page}>

                <div style={{ ...s.pageHeader, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
                    <div>
                        <h1 style={s.pageTitle}>Users</h1>
                        <p style={s.pageSub}>{users.length} registered users</p>
                    </div>
                </div>

                <div style={{ ...s.filterBar, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center" }}>
                    <input
                        style={{ ...s.searchInput, width: isMobile ? "100%" : "auto", boxSizing: "border-box" }}
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div style={s.filterGroup}>
                        {["All", ...ROLES].map((r) => (
                            <button
                                key={r}
                                onClick={() => setRF(r)}
                                style={{ ...s.filterBtn, ...(roleFilter === r ? s.filterBtnActive : {}) }}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {isMobile ? (
                    // Mobile card view
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {isLoading ? (
                            <div style={s.centered}><Spinner /></div>
                        ) : filtered.length === 0 ? (
                            <div style={s.centered}><p style={{ color: "#8f98a0" }}>No users found</p></div>
                        ) : (
                            filtered.map((u) => (
                                <div key={u.id} style={s.userCard}>
                                    <div style={s.userCardTop}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={s.avatar}>{displayInitial(u)}</div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: "#c6d4df", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {displayName(u)}
                                                </div>
                                                <div style={{ fontSize: 11, color: "#8f98a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {u.email}
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{ ...s.roleBadge, ...(u.role === "Admin" ? s.roleAdmin : u.role === "Staff" ? s.roleStaff : s.roleViewer) }}>
                                            {u.role || "Staff"}
                                        </span>
                                    </div>
                                    <div style={s.userCardBottom}>
                                        <span style={{ fontSize: 12, color: "#8f98a0" }}>
                                            {deptName(u.departmentId)}
                                        </span>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button style={s.iconBtn} onClick={() => openAssign(u)}>Assign Dept</button>
                                            <button
                                                style={{ ...s.iconBtn, color: "#c94040" }}
                                                onClick={() => { if (window.confirm("Remove user " + displayName(u) + "?")) remove.mutate(u.id); }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    // Desktop table view
                    <div style={s.tableWrap}>
                        {isLoading ? (
                            <div style={s.centered}><Spinner /></div>
                        ) : filtered.length === 0 ? (
                            <div style={s.centered}><p style={{ color: "#8f98a0" }}>No users found</p></div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={s.table}>
                                    <thead>
                                        <tr>
                                            {["User", "Email", "Role", "Department", ""].map((h) => (
                                                <th key={h} style={s.th}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((u) => (
                                            <tr
                                                key={u.id}
                                                style={s.tr}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                            >
                                                <td style={s.td}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                        <div style={s.avatar}>{displayInitial(u)}</div>
                                                        <span style={{ fontWeight: 600 }}>{displayName(u)}</span>
                                                    </div>
                                                </td>
                                                <td style={{ ...s.td, color: "#8f98a0" }}>{u.email}</td>
                                                <td style={s.td}>
                                                    <span style={{ ...s.roleBadge, ...(u.role === "Admin" ? s.roleAdmin : u.role === "Staff" ? s.roleStaff : s.roleViewer) }}>
                                                        {u.role || "Staff"}
                                                    </span>
                                                </td>
                                                <td style={{ ...s.td, color: "#8f98a0", fontSize: 12 }}>{deptName(u.departmentId)}</td>
                                                <td style={{ ...s.td, textAlign: "right", whiteSpace: "nowrap" }}>
                                                    <button style={s.iconBtn} onClick={() => openAssign(u)}>Assign Dept</button>
                                                    <button
                                                        style={{ ...s.iconBtn, color: "#c94040" }}
                                                        onClick={() => { if (window.confirm("Remove user " + displayName(u) + "?")) remove.mutate(u.id); }}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {modal && selected && (
                <Modal title={"Assign Department — " + displayName(selected)} onClose={() => setModal(false)} isMobile={isMobile}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="Department">
                            <select style={s.input} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                                <option value="">Unassigned</option>
                                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </Field>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                            <button style={s.ghostBtn} onClick={() => setModal(false)}>Cancel</button>
                            <button
                                style={s.primaryBtn}
                                disabled={assign.isPending}
                                onClick={() => assign.mutate({ id: selected.id, departmentId: deptId })}
                            >
                                {assign.isPending ? "Saving..." : "Save"}
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
                maxWidth: isMobile ? "100%" : 400,
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
    filterBar: { display: "flex", gap: 12, marginBottom: 16 },
    searchInput: { padding: "8px 12px", background: "#171a21", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#c6d4df", fontSize: 13, outline: "none" },
    filterGroup: { display: "flex", gap: 4, flexWrap: "wrap" },
    filterBtn: { padding: "6px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#8f98a0", fontSize: 12, cursor: "pointer" },
    filterBtnActive: { background: "rgba(79,70,229,0.2)", borderColor: "#4F46E5", color: "#818cf8" },
    tableWrap: { background: "#171a21", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", minHeight: 160 },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#4a7fa5", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" },
    tr: { borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" },
    td: { padding: "12px 16px", fontSize: 13, color: "#c6d4df", verticalAlign: "middle" },
    avatar: { width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#47bfff,#4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 },
    roleBadge: { padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
    roleAdmin: { background: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    roleStaff: { background: "rgba(71,191,255,0.12)", color: "#47bfff" },
    roleViewer: { background: "rgba(255,255,255,0.06)", color: "#8f98a0" },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "#8f98a0", fontSize: 12, padding: "4px 6px", borderRadius: 3 },
    centered: { display: "flex", justifyContent: "center", padding: 48 },
    userCard: { background: "#171a21", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, overflow: "hidden" },
    userCardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", gap: 8 },
    userCardBottom: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.1)" },
    primaryBtn: { padding: "9px 18px", background: "linear-gradient(to bottom,#47bfff 5%,#1a44c2 95%)", border: "none", borderRadius: 3, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    ghostBtn: { padding: "9px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#8f98a0", fontSize: 13, cursor: "pointer" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
    modal: { background: "#1b2838", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" },
    modalTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: "#c6d4df" },
    closeBtn: { background: "none", border: "none", color: "#8f98a0", fontSize: 16, cursor: "pointer" },
    modalBody: { padding: 20, overflowY: "auto" },
    fieldLabel: { fontSize: 11, fontWeight: 700, color: "#4a7fa5", letterSpacing: "0.05em", margin: 0 },
    input: { width: "100%", padding: "9px 12px", background: "#0e1621", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#c6d4df", fontSize: 13, outline: "none", boxSizing: "border-box" },
};