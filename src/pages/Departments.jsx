import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Sidebar";
import client from "../api/client";
import useWindowWidth from "../hooks/useWindowWidth";
import useAuthStore from "../store/authStore";

const fetchDepts = () => client.get("/Departments").then((r) => r.data);
const fetchUsers = () => client.get("/Users").then((r) => r.data);
const fetchColleges = () => client.get("/colleges").then((r) => r.data);
const createDept = (body) => client.post("/Departments", body).then((r) => r.data);
const deleteDept = (id) => client.delete("/Departments/" + id).then((r) => r.data);
const createCollege = (body) => client.post("/colleges", body).then((r) => r.data);
const deleteCollege = (id) => client.delete("/colleges/" + id).then((r) => r.data);

const EMPTY_DEPT = { name: "", description: "", collegeId: "" };
const EMPTY_COLLEGE = { name: "", code: "", description: "" };

export default function Departments() {
    const qc = useQueryClient();
    const width = useWindowWidth();
    const isMobile = width < 768;
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'Admin';

    const [deptModal, setDeptModal] = useState(false);
    const [collegeModal, setCollegeModal] = useState(false);
    const [deptForm, setDeptForm] = useState(EMPTY_DEPT);
    const [collegeForm, setCollegeForm] = useState(EMPTY_COLLEGE);
    const [expandedCollege, setExpandedCollege] = useState(null);
    const [expandedDept, setExpandedDept] = useState(null);
    const [search, setSearch] = useState("");
    const [view, setView] = useState('colleges'); // 'colleges' | 'departments'

    const { data: depts = [], isLoading: deptsLoading } = useQuery({ queryKey: ["departments"], queryFn: fetchDepts });
    const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
    const { data: colleges = [], isLoading: collegesLoading } = useQuery({ queryKey: ["colleges"], queryFn: fetchColleges });

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
    const deptsOf = (collegeId) => depts.filter((d) => d.collegeId === collegeId);
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
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes dtSpin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
                .dp-primary-btn {
                    padding: 9px 18px;
                    background: linear-gradient(135deg, #47bfff, #4F46E5);
                    border: none; border-radius: 10px; color: #fff;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: opacity 0.2s, transform 0.2s;
                    box-shadow: 0 4px 12px rgba(79,70,229,0.3);
                    white-space: nowrap;
                }
                .dp-primary-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .dp-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                .dp-ghost-btn {
                    padding: 9px 18px; background: transparent;
                    border: 1px solid var(--border-input);
                    border-radius: 10px; color: var(--text-muted);
                    font-size: 13px; cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s, color 0.2s;
                }
                .dp-ghost-btn:hover { background: var(--bg-hover); color: var(--text-secondary); }
                .dp-search {
                    padding: 9px 14px 9px 38px;
                    background: var(--bg-input); border: 1px solid var(--border);
                    border-radius: 10px; color: var(--text-secondary);
                    font-size: 13px; outline: none;
                    font-family: 'Inter', sans-serif;
                    transition: border-color 0.2s;
                    box-sizing: border-box; width: 100%;
                }
                .dp-search:focus { border-color: rgba(71,191,255,0.4); }
                .dp-search::placeholder { color: var(--text-accent); }
                .dept-card {
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 16px; overflow: hidden;
                    transition: border-color 0.2s; animation: fadeUp 0.4s ease both;
                }
                .dept-card:hover { border-color: var(--border-input); }
                .college-card {
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 16px; overflow: hidden;
                    transition: border-color 0.2s; animation: fadeUp 0.4s ease both;
                }
                .college-card:hover { border-color: rgba(71,191,255,0.3); }
                .expand-btn {
                    background: var(--bg-input); border: 1px solid var(--border);
                    cursor: pointer; color: var(--text-accent);
                    width: 28px; height: 28px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 11px; transition: background 0.2s, color 0.2s; flex-shrink: 0;
                }
                .expand-btn:hover { background: rgba(71,191,255,0.1); color: #47bfff; }
                .delete-btn {
                    background: none; border: none; cursor: pointer;
                    color: var(--text-muted); font-size: 12px; font-weight: 500;
                    padding: 5px 10px; border-radius: 8px;
                    font-family: 'Inter', sans-serif;
                    transition: background 0.2s, color 0.2s;
                }
                .delete-btn:hover { background: rgba(248,113,113,0.1); color: #f87171; }
                .tab-btn {
                    padding: 7px 16px; border-radius: 8px; border: none;
                    font-size: 12px; font-weight: 600; cursor: pointer;
                    font-family: 'Inter', sans-serif; transition: all 0.2s;
                }
                .tab-btn.active {
                    background: linear-gradient(135deg, rgba(71,191,255,0.2), rgba(79,70,229,0.2));
                    color: #47bfff; border: 1px solid rgba(71,191,255,0.3);
                }
                .tab-btn.inactive {
                    background: transparent; color: var(--text-muted);
                    border: 1px solid var(--border);
                }
                .tab-btn.inactive:hover { background: var(--bg-hover); color: var(--text-secondary); }
                .modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 100; padding: 20px;
                }
                .modal-box {
                    background: var(--modal-bg); border: 1px solid var(--border);
                    border-radius: 16px; width: 100%; max-width: 440px;
                    display: flex; flex-direction: column;
                    box-shadow: 0 24px 48px rgba(0,0,0,0.4);
                    animation: fadeUp 0.2s ease;
                }
                .modal-close-btn {
                    background: var(--bg-input); border: none;
                    color: var(--text-muted); width: 28px; height: 28px;
                    border-radius: 50%; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 14px; transition: background 0.2s;
                }
                .modal-close-btn:hover { background: var(--bg-hover); }
                .dp-input {
                    width: 100%; padding: 9px 12px;
                    background: var(--bg-input); border: 1px solid var(--border-input);
                    border-radius: 8px; color: var(--text-secondary);
                    font-size: 13px; outline: none; box-sizing: border-box;
                    font-family: 'Inter', sans-serif; transition: border-color 0.2s;
                }
                .dp-input:focus { border-color: rgba(71,191,255,0.4); }
                .dp-select {
                    width: 100%; padding: 9px 12px;
                    background: var(--bg-input); border: 1px solid var(--border-input);
                    border-radius: 8px; color: var(--text-secondary);
                    font-size: 13px; outline: none; box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                }
            `}</style>

            <div style={{ padding: isMobile ? '20px 16px' : '28px 28px', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 20, animation: 'fadeUp 0.3s ease both' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Departments</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                            {colleges.length} colleges · {depts.length} departments · {users.length} users
                        </p>
                    </div>
                    {isAdmin && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="dp-ghost-btn" onClick={() => { setCollegeForm(EMPTY_COLLEGE); setCollegeModal(true); }}>
                                + College
                            </button>
                            <button className="dp-primary-btn" onClick={() => { setDeptForm(EMPTY_DEPT); setDeptModal(true); }}>
                                + Department
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button className={`tab-btn ${view === 'colleges' ? 'active' : 'inactive'}`} onClick={() => setView('colleges')}>
                        🎓 By College
                    </button>
                    <button className={`tab-btn ${view === 'departments' ? 'active' : 'inactive'}`} onClick={() => setView('departments')}>
                        🏢 All Departments
                    </button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 20, animation: 'fadeUp 0.35s ease both' }}>
                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4a7fa5', pointerEvents: 'none' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </span>
                    <input className="dp-search" placeholder={view === 'colleges' ? "Search colleges..." : "Search departments..."} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
                ) : view === 'colleges' ? (

                    /* ── College Tree View ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filteredColleges.map((college, i) => {
                            const collegeDepts = deptsOf(college.id);
                            const isCollegeExpanded = expandedCollege === college.id;
                            return (
                                <div key={college.id} className="college-card" style={{ animationDelay: `${i * 0.06}s` }}>
                                    {/* College header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, rgba(71,191,255,0.15), rgba(79,70,229,0.15))', border: '1px solid rgba(71,191,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                                                🎓
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {college.name}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#47bfff', background: 'rgba(71,191,255,0.1)', border: '1px solid rgba(71,191,255,0.2)', padding: '1px 7px', borderRadius: 20 }}>
                                                        {college.code}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {collegeDepts.length} department{collegeDepts.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            {isAdmin && (
                                                <button className="delete-btn" onClick={() => { if (window.confirm('Delete ' + college.name + '?')) removeCollege.mutate(college.id); }}>
                                                    Delete
                                                </button>
                                            )}
                                            <button className="expand-btn" onClick={() => setExpandedCollege(isCollegeExpanded ? null : college.id)}>
                                                {isCollegeExpanded ? '▲' : '▼'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Departments under college */}
                                    {isCollegeExpanded && (
                                        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-deep)', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {collegeDepts.length === 0 ? (
                                                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, textAlign: 'center', padding: '8px 0' }}>
                                                    No departments assigned to this college yet
                                                </p>
                                            ) : collegeDepts.map((dept) => {
                                                const members = membersOf(dept.id);
                                                const isDeptExpanded = expandedDept === dept.id;
                                                return (
                                                    <div key={dept.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', gap: 8 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                                                                    🏢
                                                                </div>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</div>
                                                                    {dept.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{dept.description}</div>}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-accent)', padding: '2px 8px', background: 'rgba(74,127,165,0.12)', borderRadius: 20, whiteSpace: 'nowrap' }}>
                                                                    {members.length} member{members.length !== 1 ? 's' : ''}
                                                                </span>
                                                                {isAdmin && (
                                                                    <button className="delete-btn" onClick={() => { if (window.confirm('Delete ' + dept.name + '?')) removeDept.mutate(dept.id); }}>
                                                                        Delete
                                                                    </button>
                                                                )}
                                                                <button className="expand-btn" onClick={() => setExpandedDept(isDeptExpanded ? null : dept.id)}>
                                                                    {isDeptExpanded ? '▲' : '▼'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {isDeptExpanded && (
                                                            <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-deep)' }}>
                                                                {members.length === 0 ? (
                                                                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, textAlign: 'center' }}>No members assigned</p>
                                                                ) : members.map((u) => (
                                                                    <MemberRow key={u.id} u={u} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Unassigned departments */}
                        {unassignedDepts.length > 0 && (
                            <div className="college-card" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚠️</div>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Unassigned Departments</div>
                                            <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>Not linked to any college</div>
                                        </div>
                                    </div>
                                    <button className="expand-btn" onClick={() => setExpandedCollege(expandedCollege === 'unassigned' ? null : 'unassigned')}>
                                        {expandedCollege === 'unassigned' ? '▲' : '▼'}
                                    </button>
                                </div>
                                {expandedCollege === 'unassigned' && (
                                    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-deep)', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {unassignedDepts.map((dept) => (
                                            <div key={dept.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{dept.name}</span>
                                                {isAdmin && (
                                                    <button className="delete-btn" onClick={() => { if (window.confirm('Delete ' + dept.name + '?')) removeDept.mutate(dept.id); }}>Delete</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                ) : (

                    /* ── All Departments Flat View ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filteredDepts.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 64, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', gap: 12 }}>
                                <div style={{ fontSize: 32, opacity: 0.3 }}>🏢</div>
                                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>No departments found</p>
                                {isAdmin && <button className="dp-primary-btn" onClick={() => setDeptModal(true)}>Create one</button>}
                            </div>
                        ) : filteredDepts.map((dept, i) => {
                            const members = membersOf(dept.id);
                            const isExpanded = expandedDept === dept.id;
                            return (
                                <div key={dept.id} className="dept-card" style={{ animationDelay: `${i * 0.06}s` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, rgba(71,191,255,0.15), rgba(79,70,229,0.15))', border: '1px solid rgba(71,191,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏢</div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                                    {dept.collegeName && (
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#47bfff', background: 'rgba(71,191,255,0.1)', padding: '1px 6px', borderRadius: 20 }}>
                                                            {dept.collegeCode}
                                                        </span>
                                                    )}
                                                    {dept.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.description}</div>}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-accent)', padding: '3px 9px', background: 'rgba(74,127,165,0.12)', borderRadius: 20, whiteSpace: 'nowrap' }}>
                                                {members.length} member{members.length !== 1 ? 's' : ''}
                                            </span>
                                            {isAdmin && (
                                                <button className="delete-btn" onClick={() => { if (window.confirm('Delete ' + dept.name + '?')) removeDept.mutate(dept.id); }}>Delete</button>
                                            )}
                                            <button className="expand-btn" onClick={() => setExpandedDept(isExpanded ? null : dept.id)}>
                                                {isExpanded ? '▲' : '▼'}
                                            </button>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-deep)' }}>
                                            {members.length === 0 ? (
                                                <p style={{ color: '#8f98a0', fontSize: 13, margin: 0, textAlign: 'center', padding: '8px 0' }}>No members assigned</p>
                                            ) : members.map((u) => <MemberRow key={u.id} u={u} />)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Department Modal */}
            {deptModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeptModal(false)}>
                    <div className="modal-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>New Department</h2>
                            <button className="modal-close-btn" onClick={() => { setDeptModal(false); setDeptForm(EMPTY_DEPT); }}>✕</button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: "'Inter', sans-serif" }}>
                            <Field label="College">
                                <select className="dp-select" value={deptForm.collegeId} onChange={setD('collegeId')}>
                                    <option value="">— No College —</option>
                                    {colleges.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Department Name *">
                                <input className="dp-input" value={deptForm.name} onChange={setD('name')} placeholder="e.g. Registrar, Dean's Office" />
                            </Field>
                            <Field label="Description">
                                <textarea className="dp-input" style={{ height: 70, resize: 'vertical' }} value={deptForm.description} onChange={setD('description')} placeholder="Optional description..." />
                            </Field>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button className="dp-ghost-btn" onClick={() => { setDeptModal(false); setDeptForm(EMPTY_DEPT); }}>Cancel</button>
                                <button className="dp-primary-btn" onClick={() => { if (deptForm.name.trim()) createDeptMut.mutate(deptForm); }} disabled={createDeptMut.isPending}>
                                    {createDeptMut.isPending ? 'Creating...' : 'Create'}
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>New College</h2>
                            <button className="modal-close-btn" onClick={() => { setCollegeModal(false); setCollegeForm(EMPTY_COLLEGE); }}>✕</button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: "'Inter', sans-serif" }}>
                            <Field label="College Name *">
                                <input className="dp-input" value={collegeForm.name} onChange={setC('name')} placeholder="e.g. College of Computer Studies" />
                            </Field>
                            <Field label="Code *">
                                <input className="dp-input" value={collegeForm.code} onChange={setC('code')} placeholder="e.g. CCS" maxLength={10} />
                            </Field>
                            <Field label="Description">
                                <textarea className="dp-input" style={{ height: 70, resize: 'vertical' }} value={collegeForm.description} onChange={setC('description')} placeholder="Optional description..." />
                            </Field>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button className="dp-ghost-btn" onClick={() => { setCollegeModal(false); setCollegeForm(EMPTY_COLLEGE); }}>Cancel</button>
                                <button className="dp-primary-btn" onClick={() => { if (collegeForm.name.trim() && collegeForm.code.trim()) createCollegeMut.mutate(collegeForm); }} disabled={createCollegeMut.isPending}>
                                    {createCollegeMut.isPending ? 'Creating...' : 'Create'}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#47bfff,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {(u.firstName?.[0] || u.fullName?.[0] || '?').toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.firstName && u.lastName ? u.firstName + ' ' + u.lastName : u.fullName || u.email}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 20, color: '#818cf8', flexShrink: 0 }}>
                {u.role || 'User'}
            </span>
        </div>
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