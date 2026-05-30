import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";
import useAuthStore from "../store/authStore";

const fetchDepts    = () => client.get("/Departments").then((r) => r.data);
const fetchUsers    = () => client.get("/Users").then((r) => r.data);
const fetchColleges = () => client.get("/colleges").then((r) => r.data);
const createDept    = (body) => client.post("/Departments", body).then((r) => r.data);
const deleteDept    = (id)   => client.delete("/Departments/" + id).then((r) => r.data);
const createCollege = (body) => client.post("/colleges", body).then((r) => r.data);
const deleteCollege = (id)   => client.delete("/colleges/" + id).then((r) => r.data);

const EMPTY_DEPT    = { name: "", description: "", collegeId: "" };
const EMPTY_COLLEGE = { name: "", code: "", description: "" };

export default function Departments() {
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'Admin';

    const [deptModal,    setDeptModal]    = useState(false);
    const [collegeModal, setCollegeModal] = useState(false);
    const [deptForm,     setDeptForm]     = useState(EMPTY_DEPT);
    const [collegeForm,  setCollegeForm]  = useState(EMPTY_COLLEGE);
    const [expandedDept, setExpandedDept] = useState(null);
    const [search, setSearch] = useState("");
    const [view,   setView]   = useState('colleges');

    const { data: depts   = [], isLoading: deptsLoading }   = useQuery({ queryKey: ["departments"], queryFn: fetchDepts });
    const { data: users   = [] }                             = useQuery({ queryKey: ["users"],       queryFn: fetchUsers });
    const { data: colleges = [], isLoading: collegesLoading } = useQuery({ queryKey: ["colleges"],   queryFn: fetchColleges });

    const createDeptMut = useMutation({
        mutationFn: createDept,
        onSuccess: () => { qc.invalidateQueries(["departments"]); setDeptModal(false); setDeptForm(EMPTY_DEPT); },
    });
    const removeDept = useMutation({
        mutationFn: deleteDept,
        onSuccess: () => qc.invalidateQueries(["departments"]),
    });
    const createCollegeMut = useMutation({
        mutationFn: createCollege,
        onSuccess: () => { qc.invalidateQueries(["colleges"]); setCollegeModal(false); setCollegeForm(EMPTY_COLLEGE); },
    });
    const removeCollege = useMutation({
        mutationFn: deleteCollege,
        onSuccess: () => qc.invalidateQueries(["colleges"]),
    });

    const setD = (k) => (e) => setDeptForm((f) => ({ ...f, [k]: e.target.value }));
    const setC = (k) => (e) => setCollegeForm((f) => ({ ...f, [k]: e.target.value }));
    const membersOf = (deptId) => users.filter((u) => u.departmentId === deptId);
    const deptsOf   = (collegeId) => depts.filter((d) => d.collegeId === collegeId);
    const unassignedDepts = depts.filter((d) => !d.collegeId);

    const filteredColleges = colleges.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.code?.toLowerCase().includes(search.toLowerCase())
    );
    const filteredDepts = depts.filter((d) =>
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.description?.toLowerCase().includes(search.toLowerCase())
    );

    const isLoading = deptsLoading || collegesLoading;

    return (
        <AppLayout>
            <style>{`
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                .dp-primary-btn {
                    display: inline-flex; align-items: center; gap: 7px;
                    height: 36px; padding: 0 16px;
                    background: var(--accent-gradient);
                    border: none; border-radius: 12px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity var(--duration-base), transform var(--duration-base);
                    box-shadow: var(--shadow-accent); white-space: nowrap;
                }
                .dp-primary-btn:hover { opacity: 0.88; transform: translateY(-1px); }
                .dp-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .dp-ghost-btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    height: 36px; padding: 0 16px;
                    background: transparent; border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif;
                    transition: background var(--duration-fast), color var(--duration-fast);
                }
                .dp-ghost-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
                .dp-search {
                    padding: 9px 14px 9px 38px;
                    background: var(--bg-card); border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; outline: none; font-family: 'Inter', sans-serif;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
                    box-sizing: border-box; width: 100%;
                }
                .dp-search:focus { border-color: var(--accent-from); box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
                .dp-search::placeholder { color: var(--text-tertiary); }
                /* Tree rows */
                .college-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 14px 20px; gap: 12px;
                    background: var(--bg-surface);
                    border-left: 3px solid var(--accent-from);
                    border-radius: 12px; margin-bottom: 2px;
                    transition: background var(--duration-fast);
                }
                .college-row:hover { background: var(--bg-card); }
                .dept-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 11px 14px; gap: 10px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 10px;
                    transition: background var(--duration-fast), border-color var(--duration-fast);
                }
                .dept-row:hover { background: var(--bg-card-hover); border-color: var(--border-default); }
                .expand-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 28px; height: 28px; border-radius: 8px;
                    background: var(--bg-card); border: 1px solid var(--border-subtle);
                    cursor: pointer; color: var(--text-tertiary);
                    transition: background var(--duration-fast), color var(--duration-fast);
                    flex-shrink: 0;
                }
                .expand-btn:hover { background: var(--bg-card-hover); color: var(--text-secondary); }
                .action-icon-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 28px; height: 28px; border-radius: 8px;
                    background: none; border: 1px solid var(--border-subtle);
                    cursor: pointer; color: var(--text-tertiary);
                    transition: background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast);
                    flex-shrink: 0;
                }
                .action-icon-btn:hover { background: var(--bg-card-hover); color: var(--text-secondary); }
                .action-icon-btn.danger:hover { background: var(--danger-bg); color: var(--danger); border-color: rgba(248,113,113,0.3); }
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
                /* Flat table */
                .flat-row { border-bottom: 1px solid var(--border-subtle); transition: background var(--duration-fast); }
                .flat-row:hover { background: var(--bg-card-hover); }
                .flat-row:last-child { border-bottom: none; }
                /* Modal */
                .modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 100; padding: 20px;
                }
                .modal-box {
                    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
                    border-radius: 16px; width: 100%; max-width: 480px;
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
                .dp-input {
                    width: 100%; height: 40px; padding: 0 12px;
                    background: var(--bg-card); border: 1px solid var(--border-default);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 14px; outline: none; box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                    transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
                }
                .dp-input:focus { border-color: var(--accent-from); box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
                textarea.dp-input { height: auto; padding: 10px 12px; }
                select.dp-input { cursor: pointer; }
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
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 20, animation: 'fadeUp 0.3s ease both' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Departments</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                            {colleges.length} college{colleges.length !== 1 ? 's' : ''} · {depts.length} department{depts.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    {isAdmin && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="dp-ghost-btn" onClick={() => { setCollegeForm(EMPTY_COLLEGE); setCollegeModal(true); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                College
                            </button>
                            <button className="dp-primary-btn" onClick={() => { setDeptForm(EMPTY_DEPT); setDeptModal(true); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                Department
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button className={`tab-btn ${view === 'colleges' ? 'active' : 'inactive'}`} onClick={() => setView('colleges')}>
                        By College
                    </button>
                    <button className={`tab-btn ${view === 'departments' ? 'active' : 'inactive'}`} onClick={() => setView('departments')}>
                        All Departments
                    </button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 20, animation: 'fadeUp 0.35s ease both' }}>
                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </span>
                    <input className="dp-search" placeholder={view === 'colleges' ? "Search colleges…" : "Search departments…"} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                ) : view === 'colleges' ? (

                    /* ── Tree View ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.4s ease both' }}>
                        {filteredColleges.length === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, gap: 8 }}>
                                <div style={{ opacity: 0.3 }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
                                <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 13 }}>No colleges found</p>
                            </div>
                        )}

                        {filteredColleges.map((college) => {
                            const collegeDepts = deptsOf(college.id);
                            return (
                                <div key={college.id}>
                                    {/* College parent row */}
                                    <div className="college-row">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                                            <div>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{college.name}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-to)', background: 'rgba(71,191,255,0.1)', border: '1px solid rgba(71,191,255,0.2)', padding: '1px 7px', borderRadius: 20 }}>
                                                        {college.code}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                                        {collegeDepts.length} dept{collegeDepts.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {isAdmin && (
                                            <button className="action-icon-btn danger" title="Delete college" onClick={() => { if (window.confirm('Delete ' + college.name + '?')) removeCollege.mutate(college.id); }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* Department children (indented, always visible) */}
                                    {collegeDepts.length > 0 && (
                                        <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                                            {collegeDepts.map((dept) => {
                                                const members = membersOf(dept.id);
                                                const isExpanded = expandedDept === dept.id;
                                                return (
                                                    <div key={dept.id}>
                                                        <div className="dept-row">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" style={{ flexShrink: 0 }}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</div>
                                                                    {dept.description && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{dept.description}</div>}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', padding: '2px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, whiteSpace: 'nowrap' }}>
                                                                    {members.length} member{members.length !== 1 ? 's' : ''}
                                                                </span>
                                                                {isAdmin && (
                                                                    <button className="action-icon-btn danger" title="Delete department" onClick={() => { if (window.confirm('Delete ' + dept.name + '?')) removeDept.mutate(dept.id); }}>
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                                                                    </button>
                                                                )}
                                                                <button className="expand-btn" title={isExpanded ? 'Hide members' : 'Show members'} onClick={() => setExpandedDept(isExpanded ? null : dept.id)}>
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: 'transform var(--duration-fast)', transform: isExpanded ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {isExpanded && (
                                                            <div style={{ paddingLeft: 16, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                {members.length === 0 ? (
                                                                    <p style={{ color: 'var(--text-tertiary)', fontSize: 12, margin: '4px 0', paddingLeft: 4 }}>No members assigned</p>
                                                                ) : members.map((u) => <MemberRow key={u.id} u={u} />)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {collegeDepts.length === 0 && (
                                        <p style={{ paddingLeft: 16, margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>No departments assigned</p>
                                    )}
                                </div>
                            );
                        })}

                        {/* Unassigned departments */}
                        {unassignedDepts.length > 0 && (
                            <div>
                                <div style={{ padding: '12px 20px', background: 'var(--warning-bg)', borderLeft: '3px solid var(--warning)', borderRadius: 12, marginBottom: 4 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)' }}>Unassigned Departments</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Not linked to any college</div>
                                </div>
                                <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {unassignedDepts.map((dept) => (
                                        <div key={dept.id} className="dept-row">
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{dept.name}</span>
                                            {isAdmin && (
                                                <button className="action-icon-btn danger" title="Delete department" onClick={() => { if (window.confirm('Delete ' + dept.name + '?')) removeDept.mutate(dept.id); }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                ) : (

                    /* ── Flat Table View ── */
                    <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, overflow: 'hidden', animation: 'fadeUp 0.4s ease both' }}>
                        {filteredDepts.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, gap: 12 }}>
                                <div style={{ opacity: 0.3 }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg></div>
                                <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 13 }}>No departments found</p>
                                {isAdmin && <button className="dp-primary-btn" onClick={() => setDeptModal(true)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    Create one
                                </button>}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {['Department', 'College', 'Members', ''].map((h) => (
                                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDepts.map((dept) => {
                                            const members = membersOf(dept.id);
                                            return (
                                                <tr key={dept.id} className="flat-row">
                                                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{dept.name}</div>
                                                        {dept.description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{dept.description}</div>}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                        {dept.collegeName ? (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-to)', background: 'rgba(71,191,255,0.1)', border: '1px solid rgba(71,191,255,0.2)', padding: '1px 7px', borderRadius: 20 }}>{dept.collegeCode}</span>
                                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{dept.collegeName}</span>
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                                                            {members.length} member{members.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                                                        {isAdmin && (
                                                            <button className="action-icon-btn danger" title="Delete department" onClick={() => { if (window.confirm('Delete ' + dept.name + '?')) removeDept.mutate(dept.id); }}>
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                                                            </button>
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
                )}
            </div>

            {/* Department Modal */}
            {deptModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeptModal(false)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>New Department</h2>
                            <button className="modal-close-btn" onClick={() => { setDeptModal(false); setDeptForm(EMPTY_DEPT); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <Field label="College">
                                <select className="dp-input" value={deptForm.collegeId} onChange={setD('collegeId')}>
                                    <option value="">— No College —</option>
                                    {colleges.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                                </select>
                            </Field>
                            <Field label="Department Name *">
                                <input className="dp-input" value={deptForm.name} onChange={setD('name')} placeholder="e.g. Registrar, Dean's Office" />
                            </Field>
                            <Field label="Description">
                                <textarea className="dp-input" style={{ height: 70, resize: 'vertical' }} value={deptForm.description} onChange={setD('description')} placeholder="Optional description…" />
                            </Field>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button className="dp-ghost-btn" onClick={() => { setDeptModal(false); setDeptForm(EMPTY_DEPT); }}>Cancel</button>
                                <button className="modal-submit-btn" style={{ flex: 1 }} onClick={() => { if (deptForm.name.trim()) createDeptMut.mutate(deptForm); }} disabled={createDeptMut.isPending}>
                                    {createDeptMut.isPending ? 'Creating…' : 'Create Department'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* College Modal */}
            {collegeModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCollegeModal(false)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>New College</h2>
                            <button className="modal-close-btn" onClick={() => { setCollegeModal(false); setCollegeForm(EMPTY_COLLEGE); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <Field label="College Name *">
                                <input className="dp-input" value={collegeForm.name} onChange={setC('name')} placeholder="e.g. College of Computer Studies" />
                            </Field>
                            <Field label="Code *">
                                <input className="dp-input" value={collegeForm.code} onChange={setC('code')} placeholder="e.g. CCS" maxLength={10} />
                            </Field>
                            <Field label="Description">
                                <textarea className="dp-input" style={{ height: 70, resize: 'vertical' }} value={collegeForm.description} onChange={setC('description')} placeholder="Optional description…" />
                            </Field>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button className="dp-ghost-btn" onClick={() => { setCollegeModal(false); setCollegeForm(EMPTY_COLLEGE); }}>Cancel</button>
                                <button className="modal-submit-btn" style={{ flex: 1 }} onClick={() => { if (collegeForm.name.trim() && collegeForm.code.trim()) createCollegeMut.mutate(collegeForm); }} disabled={createCollegeMut.isPending}>
                                    {createCollegeMut.isPending ? 'Creating…' : 'Create College'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

function MemberRow({ u }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {(u.firstName?.[0] || u.fullName?.[0] || '?').toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.firstName && u.lastName ? u.firstName + ' ' + u.lastName : u.fullName || u.email}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 20, color: '#818cf8', flexShrink: 0 }}>
                {u.role || 'User'}
            </span>
        </div>
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
