import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";

const fetchWorkflows = () => client.get("/workflow").then((r) => r.data);
const fetchDepts = () => client.get("/Departments").then((r) => r.data);
const createWorkflow = (body) => client.post("/workflow", body).then((r) => r.data);
const deleteWorkflow = (id) => client.delete("/workflow/" + id).then((r) => r.data);
const toggleWorkflow = (id) => client.patch("/workflow/" + id + "/toggle").then((r) => r.data);

const EMPTY = { name: "", description: "", fromDepartmentId: "", toDepartmentId: "", order: 1, isActive: true };

export default function Workflow() {
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const { data: rules = [], isLoading } = useQuery({ queryKey: ["workflow"], queryFn: fetchWorkflows });
    const { data: depts = [] } = useQuery({ queryKey: ["departments"], queryFn: fetchDepts });

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

    const set = (k) => (e) => setForm((f) => ({
        ...f,
        [k]: k === "order" ? Number(e.target.value)
            : k === "isActive" ? e.target.checked
                : e.target.value,
    }));

    const handleSubmit = () => {
        if (!form.name.trim()) return;
        create.mutate(form);
    };

    const deptName = (id) => depts.find((d) => d.id === id)?.name || "—";

    return (
        <AppLayout>
            <div style={s.page}>

                <div style={{ ...s.pageHeader, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
                    <div>
                        <h1 style={s.pageTitle}>Workflow Rules</h1>
                        <p style={s.pageSub}>{rules.length} rules configured</p>
                    </div>
                    <button onClick={() => { setForm(EMPTY); setModal(true); }} style={s.primaryBtn}>
                        + Add Rule
                    </button>
                </div>

                {isLoading ? (
                    <div style={s.centered}><Spinner /></div>
                ) : rules.length === 0 ? (
                    <div style={s.emptyState}>
                        <p style={{ color: "#8f98a0", margin: "0 0 12px" }}>No workflow rules yet</p>
                        <button onClick={() => setModal(true)} style={s.primaryBtn}>Create your first rule</button>
                    </div>
                ) : (
                    <div style={{
                        ...s.grid,
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px,1fr))",
                    }}>
                        {[...rules].sort((a, b) => (a.order || 0) - (b.order || 0)).map((rule) => (
                            <div key={rule.id} style={s.ruleCard}>
                                <div style={s.ruleTop}>
                                    <div style={s.ruleOrder}>#{rule.order || "—"}</div>
                                    <span style={{ ...s.activeBadge, ...(rule.isActive ? s.activeOn : s.activeOff) }}>
                                        {rule.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>

                                <h3 style={s.ruleName}>{rule.name}</h3>
                                {rule.description && <p style={s.ruleDesc}>{rule.description}</p>}

                                <div style={s.ruleFlow}>
                                    <span style={s.deptChip}>{deptName(rule.fromDepartmentId)}</span>
                                    <span style={s.arrow}>→</span>
                                    <span style={s.deptChip}>{deptName(rule.toDepartmentId)}</span>
                                </div>

                                <div style={s.ruleActions}>
                                    <button
                                        style={{ ...s.iconBtn, color: rule.isActive ? "#f59e0b" : "#4ade80" }}
                                        onClick={() => toggle.mutate(rule.id)}
                                        disabled={toggle.isPending}
                                    >
                                        {rule.isActive ? "Deactivate" : "Activate"}
                                    </button>
                                    <button
                                        style={{ ...s.iconBtn, color: "#c94040" }}
                                        onClick={() => { if (window.confirm("Delete rule " + rule.name + "?")) remove.mutate(rule.id); }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {modal && (
                <Modal title="New Workflow Rule" onClose={() => { setModal(false); setForm(EMPTY); }} isMobile={isMobile}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="Rule Name *">
                            <input style={s.input} value={form.name} onChange={set("name")} placeholder="e.g. Registrar to Dean" />
                        </Field>
                        <Field label="Description">
                            <textarea
                                style={{ ...s.input, height: 60, resize: "vertical" }}
                                value={form.description}
                                onChange={set("description")}
                                placeholder="What triggers this rule?"
                            />
                        </Field>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                            <Field label="From Department">
                                <select style={s.input} value={form.fromDepartmentId} onChange={set("fromDepartmentId")}>
                                    <option value="">Any</option>
                                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </Field>
                            <Field label="To Department">
                                <select style={s.input} value={form.toDepartmentId} onChange={set("toDepartmentId")}>
                                    <option value="">Any</option>
                                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </Field>
                        </div>
                        <Field label="Order / Priority">
                            <input type="number" min={1} style={s.input} value={form.order} onChange={set("order")} />
                        </Field>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input type="checkbox" checked={form.isActive} onChange={set("isActive")} />
                            <span style={{ fontSize: 13, color: "#c6d4df" }}>Active</span>
                        </label>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                            <button style={s.ghostBtn} onClick={() => { setModal(false); setForm(EMPTY); }}>Cancel</button>
                            <button style={s.primaryBtn} onClick={handleSubmit} disabled={create.isPending}>
                                {create.isPending ? "Creating..." : "Create Rule"}
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
                maxWidth: isMobile ? "100%" : 480,
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
    pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
    pageTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: "#c6d4df" },
    pageSub: { margin: "4px 0 0", fontSize: 12, color: "#8f98a0" },
    centered: { display: "flex", justifyContent: "center", padding: 48 },
    emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: 64, background: "#171a21", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" },
    grid: { display: "grid", gap: 16 },
    ruleCard: { background: "#171a21", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: 18, display: "flex", flexDirection: "column", gap: 10 },
    ruleTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    ruleOrder: { fontSize: 11, fontWeight: 700, color: "#4a7fa5", background: "rgba(74,127,165,0.12)", padding: "2px 8px", borderRadius: 3 },
    activeBadge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
    activeOn: { background: "rgba(74,222,128,0.12)", color: "#4ade80" },
    activeOff: { background: "rgba(255,255,255,0.06)", color: "#8f98a0" },
    ruleName: { margin: 0, fontSize: 15, fontWeight: 700, color: "#c6d4df" },
    ruleDesc: { margin: 0, fontSize: 12, color: "#8f98a0", lineHeight: 1.5 },
    ruleFlow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
    deptChip: { fontSize: 12, padding: "3px 10px", background: "rgba(79,70,229,0.15)", border: "1px solid rgba(79,70,229,0.25)", borderRadius: 3, color: "#818cf8" },
    arrow: { color: "#4a7fa5", fontSize: 14 },
    ruleActions: { display: "flex", gap: 8, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 4, flexWrap: "wrap" },
    iconBtn: { background: "none", border: "none", cursor: "pointer", color: "#8f98a0", fontSize: 12, padding: "4px 6px", borderRadius: 3 },
    primaryBtn: { padding: "9px 18px", background: "linear-gradient(to bottom,#47bfff 5%,#1a44c2 95%)", border: "none", borderRadius: 3, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    ghostBtn: { padding: "9px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 3, color: "#8f98a0", fontSize: 13, cursor: "pointer" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
    modal: { background: "#1b2838", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", overflowY: "auto" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" },
    modalTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#c6d4df" },
    closeBtn: { background: "none", border: "none", color: "#8f98a0", fontSize: 16, cursor: "pointer" },
    modalBody: { padding: 20 },
    fieldLabel: { fontSize: 11, fontWeight: 700, color: "#4a7fa5", letterSpacing: "0.05em", margin: 0 },
    input: { width: "100%", padding: "9px 12px", background: "#0e1621", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#c6d4df", fontSize: 13, outline: "none", boxSizing: "border-box" },
};