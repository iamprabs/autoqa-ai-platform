import React, { useState, useEffect } from 'react';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Flame, 
  Activity,
  History,
  AlertTriangle,
  Cpu
} from 'lucide-react';

interface DashboardProps {
  projectId: string;
  onNavigate: (tab: any) => void;
}

export default function Dashboard({ projectId, onNavigate }: DashboardProps) {
  const [runs, setRuns] = useState<any[]>([]);
  const [healedBugs, setHealedBugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    
    // Fetch runs and bugs in parallel
    Promise.all([
      fetch(`/api/projects/${projectId}/runs`).then(res => res.json()),
      fetch(`/api/projects/${projectId}/healed-bugs`).then(res => res.json())
    ])
      .then(([runsData, bugsData]) => {
        setRuns(runsData);
        setHealedBugs(bugsData);
      })
      .catch(e => console.error('Error fetching dashboard stats:', e))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Aggregate stats
  const totalRuns = runs.length;
  const latestRun = runs[0] || null;
  const totalHealed = healedBugs.filter(b => b.status === 'applied').length;
  
  // Calculate average pass rate
  let avgPassRate = 0;
  if (totalRuns > 0) {
    const sum = runs.reduce((acc, run) => acc + (run.passedTests / run.totalTests), 0);
    avgPassRate = Math.round((sum / totalRuns) * 100);
  }

  // Calculate trends for chart (last 5 runs)
  const chartRuns = [...runs].slice(0, 5).reverse();

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>AutoQA Executive Summary</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Autonomous test case orchestration, execution insights, and code healing logs.</p>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="dashboard-grid">
        {/* Metric 1 */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-primary)' }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Regression Runs</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '2px' }}>{totalRuns}</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Average Pass Rate</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '2px', color: 'var(--color-success)' }}>
              {totalRuns > 0 ? `${avgPassRate}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
            <XCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Recent Failures</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '2px', color: latestRun?.status === 'failed' ? 'var(--color-error)' : 'var(--text-primary)' }}>
              {latestRun ? latestRun.failedTests : 0}
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--color-purple)' }}>
            <Flame size={24} className="glow-pulse-purple" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Auto-Healed Bugs</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '2px', color: 'var(--color-purple)' }}>{totalHealed}</div>
          </div>
        </div>
      </div>

      {/* Main Charts & History section */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
        {/* Left Column: Visual Custom Chart & Flaky checks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Trend Chart */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <History size={18} color="var(--color-primary)" />
              Historical Run Pass Trend
            </h2>
            
            {chartRuns.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chartRuns.map((run, idx) => {
                  const passPercent = Math.round((run.passedTests / run.totalTests) * 100);
                  const failPercent = 100 - passPercent;
                  return (
                    <div key={run.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '80px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        Run #{idx + 1}
                      </div>
                      <div style={{ flex: 1, height: '14px', borderRadius: '7px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex' }}>
                        <div style={{ width: `${passPercent}%`, backgroundColor: 'var(--color-success)', transition: 'width 0.5s' }} />
                        <div style={{ width: `${failPercent}%`, backgroundColor: 'var(--color-error)', transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ width: '90px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: run.status === 'passed' ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {passPercent}% Pass
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></span>
                    Passed Tests
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-error)' }}></span>
                    Failed Tests
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No run history data available. Go to Autonomous Runner to execute tests.
              </div>
            )}
          </div>

          {/* Flaky & Health Panel */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} color="var(--color-warning)" />
              Flaky & Critical Issues Analyzer
            </h2>
            
            {latestRun?.status === 'failed' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ 
                  display: 'flex', gap: '12px', padding: '14px', borderRadius: '8px', 
                  backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' 
                }}>
                  <AlertTriangle size={20} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-warning)' }}>Checkout Validation Failure detected!</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Test case <code>Checkout Flow validation</code> has failed 100% of recent runs. AI suspects rigid email regex validation checks.
                    </div>
                    <button 
                      onClick={() => onNavigate('healing')}
                      style={{ 
                        marginTop: '8px', background: 'none', border: 'none', color: 'var(--color-purple)', 
                        fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' 
                      }}
                    >
                      <Cpu size={14} className="glow-pulse-purple" /> Trigger Self-Healing
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--color-success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} />
                All systems healthy. No flaky test patterns identified.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution History Log */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={18} color="var(--color-purple)" />
            Recent Executions
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '340px' }}>
            {runs.length > 0 ? (
              runs.map((run, idx) => (
                <div key={run.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Run #{runs.length - idx}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {new Date(run.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {run.passedTests}/{run.totalTests} Passed
                    </div>
                    <span className={`badge ${run.status === 'passed' ? 'badge-success' : 'badge-error'}`}>
                      {run.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '0.9rem' }}>
                No recent executions found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
