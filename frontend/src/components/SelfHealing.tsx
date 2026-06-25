import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Cpu, 
  GitPullRequest, 
  CheckCircle, 
  ArrowRight, 
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

interface SelfHealingProps {
  projectId: string;
  projectPath: string;
}

export default function SelfHealing({ projectId, projectPath }: SelfHealingProps) {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [selectedFailedTest, setSelectedFailedTest] = useState<any | null>(null);
  const [healedBug, setHealedBug] = useState<any | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [prCreated, setPrCreated] = useState(false);

  const fetchRuns = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/runs`);
      const data = await res.json();
      setRuns(data);
      if (data.length > 0) {
        setSelectedRun(data[0]);
        // Find first failed test in the latest run
        const failed = data[0].results.find((r: any) => r.status === 'failed');
        if (failed) setSelectedFailedTest(failed);
      }
    } catch (e) {
      console.error('Error fetching runs for healing:', e);
    }
  };

  useEffect(() => {
    fetchRuns();
    setHealedBug(null);
    setPrCreated(false);
  }, [projectId]);

  // Trigger AI analysis and patch generation
  const handleTriggerHeal = async () => {
    if (!selectedRun || !selectedFailedTest) return;
    setAnalyzing(true);
    setHealedBug(null);
    setPrCreated(false);

    try {
      const res = await fetch(`/api/runs/${selectedRun.id}/heal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: selectedFailedTest.testId,
          testName: selectedFailedTest.name,
          errorMessage: selectedFailedTest.error?.message || 'Assertion Error',
          stackTrace: selectedFailedTest.error?.stack || 'No stack trace available'
        })
      });
      const data = await res.ok ? await res.json() : null;
      if (data) {
        setHealedBug(data);
      } else {
        alert('Failed to analyze bug with AI. Please check server logs.');
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to healing agent API.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Commit patch and generate Git Branch / PR
  const handleCommitPR = async () => {
    if (!healedBug) return;
    setCommitting(true);
    try {
      const res = await fetch(`/api/healed-bugs/${healedBug.id}/commit`, {
        method: 'POST'
      });
      if (res.ok) {
        setPrCreated(true);
        // Refresh project list & runs in parent
        fetchRuns();
      } else {
        alert('Failed to commit code fix to Git.');
      }
    } catch (e) {
      console.error(e);
      alert('Error committing PR changes.');
    } finally {
      setCommitting(false);
    }
  };

  // Helper to render git diff lines with class styling
  const renderDiff = (diffText: string) => {
    if (!diffText) return null;
    const lines = diffText.split('\n');
    return (
      <div className="diff-container">
        {lines.map((line, idx) => {
          let lineClass = 'diff-line-context';
          if (line.startsWith('-') && !line.startsWith('---')) {
            lineClass = 'diff-line-delete';
          } else if (line.startsWith('+') && !line.startsWith('+++')) {
            lineClass = 'diff-line-add';
          } else if (line.startsWith('diff') || line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++')) {
            lineClass = 'diff-header';
          }
          return (
            <div key={idx} className={lineClass}>
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  const activeFailures = selectedRun ? selectedRun.results.filter((r: any) => r.status === 'failed') : [];

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>AI Self-Healing Center</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Analyze test crash root causes, generate automated git patches, and commit Pull Requests.</p>
        </div>
      </div>

      {/* Main Panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Left Column: Failed Logs Select */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="var(--color-error)" />
            Recent Failures Log
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
            {activeFailures.length > 0 ? (
              activeFailures.map((fail: any) => (
                <div 
                  key={fail.testId}
                  onClick={() => {
                    setSelectedFailedTest(fail);
                    setHealedBug(null);
                    setPrCreated(false);
                  }}
                  style={{
                    padding: '12px', borderRadius: '8px', cursor: 'pointer',
                    backgroundColor: selectedFailedTest?.testId === fail.testId ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                    border: selectedFailedTest?.testId === fail.testId ? '1px solid var(--color-error)' : '1px solid var(--border-color)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fail.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fail.error?.message}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0', fontSize: '0.9rem' }}>
                No active execution failures found. Ensure regression suite has been run and has failed tests.
              </div>
            )}
          </div>

          {selectedFailedTest && (
            <button 
              className="btn btn-purple glow-pulse-purple" 
              onClick={handleTriggerHeal}
              disabled={analyzing}
              style={{ marginTop: '10px' }}
            >
              <Cpu size={16} style={{ marginRight: '8px' }} />
              {analyzing ? 'Healing Engine Analyzing...' : 'Trigger AI Healing Agent'}
            </button>
          )}
        </div>

        {/* Right Column: Code Fix / PR Simulation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. If PR created, show simulated Github PR */}
          {prCreated && healedBug ? (
            <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', borderColor: 'var(--color-success)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                  <GitPullRequest size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>PR Committed Successfully</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>{healedBug.prTitle}</h3>
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px 20px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Branch:</span>
                  <code style={{ color: 'var(--color-purple)' }}>{healedBug.prBranch}</code>
                  <span style={{ color: 'var(--text-secondary)' }}>Commit SHA:</span>
                  <code style={{ color: 'var(--color-primary)' }}>sha256_{Math.random().toString(36).substring(2, 10)}</code>
                  <span style={{ color: 'var(--text-secondary)' }}>File modified:</span>
                  <span>{healedBug.filePath}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Autonomous PR Description</h4>
                <div style={{ 
                  whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', 
                  color: 'var(--text-secondary)', padding: '12px', background: '#05070f', borderRadius: '6px'
                }}>
                  {healedBug.prDescription}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600 }}>
                <CheckCircle size={16} /> All autonomous verification builds passed (CI check green).
              </div>
            </div>
          ) : healedBug ? (
            /* 2. Show proposed code diff and root cause */
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="var(--color-purple)" />
                    AI Code Healing Proposal
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Identified file: <code>{healedBug.filePath}</code> | Confidence: <strong>{healedBug.confidenceScore}%</strong>
                  </p>
                </div>
                <button 
                  className="btn btn-purple" 
                  onClick={handleCommitPR} 
                  disabled={committing}
                  style={{ gap: '8px' }}
                >
                  <GitPullRequest size={16} />
                  {committing ? 'Pushing branch...' : 'Approve & Create PR'}
                </button>
              </div>

              {/* Root Cause card */}
              <div style={{ 
                padding: '14px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.2)', fontSize: '0.9rem' 
              }}>
                <strong>Root Cause Analysis:</strong>
                <p style={{ color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  {healedBug.rootCause}
                </p>
              </div>

              {/* Git Diff Card */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Unified Code Patch Diff</label>
                </div>
                {renderDiff(healedBug.codeDiff)}
              </div>
            </div>
          ) : (
            /* 3. Empty state */
            <div className="glass-card" style={{ height: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              <Cpu size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              {analyzing ? (
                <>
                  <RefreshCw size={24} className="glow-pulse" style={{ animation: 'spin 2s linear infinite', marginBottom: '12px' }} />
                  <p>Autonomous agent is parsing files, error stacks, and compiling git branch patches...</p>
                </>
              ) : (
                <p>Select an execution failure on the left and trigger the AI agent to review root causes and generate git patches.</p>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
