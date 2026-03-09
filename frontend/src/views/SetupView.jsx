import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isEngineRunning } from '../services/engineService';
import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import './SetupView.css';

const SetupView = () => {
    const [step, setStep] = useState(1);
    const navigate = useNavigate();

    useEffect(() => {
        let interval;
        if (step === 1) {
            interval = setInterval(async () => {
                const running = await isEngineRunning();
                if (running) {
                    setStep(2);
                    clearInterval(interval);
                    // Fake delay for Step 2 "Getting Ready" to feel natural
                    setTimeout(() => {
                        navigate('/dashboard', { replace: true });
                    }, 3000);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [step, navigate]);

    const handleDownload = () => {
        // In production, this would point to a real .bat or .exe hosted online
        // For now, we simulate a file download placeholder
        const scriptContent = [
            "@echo off",
            "echo Setting up GST Returns Downloader Engine...",
            "mkdir \"%USERPROFILE%\\GST_Engine\" 2>nul",
            "cd /d \"%USERPROFILE%\\GST_Engine\"",
            "curl -sL \"https://raw.githubusercontent.com/teams/GST-Returns-Downloader/master/engine/main.py\" -o main.py",
            "python -m venv venv",
            "call .\\venv\\Scripts\\Activate.bat",
            "pip install fastapi uvicorn selenium",
            "start \"\" pythonw -m uvicorn main:app --port 7842",
            "exit"
        ].join("\\n");

        const element = document.createElement("a");
        const file = new Blob([scriptContent], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = "GST_Setup.bat";
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
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
                                        Run the file after downloading. A black window will open and close on its own. Come back here when it's done.
                                    </p>
                                    <div className="waiting-message flex-center mt-4">
                                        <Loader2 className="spinner" size={16} />
                                        <span>Waiting for setup to complete&hellip;</span>
                                    </div>
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
