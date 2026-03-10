import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { getClients, saveClients, importClients } from '../services/clientService';
import { clearHistory } from '../services/historyService';
import { Save, Download, Upload, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const SETTINGS_KEY = 'gst_app_settings';

const loadSettings = () => {
    try {
        const data = localStorage.getItem(SETTINGS_KEY);
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};

const persistSettings = (settings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

const SettingsView = () => {
    const defaults = loadSettings() || { saveLocation: 'C:\\GST_Downloads', defaultFy: '2024-25', autoOrganise: true };
    const [saveLocation, setSaveLocation] = useState(defaults.saveLocation);
    const [defaultFy, setDefaultFy] = useState(defaults.defaultFy);
    const [autoOrganise, setAutoOrganise] = useState(defaults.autoOrganise);
    const [saveStatus, setSaveStatus] = useState(null);

    const fileInputRef = useRef(null);

    const handleSaveSettings = () => {
        persistSettings({ saveLocation, defaultFy, autoOrganise });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
    };

    const handleExportData = () => {
        const clients = getClients();
        if (clients.length === 0) {
            alert("No clients to export.");
            return;
        }
        // Strip sensitive credentials before export
        const safeClients = clients.map(({ password, ...rest }) => rest);
        const ws = XLSX.utils.json_to_sheet(safeClients);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clients Backup");
        XLSX.writeFile(wb, "GST_Clients_Backup.xlsx");
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleRestoreBackup = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const parsedClients = data.map(row => {
                    const name = row['name'] || row['Firm Name'] || row['Name'] || '';
                    const gstin = row['gstin'] || row['GSTIN'] || '';
                    const username = row['username'] || row['Username'] || '';
                    const notes = row['notes'] || row['Notes'] || '';
                    const tagStr = row['tags'] || row['Tags'] || '';
                    const tags = typeof tagStr === 'string' ? tagStr.split(',').map(t => t.trim()).filter(t => t) : tagStr || [];

                    if (!name || !gstin) return null;
                    return { name, gstin, username, password: '', notes, tags };
                }).filter(c => c !== null);

                if (parsedClients.length > 0) {
                    const added = importClients(parsedClients);
                    alert(`Restored ${added} clients from backup. Note: passwords are not included in backups for security reasons.`);
                } else {
                    alert('No valid clients found in the backup file.');
                }
            } catch (err) {
                alert('Failed to parse backup file.');
                console.error(err);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null;
    };

    const clearAllData = () => {
        if (window.confirm("WARNING: This will delete ALL clients and history permanently. Are you absolutely sure?")) {
            saveClients([]);
            clearHistory();
            localStorage.removeItem(SETTINGS_KEY);
            localStorage.removeItem('active_download');
            alert("All data has been cleared.");
            window.location.reload();
        }
    };

    return (
        <MainLayout title="Settings">
            <div className="settings-container max-w-4xl mx-auto" style={{ maxWidth: '800px' }}>

                {/* General Settings */}
                <div className="card mb-6">
                    <h3 className="section-title mb-4">General Preferences</h3>

                    <div className="form-group mb-5">
                        <label>Default Save Location</label>
                        <div className="flex-between gap-2 mt-1">
                            <input
                                type="text"
                                className="input-field"
                                value={saveLocation}
                                onChange={e => setSaveLocation(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group mb-5">
                        <label>Default Financial Year</label>
                        <select className="input-field mt-1" value={defaultFy} onChange={e => setDefaultFy(e.target.value)}>
                            <option value="2025-26">2025-26</option>
                            <option value="2024-25">2024-25</option>
                            <option value="2023-24">2023-24</option>
                            <option value="2022-23">2022-23</option>
                        </select>
                    </div>

                    <div className="form-group mb-5">
                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={autoOrganise} onChange={e => setAutoOrganise(e.target.checked)} />
                            <span className="font-medium">Auto-organise into subfolders</span>
                        </label>
                        <p className="text-sm text-muted ml-6 mt-1">Files will be saved into FolderName \ FirmName \ FY \ file.pdf</p>
                    </div>

                    <div className="flex mt-6" style={{ justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
                        {saveStatus === 'saved' && (
                            <span className="text-success flex-center" style={{ gap: '0.25rem' }}>
                                <CheckCircle size={16} /> Saved
                            </span>
                        )}
                        <button className="btn-primary" onClick={handleSaveSettings}>
                            <Save size={18} /> Save Settings
                        </button>
                    </div>
                </div>

                {/* Data Management */}
                <div className="card">
                    <h3 className="section-title mb-4">Data Management</h3>
                    <p className="text-muted text-sm mb-6">Backup or restore your local database. All data is encrypted locally on your browser.</p>

                    <div className="data-actions flex-col" style={{ gap: '1rem' }}>
                        <div className="flex-between p-4 border rounded" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <h4 className="font-medium">Export Database</h4>
                                <p className="text-sm text-muted">Download all clients as an Excel file (passwords excluded for security).</p>
                            </div>
                            <button className="btn-secondary" onClick={handleExportData}>
                                <Download size={18} /> Export Backup
                            </button>
                        </div>

                        <div className="flex-between p-4 border rounded" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <h4 className="font-medium">Import Database</h4>
                                <p className="text-sm text-muted">Restore clients from a previous backup file.</p>
                            </div>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                style={{ display: 'none' }}
                                ref={fileInputRef}
                                onChange={handleRestoreBackup}
                            />
                            <button className="btn-secondary" onClick={handleImportClick}>
                                <Upload size={18} /> Restore Backup
                            </button>
                        </div>

                        <div className="flex-between p-4 border rounded" style={{ border: '1px solid var(--error-bg)', backgroundColor: '#fff5f5', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <h4 className="font-medium text-error flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
                                    <AlertCircle size={16} /> Danger Zone
                                </h4>
                                <p className="text-sm" style={{ color: '#c53030' }}>Permanently delete all clients, history, and settings from this browser.</p>
                            </div>
                            <button className="btn-secondary text-error" onClick={clearAllData} style={{ borderColor: 'var(--error-bg)' }}>
                                <Trash2 size={18} /> Clear Data
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </MainLayout>
    );
};

export default SettingsView;
