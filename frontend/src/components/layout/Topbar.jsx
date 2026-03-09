import React from 'react';
import './Topbar.css';

const Topbar = ({ title }) => {
    return (
        <header className="topbar">
            <h2 className="topbar-title">{title}</h2>
            <div className="topbar-actions">
                {/* The user requested no technical indicators on top bar */}
            </div>
        </header>
    );
};

export default Topbar;
