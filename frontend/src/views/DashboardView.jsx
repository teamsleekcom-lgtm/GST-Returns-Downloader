import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Users, Play, Download, Clock, CheckCircle } from 'lucide-react';
import { getClients } from '../services/clientService';
import { getHistory } from '../services/historyService';
import './DashboardView.css';

const DashboardView = () => {
    const navigate = useNavigate();

    const clients = getClients();
    const history = getHistory();

    const totalClients = clients.length;

    // Calculate downloads this month from history
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let downloadsThisMonth = 0;

    // Simplistic breakdown for mock/UI purposes
    history.forEach(run => {
        const runDate = new Date(run.date);
        if (runDate.getMonth() === currentMonth && runDate.getFullYear() === currentYear && run.status === 'Completed') {
            downloadsThisMonth += run.files || 0;
        }
    });

    const pendingDownloads = clients.length > 0 ? Math.floor(clients.length * 0.4) : 0; // Just an estimate for the UI gauge
    const lastRunDate = history.length > 0 ? history[0].date : 'Never';

    const stats = [
        { label: 'Total Clients', value: totalClients.toString(), icon: Users, color: 'text-primary' },
        { label: 'Downloads This Month', value: downloadsThisMonth.toString(), icon: Download, color: 'text-success' },
        { label: 'Pending Downloads', value: pendingDownloads.toString(), icon: Clock, color: 'text-warning' },
        { label: 'Last Run Date', value: lastRunDate, icon: CheckCircle, color: 'text-muted' },
    ];

    const recentActivity = history.slice(0, 5);

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
