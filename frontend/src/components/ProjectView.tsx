import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, 
  Layers, 
  FileText, 
  Check, 
  X, 
  AlertCircle, 
  FileCheck,
  Percent
} from 'lucide-react';

interface ProjectViewProps {
  project: any;
  onUpdate: () => void;
}

export default function ProjectView({ project, onUpdate }: ProjectViewProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingDocs, setAnalyzingDocs] = useState(false);
  const [activeView, setActiveView] = useState<'graph' | 'gap'>('graph');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Trigger codebase scan
  const handleScanCodebase = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/analyze`, {
        method: 'POST'
      });
      if (res.ok) {
        onUpdate();
      }
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  // Trigger doc analysis
  const handleScanDocs = async () => {
    setAnalyzingDocs(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/analyze-docs`, {
        method: 'POST'
      });
      if (res.ok) {
        onUpdate();
      }
    } catch (e) {
      console.error('Docs scan error:', e);
    } finally {
      setAnalyzingDocs(false);
    }
  };

  // Force-directed layout physics simulator for the Canvas Knowledge Graph
  useEffect(() => {
    if (activeView !== 'graph' || !canvasRef.current || !project.knowledgeGraph) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = 400;

    const graph = project.knowledgeGraph;
    
    // Copy nodes and add position state
    const nodes = graph.nodes.map((n: any, idx: number) => ({
      ...n,
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2 + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0
    }));

    // Build link indices
    const links = graph.links.map((l: any) => {
      const sourceIdx = nodes.findIndex((n: any) => n.id === l.source);
      const targetIdx = nodes.findIndex((n: any) => n.id === l.target);
      return {
        ...l,
        sourceIdx,
        targetIdx
      };
    }).filter((l: any) => l.sourceIdx !== -1 && l.targetIdx !== -1);

    // Physics constants
    const kRepel = 200;
    const kLink = 0.05;
    const centerGravity = 0.02;
    const damping = 0.85;

    const updatePhysics = () => {
      // 1. Repel force between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          
          if (dist < 180) {
            const force = kRepel / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }
      }

      // 2. Link attraction forces
      links.forEach((link: any) => {
        const s = nodes[link.sourceIdx];
        const t = nodes[link.targetIdx];
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 60) * kLink;
        
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      });

      // 3. Center gravity and update positions
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      nodes.forEach((n: any) => {
        n.vx += (cx - n.x) * centerGravity;
        n.vy += (cy - n.y) * centerGravity;

        n.vx *= damping;
        n.vy *= damping;

        n.x += n.vx;
        n.y += n.vy;

        // Boundaries
        n.x = Math.max(20, Math.min(canvas.width - 20, n.x));
        n.y = Math.max(20, Math.min(canvas.height - 20, n.y));
      });
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections/links
      ctx.lineWidth = 1;
      links.forEach((l: any) => {
        const s = nodes[l.sourceIdx];
        const t = nodes[l.targetIdx];
        
        // Dynamic gradient for links
        const grad = ctx.createLinearGradient(s.x, s.y, t.x, t.y);
        grad.addColorStop(0, l.type === 'imports' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.06)');
        grad.addColorStop(1, l.type === 'imports' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255,255,255,0.02)');
        ctx.strokeStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((n: any) => {
        let color = '#9ca3af'; // file (gray)
        let glowColor = 'rgba(156, 163, 175, 0.2)';

        if (n.type === 'folder') {
          color = '#eab308'; // folder (yellow)
          glowColor = 'rgba(234, 179, 8, 0.1)';
        } else if (n.type === 'route') {
          color = '#06b6d4'; // route (cyan)
          glowColor = 'rgba(6, 182, 212, 0.4)';
        } else if (n.type === 'component') {
          color = '#10b981'; // component (green)
          glowColor = 'rgba(16, 185, 129, 0.4)';
        } else if (n.type === 'model') {
          color = '#8b5cf6'; // model (purple)
          glowColor = 'rgba(139, 92, 246, 0.4)';
        }

        // Glow ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size + 4, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Label
        ctx.font = '10px var(--font-sans)';
        ctx.fillStyle = '#f3f4f6';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + n.size + 14);
      });
    };

    const loop = () => {
      updatePhysics();
      render();
      requestRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [activeView, project.knowledgeGraph]);

  const hasGraph = project.knowledgeGraph && project.knowledgeGraph.nodes.length > 0;
  const gap = project.gapAnalysis;

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Codebase Analyzer & Spec Map</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Analyze architecture graphs and cross-reference documentation rules.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleScanCodebase} disabled={analyzing}>
            <RefreshCw size={16} style={{ marginRight: '8px' }} className={analyzing ? 'glow-pulse' : ''} />
            {analyzing ? 'Scanning...' : 'Scan Repository'}
          </button>
          <button className="btn btn-primary" onClick={handleScanDocs} disabled={analyzingDocs}>
            <FileCheck size={16} style={{ marginRight: '8px' }} />
            {analyzingDocs ? 'Comparing Specs...' : 'Compare with Specs'}
          </button>
        </div>
      </div>

      {/* Tab Selectors */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '24px', paddingBottom: '2px' }}>
        <button 
          onClick={() => setActiveView('graph')}
          style={{
            background: 'none', border: 'none', color: activeView === 'graph' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: 600, paddingBottom: '12px', borderBottom: activeView === 'graph' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem'
          }}
        >
          <Layers size={16} />
          Knowledge Graph Map
        </button>
        <button 
          onClick={() => setActiveView('gap')}
          style={{
            background: 'none', border: 'none', color: activeView === 'gap' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: 600, paddingBottom: '12px', borderBottom: activeView === 'gap' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem'
          }}
        >
          <FileText size={16} />
          Gap Analysis Report
        </button>
      </div>

      {/* Content Rendering */}
      {activeView === 'graph' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Visual Code Architecture</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Scanned module mappings and file connections.</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308' }} /> Folders
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#06b6d4' }} /> Endpoints
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} /> Components
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} /> Models
              </span>
            </div>
          </div>

          {hasGraph ? (
            <div className="canvas-container">
              <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
            </div>
          ) : (
            <div style={{ height: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Layers size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p>No architecture mappings found. Trigger "Scan Repository" to build knowledge graph.</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'gap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {gap ? (
            <>
              {/* Match Score Card */}
              <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: '70%' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Code vs. Spec Compliance Score
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
                    Cross-referenced PRD documentation rules against actual routes, models, and controllers in the project folder.
                  </p>
                  {/* Progress bar */}
                  <div style={{ height: '10px', borderRadius: '5px', backgroundColor: 'rgba(255,255,255,0.05)', marginTop: '16px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${gap.matchingScore}%`, backgroundColor: 'var(--color-primary)', boxShadow: '0 0 10px var(--color-primary-glow)' }} />
                  </div>
                </div>
                <div style={{ 
                  width: '90px', height: '90px', borderRadius: '50%', border: '4px solid var(--color-primary)', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 15px var(--color-primary-glow)'
                }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{gap.matchingScore}%</span>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Compliance</span>
                </div>
              </div>

              {/* Lists Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Implemented Features */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-success)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={18} /> Verified Implemented
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {gap.implementedFeatures.map((f: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.9rem', color: '#e2e8f0', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Features */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-error)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <X size={18} /> Documented but Missing
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {gap.missingFeatures.map((f: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.9rem', color: '#e2e8f0', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>✗</span>
                        <span>{f}</span>
                      </div>
                    ))}
                    {gap.missingFeatures.length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No missing requirements detected!</div>
                    )}
                  </div>
                </div>

                {/* Unexpected Features */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} /> Unexpected Implementations
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {gap.unexpectedFeatures.map((f: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.9rem', color: '#e2e8f0', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--color-warning)', fontWeight: 'bold' }}>!</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deprecated Features */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Percent size={18} /> Deprecated / Legacy
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {gap.deprecatedFeatures.map((f: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.9rem', color: 'var(--text-muted)', alignItems: 'flex-start' }}>
                        <span>•</span>
                        <span>{f}</span>
                      </div>
                    ))}
                    {gap.deprecatedFeatures.length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No deprecated functions found.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p>No specifications gap analysis found. Click "Compare with Specs" to prompt AI comparison.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
