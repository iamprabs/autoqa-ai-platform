import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Cpu, 
  Terminal, 
  Code, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileImage,
  RefreshCw
} from 'lucide-react';

interface TestRunnerProps {
  projectId: string;
  projectPath: string;
}

export default function TestRunner({ projectId, projectPath }: TestRunnerProps) {
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [activeRightTab, setActiveRightTab] = useState<'code' | 'terminal'>('code');
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const fetchTests = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tests`);
      const data = await res.json();
      setTests(data);
      if (data.length > 0) {
        setSelectedTest(data[0]);
      }
    } catch (e) {
      console.error('Error fetching test cases:', e);
    }
  };

  useEffect(() => {
    fetchTests();
    setRunResult(null);
    setTerminalLogs([]);
  }, [projectId]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Generate test cases
  const handleGenerateTests = async () => {
    setGenerating(true);
    setTerminalLogs([`[AI Test Architect] Analyzing code files and specifications...`, `[AI Test Architect] Generating comprehensive test suite...`]);
    setActiveRightTab('terminal');
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-tests`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setTests(data);
        if (data.length > 0) setSelectedTest(data[0]);
        setTerminalLogs(prev => [...prev, `[AI Test Architect] Generated ${data.length} test scripts successfully.`, `[AI Test Architect] Click "Run Regression Suite" to execute.`]);
      }
    } catch (e) {
      console.error(e);
      setTerminalLogs(prev => [...prev, `[ERROR] Test generation failed.`]);
    } finally {
      setGenerating(false);
    }
  };

  // Run generated test suite (streams logs segment-by-segment)
  const handleRunTests = async () => {
    if (tests.length === 0) return;
    setRunning(true);
    setRunResult(null);
    setTerminalLogs([]);
    setActiveRightTab('terminal');

    try {
      // Trigger execution API
      const res = await fetch(`/api/projects/${projectId}/run-tests`, {
        method: 'POST'
      });
      const resultData = await res.json();

      if (!res.ok) {
        setTerminalLogs([`[ERROR] Execution failed: ${resultData.error}`]);
        setRunning(false);
        return;
      }

      // Stream logs chunk-by-chunk for high-fidelity realism
      const logLines = resultData.consoleLogs.split('\n');
      let currentLine = 0;
      
      const interval = setInterval(() => {
        if (currentLine < logLines.length) {
          setTerminalLogs(prev => [...prev, logLines[currentLine]]);
          currentLine++;
        } else {
          clearInterval(interval);
          setRunResult(resultData);
          setRunning(false);
        }
      }, 150); // delay between lines

    } catch (e) {
      console.error(e);
      setTerminalLogs(prev => [...prev, `[ERROR] Server execution error occurred.`]);
      setRunning(false);
    }
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Autonomous Test Runner</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>AI-generated regression scripts, execution evidence logs, and E2E visual screenshot outputs.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleGenerateTests} disabled={generating || running}>
            <Cpu size={16} style={{ marginRight: '8px' }} />
            {generating ? 'Generating scripts...' : 'Generate Tests'}
          </button>
          <button className="btn btn-primary" onClick={handleRunTests} disabled={running || tests.length === 0}>
            <Play size={16} style={{ marginRight: '8px' }} className={running ? 'glow-pulse' : ''} />
            {running ? 'Executing...' : 'Run Regression Suite'}
          </button>
        </div>
      </div>

      {/* Main Runner Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '4fr 5fr', gap: '24px', minHeight: '520px' }}>
        
        {/* Left Column: Test Cases List */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Test Cases List</h3>
            <span className="badge badge-primary">{tests.length} Total</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
            {tests.length > 0 ? (
              tests.map((test) => {
                // Find execution result for this test case
                const result = runResult?.results.find((r: any) => r.testId === test.id);
                return (
                  <div 
                    key={test.id}
                    onClick={() => setSelectedTest(test)}
                    style={{
                      padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
                      backgroundColor: selectedTest?.id === test.id ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: selectedTest?.id === test.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                      transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <div style={{ width: '85%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{test.category}</span>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {test.name}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {test.description}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Show status icon if execution has run */}
                      {result && (
                        result.status === 'passed' ? (
                          <CheckCircle size={16} color="var(--color-success)" />
                        ) : (
                          <XCircle size={16} color="var(--color-error)" />
                        )
                      )}
                      
                      {/* Show evidence button if screenshot is present */}
                      {result?.screenshot && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvidence(result.screenshot);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}
                          title="Inspect screenshot evidence"
                        >
                          <FileImage size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0', fontSize: '0.9rem' }}>
                No test scripts generated yet. Click "Generate Tests" to compile a regression suite using codebase logic.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Viewer / Terminal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tab Selection */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px', paddingBottom: '2px' }}>
            <button 
              onClick={() => setActiveRightTab('code')}
              style={{
                background: 'none', border: 'none', color: activeRightTab === 'code' ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: 600, paddingBottom: '8px', borderBottom: activeRightTab === 'code' ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem'
              }}
            >
              <Code size={16} />
              Script Source Code
            </button>
            <button 
              onClick={() => setActiveRightTab('terminal')}
              style={{
                background: 'none', border: 'none', color: activeRightTab === 'terminal' ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: 600, paddingBottom: '8px', borderBottom: activeRightTab === 'terminal' ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem'
              }}
            >
              <Terminal size={16} />
              Live Console Output
            </button>
          </div>

          {/* Right tab content */}
          {activeRightTab === 'code' ? (
            <div className="glass-card" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {selectedTest ? (
                <>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedTest.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Target file: <code>{selectedTest.file}</code></p>
                  </div>
                  <pre style={{ flex: 1, maxHeight: '340px' }}>
                    <code>{selectedTest.code}</code>
                  </pre>
                </>
              ) : (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Select a test case to view source code script.
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="terminal-window" style={{ flex: 1 }}>
                {terminalLogs.map((line, idx) => (
                  <div key={idx} style={{ 
                    marginBottom: '4px',
                    color: line && typeof line === 'string' && line.includes('[ERROR]') ? 'var(--color-error)' : 
                           line && typeof line === 'string' && line.includes('[RUN]') ? '#fff' : 
                           line && typeof line === 'string' && line.includes('Result: PASSED') ? 'var(--color-success)' :
                           line && typeof line === 'string' && line.includes('Result: FAILED') ? 'var(--color-error)' : '#cbd5e1'
                  }}>
                    {line}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Screenshot Evidence Modal */}
      {selectedEvidence && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(6px)'
        }} onClick={() => setSelectedEvidence(null)}>
          <div className="glass-card" style={{ padding: '20px', maxWidth: '840px', display: 'flex', flexDirection: 'column', gap: '12px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Test Run Browser Evidence (DOM Capture)</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setSelectedEvidence(null)}>Close</button>
            </div>
            <img src={selectedEvidence} alt="Test evidence capture" style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
