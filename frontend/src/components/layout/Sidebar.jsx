import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, DownloadCloud, FileClock, Settings, ShieldCheck } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/clients', label: 'Client Manager', icon: Users },
        { path: '/download', label: 'Download Returns', icon: DownloadCloud },
        { path: '/runner', label: 'Live Progress', icon: FileClock },
        { path: '/history', label: 'Run History', icon: ShieldCheck },
        { path: '/settings', label: 'Settings', icon: Settings }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h1 className="logo-text">GST Downloader</h1>
            </div>
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={20} className="nav-icon" />
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
