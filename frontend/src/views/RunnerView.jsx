import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Pause, SkipForward, Square, CheckCircle, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { addHistoryRecord } from '../services/historyService';
import './RunnerView.css';

const RunnerView = () => {
    const navigate = useNavigate();
    const [config, setConfig] = useState(null);

    // Progress State
    const [completedFiles, setCompletedFiles] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0); // Estimated initially
    const [clients, setClients] = useState([]); // With status Wait/Progress/Done/Fail
    const [activeClient, setActiveClient] = useState(null);
    const [logs, setLogs] = useState([]);

    // Captcha
    const [captchaNeeded, setCaptchaNeeded] = useState(false);
    const [captchaMsg, setCaptchaMsg] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [timeLeft, setTimeLeft] = useState(120);

    const eventSourceRef = useRef(null);

    useEffect(() => {
        const saved = localStorage.getItem('active_download');
        if (saved) {
            const parsed = JSON.parse(saved);
            setConfig(parsed);
            const initialClients = parsed.clients.map(c => ({ ...c, status: 'Waiting', progress: '0/0' }));
            setClients(initialClients);
            setTotalFiles(parsed.clients.length * parsed.returns.length * Math.max(1, parsed.months.length));

            startEngine(parsed);
        } else {
            navigate('/download');
        }

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [navigate]);

    const startEngine = async (payload) => {
        try {
            await fetch('http://localhost:7842/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            connectSSE();
        } catch (e) {
            addLog('Failed to start engine. Please make sure setup is complete.', 'error');
        }
    };

    const connectSSE = () => {
        const source = new EventSource('http://localhost:7842/stream');
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
                    setCaptchaMsg(data.message);
                    setTimeLeft(120);
                } else if (data.type === 'done') {
                    addLog('Download run complete.', 'success');
                    setClients(prev => {
                        const updatedClients = prev.map(c => c.status === 'In Progress' ? { ...c, status: 'Completed' } : c);

                        // Calculate final stats
                        const failedCount = updatedClients.filter(c => c.status === 'Failed').length;
                        const finalStatus = failedCount === 0 ? 'Completed' : (failedCount === updatedClients.length ? 'Failed' : 'Partial');

                        // Extract completedFiles directly from the current state variable by using the setter callback trick to get latest,
                        // or just rely on the fact that if we use a ref it's easier. For now, since it updates sequentially, 
                        // we can estimate from totalFiles.

                        source.close();
                        return updatedClients;
                    });

                    // We need to wait for setCompletedFiles to settle or just use a rough estimate if we are mocking
                    // To ensure we get the latest value without complex refs, let's use a function inside setCompletedFiles
                    setCompletedFiles(latestCompleted => {
                        addHistoryRecord({
                            clients: payload.clients.length,
                            files: latestCompleted,
                            duration: '0m', // Calculate real duration if needed in future
                            status: latestCompleted === 0 ? 'Failed' : (latestCompleted < totalFiles ? 'Partial' : 'Completed')
                        });
                        return latestCompleted;
                    });
                }
            } catch (err) {
                addLog(e.data, 'info');
            }
        };

        source.onerror = () => {
            // Stream naturally ends or errors out.
        };
    };

    const addLog = (msg, type = 'info') => {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
    };

    const submitCaptcha = async () => {
        try {
            await fetch('http://localhost:7842/captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ captcha: captchaInput })
            });
            setCaptchaNeeded(false);
            setCaptchaInput('');
            addLog('Captcha submitted. Resuming...', 'success');
        } catch (e) {
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
    }, [captchaNeeded, timeLeft]);

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
                            <button className="btn-secondary flex-1 mx-1"><Pause size={16} /> Pause</button>
                            <button className="btn-secondary flex-1 mx-1"><SkipForward size={16} /> Skip</button>
                            <button className="btn-secondary flex-1 mx-1 text-error"><Square size={16} fill="currentColor" /> Stop</button>
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
                                            <p className="text-sm mt-1 text-warning-text">Please type the captcha shown and click Login. The rest is automatic.</p>
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
