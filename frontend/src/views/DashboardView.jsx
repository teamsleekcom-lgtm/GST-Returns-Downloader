import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Users, Play, Download, Clock, CheckCircle } from 'lucide-react';
import './DashboardView.css';

const DashboardView = () => {
    const navigate = useNavigate();

    // Mock data for initial UI
    const stats = [
        { label: 'Total Clients', value: '142', icon: Users, color: 'text-primary' },
        { label: 'Downloads This Month', value: '87', icon: Download, color: 'text-success' },
        { label: 'Pending Downloads', value: '55', icon: Clock, color: 'text-warning' },
        { label: 'Last Run Date', value: 'Today, 10:42 AM', icon: CheckCircle, color: 'text-muted' },
    ];

    const recentActivity = [
        { id: 1, date: 'Oct 24, 2024 - 10:42 AM', clients: 45, status: 'Completed' },
        { id: 2, date: 'Oct 23, 2024 - 04:15 PM', clients: 12, status: 'Completed' },
        { id: 3, date: 'Oct 20, 2024 - 11:30 AM', clients: 80, status: 'Partial' },
        { id: 4, date: 'Oct 18, 2024 - 09:00 AM', clients: 5, status: 'Failed' },
        { id: 5, date: 'Oct 15, 2024 - 02:20 PM', clients: 142, status: 'Completed' },
    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Completed': return <span className="badge badge-success">Completed</span>;
            case 'Partial': return <span className="badge badge-warning">Partial</span>;
            case 'Failed': return <span className="badge badge-error">Failed</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    return (
        <MainLayout title="Dashboard">

            {/* Summary Cards */}
            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className="card stat-card">
                        <div className={`stat-icon-wrapper ${stat.color}-bg`}>
                            <stat.icon className={`stat-icon ${stat.color}`} size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">{stat.label}</p>
                            <h3 className="stat-value">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Primary Action */}
            <div className="quick-start-section flex-center mt-8 mb-8">
                <button className="btn-primary btn-large shadow-lg" onClick={() => navigate('/download')}>
                    <Play fill="currentColor" size={20} />
                    <span>Start New Download</span>
                </button>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity-section">
                <h3 className="section-title mb-4">Recent Activity</h3>
                <div className="card table-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Clients Processed</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentActivity.map((run) => (
                                <tr key={run.id}>
                                    <td>{run.date}</td>
                                    <td>{run.clients} clients</td>
                                    <td>{getStatusBadge(run.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {recentActivity.length === 0 && (
                        <div className="empty-state">No recent activity found.</div>
                    )}
                </div>
            </div>

        </MainLayout>
    );
};

export default DashboardView;
