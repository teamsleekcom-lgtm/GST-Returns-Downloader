import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Download, Search, LayoutDashboard } from 'lucide-react';
import * as XLSX from 'xlsx';

const HistoryView = () => {
    // Mock data. In production, this would come from localStorage.
    const [history, setHistory] = useState([
        { id: 'R-1005', date: '2024-10-24 10:42 AM', clients: 45, files: 135, duration: '14m 20s', status: 'Completed' },
        { id: 'R-1004', date: '2024-10-23 04:15 PM', clients: 12, files: 36, duration: '4m 10s', status: 'Completed' },
        { id: 'R-1003', date: '2024-10-20 11:30 AM', clients: 80, files: 210, duration: '45m 00s', status: 'Partial' },
        { id: 'R-1002', date: '2024-10-18 09:00 AM', clients: 5, files: 0, duration: '1m 20s', status: 'Failed' },
        { id: 'R-1001', date: '2024-10-15 02:20 PM', clients: 142, files: 420, duration: '1h 22m', status: 'Completed' },
    ]);

    const [expandedId, setExpandedId] = useState(null);

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(history);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Run History");
        XLSX.writeFile(wb, "GST_Run_History.xlsx");
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Completed': return <span className="badge badge-success">Completed</span>;
            case 'Partial': return <span className="badge badge-warning">Partial</span>;
            case 'Failed': return <span className="badge badge-error">Failed</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    return (
        <MainLayout title="Run History">
            <div className="history-container flex-col" style={{ height: '100%' }}>

                <div className="flex-between mb-6">
                    <div className="text-muted">Review past download operations and export reports.</div>
                    <button className="btn-secondary" onClick={exportToExcel}>
                        <Download size={18} /> Export to Excel
                    </button>
                </div>

                <div className="card table-card flex-1" style={{ overflowY: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Run ID</th>
                                <th>Date & Time</th>
                                <th>Clients</th>
                                <th>Files Downloaded</th>
                                <th>Duration</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(run => (
                                <React.Fragment key={run.id}>
                                    <tr
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
                                        className={expandedId === run.id ? 'selected-row' : ''}
                                    >
                                        <td className="font-medium text-primary">{run.id}</td>
                                        <td>{run.date}</td>
                                        <td>{run.clients}</td>
                                        <td>{run.files}</td>
                                        <td className="text-muted">{run.duration}</td>
                                        <td>{getStatusBadge(run.status)}</td>
                                    </tr>
                                    {expandedId === run.id && (
                                        <tr className="bg-neutral">
                                            <td colSpan="6" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-color)' }}>
                                                <div className="card shadow-sm">
                                                    <h4 className="font-medium mb-3">Run Details Breakdown</h4>
                                                    <p className="text-sm text-muted mb-4">Clicking export above will include this granular data.</p>
                                                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                        <div className="p-3 border rounded text-sm bg-success text-success-text" style={{ backgroundColor: 'var(--success-bg)' }}>
                                                            <strong>Completed:</strong> 135 files downloaded successfully across 45 clients.
                                                        </div>
                                                        <div className="p-3 border rounded text-sm bg-warning text-warning-text" style={{ backgroundColor: 'var(--warning-bg)' }}>
                                                            <strong>Skipped:</strong> 4 files skipped (Already existed).
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="empty-state">No past runs found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </MainLayout>
    );
};

export default HistoryView;
