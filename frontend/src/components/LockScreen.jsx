import React, { useState } from 'react';
import { isVaultSetup, setupVault, verifyPassword, unlockVault } from '../services/clientService';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';

const LockScreen = ({ onUnlock }) => {
    const isFirstTime = !isVaultSetup();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (isFirstTime) {
            if (password.length < 4) {
                setError('Password must be at least 4 characters.');
                return;
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match.');
                return;
            }
            setupVault(password);
            onUnlock();
        } else {
            if (verifyPassword(password)) {
                unlockVault(password);
                onUnlock();
            } else {
                setError('Incorrect password. Please try again.');
            }
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-color)',
            padding: '1rem'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2.5rem',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'var(--primary-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        <Shield size={28} style={{ color: 'var(--primary)' }} />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        {isFirstTime ? 'Set Master Password' : 'GSTR Downloader'}
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {isFirstTime
                            ? 'This password encrypts all your client data locally. Remember it — there is no reset.'
                            : 'Enter your master password to unlock.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <Lock size={16} style={{
                            position: 'absolute', left: '12px', top: '50%',
                            transform: 'translateY(-50%)', color: 'var(--text-muted)'
                        }} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="input-field"
                            placeholder={isFirstTime ? 'Create a master password' : 'Master password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute', right: '8px', top: '50%',
                                transform: 'translateY(-50%)', background: 'none',
                                border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                padding: '4px'
                            }}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {isFirstTime && (
                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <Lock size={16} style={{
                                position: 'absolute', left: '12px', top: '50%',
                                transform: 'translateY(-50%)', color: 'var(--text-muted)'
                            }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="input-field"
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                style={{ paddingLeft: '36px', width: '100%' }}
                            />
                        </div>
                    )}

                    {error && (
                        <p style={{
                            color: 'var(--error-color, #e53e3e)',
                            fontSize: '0.85rem',
                            marginBottom: '1rem',
                            textAlign: 'center'
                        }}>{error}</p>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                    >
                        {isFirstTime ? 'Create & Unlock' : 'Unlock'}
                    </button>
                </form>

                <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    marginTop: '1.5rem',
                    lineHeight: '1.5'
                }}>
                    Your data is encrypted locally using AES-256.
                    <br />Nothing is sent to any server.
                </p>
            </div>
        </div>
    );
};

export default LockScreen;
