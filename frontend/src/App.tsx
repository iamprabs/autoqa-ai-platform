import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  Play, 
  Flame, 
  RefreshCw, 
  FolderOpen, 
  PlusCircle,
  Cpu
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import TestRunner from './components/TestRunner';
import SelfHealing from './components/SelfHealing';

const API_BASE = '/api';

export default function App() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workspace' | 'runner' | 'healing'>('dashboard');
  const [newPath, setNewPath] = useState('');
  const [newName, setNewName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      const data = await res.json();
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (e) {
      console.error('Error fetching projects:', e);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleRegisterProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, name: newName })
      });
      const data = await res.json();
      if (res.ok) {
        setProjects(prev => [...prev, data]);
        setSelectedProjectId(data.id);
        setNewPath('');
        setNewName('');
        setShowAddModal(false);
      } else {
        alert(data.error || 'Failed to add project');
      }
    } catch (err) {
      alert('Error registering project. Make sure path is valid and server is running.');
    } finally {
      setLoading(false);
    }
  };

  const activeProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-purple))',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(6, 182, 212, 0.3)'
            }}>
              <Cpu size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.5px' }}>AutoQA AI</h1>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Autonomous QA Agent</p>
            </div>
          </div>

          {/* Project Selector */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Target</label>
              <button 
                onClick={() => setShowAddModal(true)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}
              >
                <PlusCircle size={16} />
              </button>
            </div>
            
            {projects.length > 0 ? (
              <select 
                className="select-input" 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '10px 0' }}>No projects registered.</div>
            )}
          </div>

          {/* Nav List */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('dashboard')}
              style={{ width: '100%', justifyContent: 'flex-start', gap: '12px' }}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>

            <button 
              className={`btn ${activeTab === 'workspace' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('workspace')}
              style={{ width: '100%', justifyContent: 'flex-start', gap: '12px' }}
              disabled={!activeProject}
            >
              <Boxes size={18} />
              Code & Graph Scan
            </button>

            <button 
              className={`btn ${activeTab === 'runner' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('runner')}
              style={{ width: '100%', justifyContent: 'flex-start', gap: '12px' }}
              disabled={!activeProject}
            >
              <Play size={18} />
              Autonomous Runner
            </button>

            <button 
              className={`btn ${activeTab === 'healing' ? 'btn-purple' : 'btn-secondary'}`}
              onClick={() => setActiveTab('healing')}
              style={{ width: '100%', justifyContent: 'flex-start', gap: '12px' }}
              disabled={!activeProject}
            >
              <Flame size={18} />
              Self-Healing Center
            </button>
          </nav>
        </div>

        {/* Footer Info */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          {activeProject ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Project Env Details</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>{activeProject.language}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{activeProject.framework}</div>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AutoQA AI Offline</div>
          )}
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {/* Modals */}
        {showAddModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}>
            <div className="glass-card" style={{ padding: '28px', width: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>Register Local Path or Git Remote Repo</h2>
              <form onSubmit={handleRegisterProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Project Name (Optional)</label>
                  <input 
                    type="text" className="text-input" placeholder="e.g. My Express App"
                    value={newName} onChange={e => setNewName(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Absolute Workspace Path or Git URL</label>
                  <input 
                    type="text" className="text-input" placeholder="e.g. C:\Projects\app OR https://github.com/user/repo.git"
                    value={newPath} onChange={e => setNewPath(e.target.value)} required
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Analyzing...' : 'Scan & Register'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab Routing */}
        {activeTab === 'dashboard' && <Dashboard projectId={selectedProjectId} onNavigate={setActiveTab} />}
        {activeTab === 'workspace' && activeProject && <ProjectView project={activeProject} onUpdate={fetchProjects} />}
        {activeTab === 'runner' && activeProject && <TestRunner projectId={selectedProjectId} projectPath={activeProject.path} />}
        {activeTab === 'healing' && activeProject && <SelfHealing projectId={selectedProjectId} projectPath={activeProject.path} />}
      </main>
    </div>
  );
}
