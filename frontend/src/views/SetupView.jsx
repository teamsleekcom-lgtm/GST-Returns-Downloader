import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isEngineRunning } from '../services/engineService';
import { CheckCircle2, Download, Loader2, HelpCircle, Monitor, Shield, Zap } from 'lucide-react';
import './SetupView.css';

const SetupView = () => {
    const [step, setStep] = useState(1);
    const [showTroubleshooting, setShowTroubleshooting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let interval;
        let attempts = 0;
        if (step === 1) {
            interval = setInterval(async () => {
                attempts++;
                const running = await isEngineRunning();
                if (running) {
                    setStep(2);
                    clearInterval(interval);
                    setTimeout(() => {
                        navigate('/dashboard', { replace: true });
                    }, 3000);
                }
                // Show troubleshooting after 30 seconds (~10 attempts)
                if (attempts >= 10 && !showTroubleshooting) {
                    setShowTroubleshooting(true);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [step, navigate, showTroubleshooting]);

    return (
        <div className="setup-container flex-center">
            <div className="card setup-card">
                <h2 className="setup-title">GSTR Downloader</h2>
                <p className="setup-subtitle">Bulk download GST returns for all your clients in one click.</p>

                {/* Feature highlights */}
                <div className="features-row" style={{ display: 'flex', gap: '1.5rem', margin: '1.5rem 0', justifyContent: 'center' }}>
                    <div className="feature-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Shield size={16} style={{ color: 'var(--primary)' }} />
                        <span>100% Local &amp; Private</span>
                    </div>
                    <div className="feature-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Zap size={16} style={{ color: 'var(--primary)' }} />
                        <span>One-Click Setup</span>
                    </div>
                    <div className="feature-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Monitor size={16} style={{ color: 'var(--primary)' }} />
                        <span>Works Offline</span>
                    </div>
                </div>

                <div className="steps-container">
                    {/* Step 1 */}
                    <div className={`step-item ${step >= 1 ? 'active' : ''}`}>
                        <div className="step-icon">
                            {step > 1 ? <CheckCircle2 className="text-success" /> : <div className="step-number">1</div>}
                        </div>
                        <div className="step-content">
                            <h3>Download &amp; Run</h3>
                            {step === 1 ? (
                                <>
                                    <a
                                        href="/GST_Downloader.bat"
                                        download="GST_Downloader.bat"
                                        className="btn-primary mt-4"
                                        style={{ display: 'inline-flex', textDecoration: 'none' }}
                                    >
                                        <Download size={18} /> Download GST Downloader
                                    </a>
                                    <div className="instruction-text mt-3" style={{ lineHeight: '1.8' }}>
                                        <strong>How it works:</strong>
                                        <ol style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
                                            <li>Download the file above</li>
                                            <li>Double-click <code>GST_Downloader.bat</code> to run it</li>
                                            <li>It will set up everything and open the app in your browser</li>
                                        </ol>
                                        <p className="text-sm text-muted mt-2">
                                            <strong>Requires:</strong> Python 3.8+ installed with "Add to PATH" checked. <a href="https://python.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Get Python →</a>
                                        </p>
                                    </div>

                                    <div className="waiting-message flex-center mt-4">
                                        <Loader2 className="spinner" size={16} />
                                        <span>Waiting for engine to start&hellip;</span>
                                    </div>

                                    {showTroubleshooting && (
                                        <div className="troubleshooting-box mt-4" style={{
                                            padding: '1rem',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            <h4 className="flex-center" style={{ gap: '0.5rem', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
                                                <HelpCircle size={16} className="text-warning" />
                                                <span className="font-medium">Taking too long?</span>
                                            </h4>
                                            <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.8', paddingLeft: '1.25rem' }}>
                                                <li><strong>Python not installed?</strong> Download from <a href="https://python.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>python.org</a> — check "Add Python to PATH".</li>
                                                <li><strong>Firewall blocking?</strong> Allow Python through your firewall, or add port 7842 as an exception.</li>
                                                <li><strong>Antivirus interference?</strong> Add an exception for <code>%USERPROFILE%\GST_Engine</code>.</li>
                                                <li><strong>Corporate network?</strong> Try disconnecting VPN temporarily.</li>
                                                <li><strong>Try running</strong> <code>GST_Downloader.bat</code> as Administrator (right-click → Run as administrator).</li>
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="instruction-text text-success mt-2">Setup complete!</p>
                            )}
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className={`step-item ${step === 2 ? 'active' : ''} ${step < 2 ? 'pending' : ''}`}>
                        <div className="step-icon">
                            <div className="step-number">2</div>
                        </div>
                        <div className="step-content">
                            <h3>Launching Dashboard</h3>
                            {step === 2 && (
                                <div className="progress-container mt-3">
                                    <div className="progress-bar-animated"></div>
                                    <p className="progress-text mt-2">Almost there — redirecting you now&hellip;</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupView;
