import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { getClients } from '../services/clientService';
import { Check, Folder, Search, CheckSquare, Square } from 'lucide-react';
import './DownloadView.css';

const RETURN_TYPES = [
    { id: '1', label: 'GSTR-1', desc: 'Outward supplies — monthly/quarterly' },
    { id: '2A', label: 'GSTR-2A', desc: 'Auto-drafted inward supplies' },
    { id: '2B', label: 'GSTR-2B', desc: 'Auto-drafted ITC statement' },
    { id: '3B', label: 'GSTR-3B', desc: 'Monthly summary return' },
    { id: '4', label: 'GSTR-4', desc: 'Quarterly return for composition' },
    { id: '5', label: 'GSTR-5', desc: 'Non-resident taxable person' },
    { id: '5A', label: 'GSTR-5A', desc: 'OIDAR services' },
    { id: '6', label: 'GSTR-6', desc: 'Input service distributor' },
    { id: '7', label: 'GSTR-7', desc: 'TDS deductors' },
    { id: '8', label: 'GSTR-8', desc: 'TCS collectors' },
    { id: '9', label: 'GSTR-9', desc: 'Annual return', isAnnual: true },
    { id: '9C', label: 'GSTR-9C', desc: 'Reconciliation statement', isAnnual: true },
    { id: '10', label: 'GSTR-10', desc: 'Final return', isAnnual: true },
    { id: '11', label: 'GSTR-11', desc: 'UIN holders' }
];

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const DownloadView = () => {
    const navigate = useNavigate();
    // Client Selection State
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [selectedClients, setSelectedClients] = useState([]);

    // Settings State
    const [fy, setFy] = useState('2024-25');
    const [selectedReturns, setSelectedReturns] = useState([]);
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [autoOrganise, setAutoOrganise] = useState(true);

    useEffect(() => {
        setClients(getClients());
    }, []);

    // Filter Logic
    const allTags = [...new Set(clients.flatMap(c => c.tags || []))];
    const filteredClients = clients.filter(c =>
        (c.name.toLowerCase().includes(search.toLowerCase()) || c.gstin.toLowerCase().includes(search.toLowerCase())) &&
        (filterTag === '' || (c.tags && c.tags.includes(filterTag)))
    );

    const toggleClient = (id) => setSelectedClients(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const toggleAllClients = () => setSelectedClients(selectedClients.length === filteredClients.length ? [] : filteredClients.map(c => c.id));

    const toggleReturn = (id) => setSelectedReturns(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const toggleMonth = (m) => setSelectedMonths(prev => prev.includes(m) ? prev.filter(i => i !== m) : [...prev, m]);

    // Derived settings visibility
    const hasAnnualSelected = selectedReturns.some(id => RETURN_TYPES.find(r => r.id === id)?.isAnnual);
    const hasQuarterlySelected = selectedReturns.includes('4'); // GSTR-4 is quarterly
    const hasMonthlySelected = selectedReturns.some(id => {
        const r = RETURN_TYPES.find(rt => rt.id === id);
        return !r?.isAnnual && r?.id !== '4';
    });

    const hideMonthSelector = hasAnnualSelected && !hasQuarterlySelected && !hasMonthlySelected;
    const showOnlyQuarterMonths = hasQuarterlySelected && !hasMonthlySelected;

    const selectableMonths = showOnlyQuarterMonths ? ['Jun', 'Sep', 'Dec', 'Mar'] : MONTHS;

    const handleStart = () => {
        if (selectedClients.length === 0 || selectedReturns.length === 0) return;

        // Save to global context/state or localStorage before navigating
        // Pass config payload to runner
        const payload = {
            clients: clients.filter(c => selectedClients.includes(c.id)),
            returns: selectedReturns,
            months: selectedMonths,
            fy,
            autoOrganise
        };
        localStorage.setItem('active_download', JSON.stringify(payload));
        navigate('/runner');
    };

    const estimatedFiles = selectedClients.length * selectedReturns.length * (hideMonthSelector ? 1 : Math.max(1, selectedMonths.length));

    return (
        <MainLayout title="Start Download">
            <div className="download-grid">

                {/* Column 1: Client Selection */}
                <div className="card download-col col-clients flex-col">
                    <h3 className="section-title mb-4">1. Select Clients</h3>

                    <div className="filters-row flex-between mb-4">
                        <div className="search-bar flex-1">
                            <Search className="search-icon" size={16} />
                            <input
                                type="text"
                                className="input-field pl-10"
                                placeholder="Search..."
                                value={search} onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select className="input-field tag-filter ml-2" value={filterTag} onChange={e => setFilterTag(e.target.value)}>
                            <option value="">All Tags</option>
                            {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                        </select>
                    </div>

                    <div className="client-list flex-1">
                        <div className="client-item flex-between header-item" onClick={toggleAllClients}>
                            <span className="font-medium">Select All</span>
                            <button className="checkbox-btn">
                                {selectedClients.length > 0 && selectedClients.length === filteredClients.length
                                    ? <CheckSquare size={18} className="text-primary" />
                                    : <Square size={18} className="text-muted" />}
                            </button>
                        </div>
                        {filteredClients.map(client => (
                            <div key={client.id} className="client-item flex-between" onClick={() => toggleClient(client.id)}>
                                <div className="client-info">
                                    <div className="font-medium">{client.name}</div>
                                    <div className="text-muted text-sm">{client.gstin}</div>
                                </div>
                                <button className="checkbox-btn">
                                    {selectedClients.includes(client.id)
                                        ? <CheckSquare size={18} className="text-primary" />
                                        : <Square size={18} className="text-muted" />}
                                </button>
                            </div>
                        ))}
                        {filteredClients.length === 0 && <div className="text-muted mt-4 text-center">No clients match.</div>}
                    </div>

                    <div className="mt-4 pt-4 border-t text-sm font-medium">
                        {selectedClients.length} clients selected
                    </div>
                </div>

                {/* Column 2: Settings */}
                <div className="card download-col col-settings flex-col">
                    <h3 className="section-title mb-4">2. Download Settings</h3>

                    <div className="form-group mb-6">
                        <label>Financial Year</label>
                        <select className="input-field" value={fy} onChange={e => setFy(e.target.value)}>
                            <option value="2024-25">2024-25</option>
                            <option value="2023-24">2023-24</option>
                            <option value="2022-23">2022-23</option>
                        </select>
                    </div>

                    <div className="form-group mb-6">
                        <label className="flex-between">
                            Return Types
                            <span className="text-sm text-muted">{selectedReturns.length} selected</span>
                        </label>
                        <div className="returns-grid mt-2">
                            {RETURN_TYPES.map(rt => {
                                const isSelected = selectedReturns.includes(rt.id);
                                return (
                                    <button
                                        key={rt.id}
                                        className={`pill-btn ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleReturn(rt.id)}
                                        title={rt.desc}
                                    >
                                        {rt.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {!hideMonthSelector && (
                        <div className="form-group mb-6">
                            <label className="flex-between">
                                Months
                                <button className="text-primary text-sm font-medium" onClick={() => setSelectedMonths(selectableMonths)}>Select All</button>
                            </label>
                            <div className="months-grid mt-2">
                                {MONTHS.map(m => {
                                    const isSelectable = selectableMonths.includes(m);
                                    const isSelected = selectedMonths.includes(m);
                                    if (!isSelectable && showOnlyQuarterMonths) return null; // hide irrelevant months

                                    return (
                                        <button
                                            key={m}
                                            className={`pill-btn month-pill ${isSelected ? 'selected' : ''}`}
                                            onClick={() => toggleMonth(m)}
                                        >
                                            {m}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {hasAnnualSelected && hideMonthSelector && (
                        <div className="annual-notice mb-6">
                            Only annual returns selected. Monthly breakdown is skipped.
                        </div>
                    )}

                    <div className="form-group mt-auto pt-4 border-t">
                        <label>Save Location</label>
                        <div className="flex-between mt-2">
                            <div className="path-display flex-center gap-2">
                                <Folder size={16} className="text-muted" />
                                <span className="text-sm truncate">C:\GST_Downloads</span>
                            </div>
                            <button className="btn-secondary text-sm" style={{ padding: '0.25rem 0.5rem' }}>Change</button>
                        </div>

                        <label className="checkbox-label mt-4">
                            <input
                                type="checkbox"
                                checked={autoOrganise}
                                onChange={(e) => setAutoOrganise(e.target.checked)}
                            />
                            <span className="text-sm">Auto-organise into ClientName / FY folders</span>
                        </label>
                    </div>
                </div>

                {/* Column 3: Summary */}
                <div className="card download-col col-summary flex-col">
                    <h3 className="section-title mb-4">3. Summary</h3>

                    <div className="summary-list flex-1 mt-4">
                        <div className="summary-item">
                            <span className="text-muted">Clients</span>
                            <span className="font-medium">{selectedClients.length}</span>
                        </div>
                        <div className="summary-item">
                            <span className="text-muted">Return Types</span>
                            <span className="font-medium">{selectedReturns.length}</span>
                        </div>
                        {!hideMonthSelector && (
                            <div className="summary-item">
                                <span className="text-muted">Months</span>
                                <span className="font-medium">{selectedMonths.length}</span>
                            </div>
                        )}
                        <div className="summary-item sum-total">
                            <span className="text-main font-medium">Estimated Files</span>
                            <span className="text-primary text-xl font-bold">~{estimatedFiles}</span>
                        </div>
                    </div>

                    {selectedClients.length > 0 && selectedReturns.length > 0 && selectedMonths.length === 0 && !hideMonthSelector && (
                        <div className="alert-box mb-4 text-warning-bg text-warning">
                            Please select at least one month.
                        </div>
                    )}

                    <button
                        className="btn-primary mt-auto"
                        style={{ width: '100%', padding: '1rem' }}
                        disabled={selectedClients.length === 0 || selectedReturns.length === 0 || (!hideMonthSelector && selectedMonths.length === 0)}
                        onClick={handleStart}
                    >
                        Start Download
                    </button>
                </div>

            </div>
        </MainLayout>
    );
};

export default DownloadView;
