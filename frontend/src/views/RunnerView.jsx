import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Pause, SkipForward, Square, CheckCircle, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { addHistoryRecord } from '../services/historyService';
import { ENGINE_BASE } from '../services/config';
import './RunnerView.css';

const RunnerView = () => {
    const navigate = useNavigate();

    // Progress State
    const [completedFiles, setCompletedFiles] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);
    const [clients, setClients] = useState([]);
    const [activeClient, setActiveClient] = useState(null);
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isDone, setIsDone] = useState(false);

    // Captcha
    const [captchaNeeded, setCaptchaNeeded] = useState(false);
    const [captchaMsg, setCaptchaMsg] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [timeLeft, setTimeLeft] = useState(120);

    const eventSourceRef = useRef(null);
    // Refs to avoid stale closures in SSE callbacks
    const configRef = useRef(null);
    const totalFilesRef = useRef(0);
    const startTimeRef = useRef(null);

    const addLog = useCallback((msg, type = 'info') => {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
    }, []);

    const connectSSE = useCallback(() => {
        const source = new EventSource(`${ENGINE_BASE}/stream`);
        eventSourceRef.current = source;

        source.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'log') {
                    addLog(data.message, 'info');
                } else if (data.type === 'progress') {
                    setActiveClient(data.client);
                    setClients(prev => prev.map(c => c.name === data.client ? { ...c, status: 'In Progress' } : c));
                    if (data.completed) setCompletedFiles(prev => prev + 1);
                } else if (data.type === 'captcha') {
                    setCaptchaNeeded(true);
                    setCaptchaMsg(data.message || 'Captcha required for login. See browser window.');
                    setTimeLeft(120);
                } else if (data.type === 'done') {
                    addLog('Download run complete.', 'success');
                    setIsRunning(false);
                    setIsDone(true);

                    setClients(prev => {
                        const updatedClients = prev.map(c => c.status === 'In Progress' ? { ...c, status: 'Completed' } : c);
                        source.close();
                        return updatedClients;
                    });

                    // Use refs for latest values (avoids stale closure)
                    setCompletedFiles(latestCompleted => {
                        const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 60000) : 0;
                        const durationStr = elapsed < 1 ? '<1m' : `${elapsed}m`;
                        const total = totalFilesRef.current;
                        const clientCount = configRef.current ? configRef.current.clients.length : 0;

                        addHistoryRecord({
                            clients: clientCount,
                            files: latestCompleted,
                            duration: durationStr,
                            status: latestCompleted === 0 ? 'Failed' : (latestCompleted < total ? 'Partial' : 'Completed')
                        });

                        // Cleanup active_download so refreshing doesn't re-trigger
                        localStorage.removeItem('active_download');

                        return latestCompleted;
                    });
                }
            } catch (err) {
                console.error(err);
                addLog(e.data, 'info');
            }
        };

        source.onerror = () => {
            // Stream naturally ends or errors out.
        };
    }, [addLog]);

    const startEngine = useCallback(async (payload) => {
        try {
            setIsRunning(true);
            startTimeRef.current = Date.now();
            await fetch(`${ENGINE_BASE}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            connectSSE();
        } catch (err) {
            console.error(err);
            addLog('Failed to start engine. Please make sure setup is complete.', 'error');
            setIsRunning(false);
        }
    }, [connectSSE, addLog]);

    useEffect(() => {
        // Try sessionStorage first (has full payload with credentials)
        // Fall back to localStorage (safe version, no passwords — used for UI only)
        const savedFull = sessionStorage.getItem('active_download_full');
        const savedSafe = localStorage.getItem('active_download');
        const saved = savedFull || savedSafe;

        if (saved) {
            const parsed = JSON.parse(saved);
            configRef.current = parsed;
            const initialClients = parsed.clients.map(c => ({ ...c, status: 'Waiting', progress: '0/0' }));
            setClients(initialClients);
            const total = parsed.clients.length * parsed.returns.length * Math.max(1, parsed.months.length);
            setTotalFiles(total);
            totalFilesRef.current = total;

            startEngine(parsed);

            // Clean up sessionStorage after reading (one-time use)
            sessionStorage.removeItem('active_download_full');
        } else {
            navigate('/download');
        }

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [navigate, startEngine]);

    // --- Control Buttons ---
    const handlePause = async () => {
        try {
            await fetch(`${ENGINE_BASE}/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pause' })
            });
            addLog('Pause requested...', 'info');
        } catch (err) {
            console.error(err);
        }
    };

    const handleSkip = async () => {
        try {
            await fetch(`${ENGINE_BASE}/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'skip' })
            });
            addLog('Skipping current client...', 'info');
        } catch (err) {
            console.error(err);
        }
    };

    const handleStop = async () => {
        if (!window.confirm('Are you sure you want to stop the download?')) return;
        try {
            await fetch(`${ENGINE_BASE}/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'stop' })
            });
            addLog('Stop requested. Finishing current file...', 'error');
        } catch (err) {
            console.error(err);
        }
    };

    const submitCaptcha = async () => {
        try {
            await fetch(`${ENGINE_BASE}/captcha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ captcha: captchaInput })
            });
            setCaptchaNeeded(false);
            setCaptchaInput('');
            addLog('Captcha submitted. Resuming...', 'success');
        } catch (err) {
            console.error(err);
            addLog('Failed to submit captcha.', 'error');
        }
    };

    useEffect(() => {
        let timer;
        if (captchaNeeded && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 && captchaNeeded) {
            setCaptchaNeeded(false);
            addLog("Captcha not solved in time. Client skipped.", "error");
        }
        return () => clearInterval(timer);
    }, [captchaNeeded, timeLeft, addLog]);

    const progressPercent = totalFiles > 0 ? Math.min(100, Math.round((completedFiles / totalFiles) * 100)) : 0;

    return (
        <MainLayout title="Live Progress">
            <div className="runner-container">

                {/* Top Progress bar */}
                <div className="card mb-6 flex-col">
                    <div className="flex-between mb-2">
                        <span className="font-medium">{completedFiles} of ~{totalFiles} files downloaded</span>
                        <span className="text-primary font-medium">{progressPercent}%</span>
                    </div>
                    <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    {isDone && (
                        <div className="flex-center mt-4 gap-4">
                            <button className="btn-primary" onClick={() => navigate('/history')}>View History</button>
                            <button className="btn-secondary" onClick={() => navigate('/download')}>New Download</button>
                        </div>
                    )}
                </div>

                <div className="runner-grid">

                    {/* Left Panel - Queue */}
                    <div className="card queue-panel flex-col">
                        <h3 className="section-title mb-4">Client Queue</h3>
                        <div className="queue-list flex-1">
                            {clients.map(c => (
                                <div key={c.id} className={`queue-item flex-between ${activeClient === c.name ? 'active-queue-item' : ''}`}>
                                    <div className="font-medium truncate flex-1 pr-2">{c.name}</div>
                                    <div className="queue-status">
                                        {c.status === 'Waiting' && <Clock size={16} className="text-muted" />}
                                        {c.status === 'In Progress' && <Loader2 size={16} className="text-primary spinner" />}
                                        {c.status === 'Completed' && <CheckCircle size={16} className="text-success" />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="controls-row flex-between mt-4 pt-4 border-t">
                            <button className="btn-secondary flex-1 mx-1" onClick={handlePause} disabled={!isRunning}><Pause size={16} /> Pause</button>
                            <button className="btn-secondary flex-1 mx-1" onClick={handleSkip} disabled={!isRunning}><SkipForward size={16} /> Skip</button>
                            <button className="btn-secondary flex-1 mx-1 text-error" onClick={handleStop} disabled={!isRunning}><Square size={16} fill="currentColor" /> Stop</button>
                        </div>
                    </div>

                    {/* Right Panel - Active / Logs */}
                    <div className="flex-col gap-6 flex-1 min-w-0">

                        {/* Captcha Banner */}
                        {captchaNeeded && (
                            <div className="captcha-banner pulsing bg-warning card">
                                <div className="flex-between">
                                    <div className="flex-center gap-3">
                                        <AlertTriangle size={24} className="text-warning-icon" />
                                        <div>
                                            <h4 className="font-medium text-warning-title">Action needed — A browser tab has opened</h4>
                                            <p className="text-sm mt-1 text-warning-text">{captchaMsg}</p>
                                        </div>
                                    </div>
                                    <div className="text-right text-warning-title">
                                        <div className="font-bold text-xl">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>
                                        <div className="text-sm">remaining</div>
                                    </div>
                                </div>
                                <div className="flex-center mt-5 gap-4">
                                    <input
                                        type="text"
                                        className="input-field max-w-sm uppercase-input"
                                        placeholder="Type captcha here..."
                                        value={captchaInput}
                                        onChange={e => setCaptchaInput(e.target.value)}
                                    />
                                    <button className="btn-primary" onClick={submitCaptcha}>Submit Login</button>
                                </div>
                            </div>
                        )}

                        <div className="card active-panel flex-1 flex-col">
                            <h3 className="section-title mb-4">Live Activity Log</h3>
                            <div className="logs-container flex-1 bg-code">
                                {logs.length === 0 && <div className="text-muted p-4">Waiting for engine response...</div>}
                                {logs.map((log, i) => (
                                    <div key={i} className={`log-entry log-${log.type}`}>
                                        <span className="log-time">[{log.time}]</span>
                                        <span className="log-msg ml-2">{log.msg}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </MainLayout>
    );
};

export default RunnerView;
