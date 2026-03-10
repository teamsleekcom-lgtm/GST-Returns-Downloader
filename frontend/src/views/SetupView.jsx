import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isEngineRunning } from '../services/engineService';
import { CheckCircle2, Download, Loader2, AlertTriangle, HelpCircle } from 'lucide-react';
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

    const handleDownload = () => {
        const scriptContent = [
            "@echo off",
            "echo ============================================================",
            "echo   GST Returns Downloader - Engine Setup",
            "echo ============================================================",
            "echo.",
            "echo Please wait while we configure your secure local environment.",
            "echo.",
            "",
            "REM Close any existing engine process",
            "taskkill /f /im python.exe /fi \"WINDOWTITLE eq GST_Engine\" >nul 2>&1",
            "taskkill /f /im pythonw.exe >nul 2>&1",
            "",
            "REM Create working directory",
            "mkdir \"%USERPROFILE%\\GST_Engine\" 2>nul",
            "cd /d \"%USERPROFILE%\\GST_Engine\"",
            "",
            "echo [1/4] Downloading core engine...",
            "curl -sL \"https://raw.githubusercontent.com/teamsleekcom-lgtm/GST-Returns-Downloader/master/engine/main.py\" -o main.py",
            "if not exist main.py (",
            "    echo ERROR: Failed to download engine. Check your internet connection.",
            "    pause",
            "    exit /b 1",
            ")",
            "",
            "echo [2/4] Setting up Python environment...",
            "python --version >nul 2>&1",
            "if errorlevel 1 (",
            "    echo ERROR: Python is not installed or not on PATH.",
            "    echo Please install Python from https://python.org and ensure",
            "    echo 'Add Python to PATH' is checked during installation.",
            "    pause",
            "    exit /b 1",
            ")",
            "python -m venv venv 2>nul",
            "call .\\venv\\Scripts\\Activate.bat",
            "",
            "echo [3/4] Installing dependencies...",
            "pip install fastapi uvicorn selenium >nul 2>&1",
            "",
            "echo [4/4] Starting background engine on port 7842...",
            "",
            "REM Try pythonw first (silent), fall back to python if not available",
            "where pythonw >nul 2>&1",
            "if %errorlevel%==0 (",
            "    start \"GST_Engine\" /min pythonw -m uvicorn main:app --host 127.0.0.1 --port 7842",
            ") else (",
            "    start \"GST_Engine\" /min python -m uvicorn main:app --host 127.0.0.1 --port 7842",
            ")",
            "",
            "echo.",
            "echo ============================================================",
            "echo   Setup complete! You can close this window.",
            "echo   Go back to your browser - the app will detect the engine.",
            "echo ============================================================",
            "timeout /t 5 >nul",
            "exit"
        ].join("\r\n");

        const element = document.createElement("a");
        const file = new Blob([scriptContent], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = "GST_Setup.bat";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className="setup-container flex-center">
            <div className="card setup-card">
                <h2 className="setup-title">Welcome to GST Returns Downloader</h2>
                <p className="setup-subtitle">Let's get things ready for you.</p>

                <div className="steps-container">
                    {/* Step 1 */}
                    <div className={`step-item ${step >= 1 ? 'active' : ''}`}>
                        <div className="step-icon">
                            {step > 1 ? <CheckCircle2 className="text-success" /> : <div className="step-number">1</div>}
                        </div>
                        <div className="step-content">
                            <h3>One Required Download</h3>
                            {step === 1 ? (
                                <>
                                    <button className="btn-primary mt-4" onClick={handleDownload}>
                                        <Download size={18} /> Download Setup File
                                    </button>
                                    <p className="instruction-text mt-3">
                                        Run the file after downloading. A command window will open, install
                                        dependencies, and start the local engine. Come back here when it's done.
                                    </p>
                                    <div className="waiting-message flex-center mt-4">
                                        <Loader2 className="spinner" size={16} />
                                        <span>Waiting for setup to complete&hellip;</span>
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
                                                <li><strong>Python not installed?</strong> Download from <a href="https://python.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>python.org</a> and check "Add Python to PATH".</li>
                                                <li><strong>Firewall blocking?</strong> Allow Python through your firewall when prompted, or add port 7842 as an exception.</li>
                                                <li><strong>Antivirus interference?</strong> Some antivirus software blocks local servers. Add an exception for <code>%USERPROFILE%\GST_Engine</code>.</li>
                                                <li><strong>Corporate network?</strong> VPN, proxy, or group policies may block localhost connections. Try disconnecting VPN temporarily.</li>
                                                <li><strong>Try re-running</strong> the downloaded <code>GST_Setup.bat</code> file as Administrator.</li>
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
                            <h3>Getting Ready</h3>
                            {step === 2 && (
                                <div className="progress-container mt-3">
                                    <div className="progress-bar-animated"></div>
                                    <p className="progress-text mt-2">Almost there — finishing setup&hellip;</p>
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
