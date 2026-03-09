import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { getClients, deleteClients, importClients } from '../services/clientService';
import ClientModal from '../components/ClientModal';
import { Search, UserPlus, Upload, Trash2, Edit2, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';
import './ClientManagerView.css';

const ClientManagerView = () => {
    const [clients, setClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState(null);

    const fileInputRef = useRef(null);

    const loadClients = () => {
        setClients(getClients());
    };

    useEffect(() => {
        loadClients();
    }, []);

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery) ||
        c.gstin.toLowerCase().includes(searchQuery) ||
        c.tags?.some(tag => tag.toLowerCase().includes(searchQuery))
    );

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredClients.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredClients.map(c => c.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} client(s)?`)) {
            deleteClients(selectedIds);
            setSelectedIds([]);
            loadClients();
        }
    };

    const handleDeleteSingle = (id) => {
        if (window.confirm("Are you sure you want to delete this client?")) {
            deleteClients([id]);
            setSelectedIds(prev => prev.filter(i => i !== id));
            loadClients();
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e) => {
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

                // Map Excel columns: Firm Name, GSTIN, Username, Password, Notes
                const parsedClients = data.map(row => {
                    const name = row['Firm Name'] || row['Name'] || row['Firm'] || '';
                    const gstin = row['GSTIN'] || '';
                    const username = row['Username'] || row['ID'] || '';
                    const password = row['Password'] || row['Pass'] || '';
                    const notes = row['Notes'] || '';
                    const tagStr = row['Tags'] || '';
                    const tags = tagStr ? tagStr.split(',').map(t => t.trim()) : [];

                    if (!name || !gstin || !username || !password) return null;

                    return { name, gstin, username, password, notes, tags };
                }).filter(c => c !== null);

                if (parsedClients.length > 0) {
                    const added = importClients(parsedClients);
                    alert(`Successfully imported ${added} new clients.`);
                    loadClients();
                } else {
                    alert('No valid clients found. Ensure columns are: Firm Name, GSTIN, Username, Password.');
                }
            } catch (err) {
                alert('Failed to parse Excel file.');
                console.error(err);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null; // reset
    };

    return (
        <MainLayout title="Client Manager">
            <div className="client-manager-container">

                {/* Top Controls */}
                <div className="controls-header">
                    <div className="search-bar">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            className="input-field pl-10"
                            placeholder="Search by firm name, GSTIN, or tags..."
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                    <div className="action-buttons">
                        {selectedIds.length > 0 && (
                            <button className="btn-secondary text-error" onClick={handleDeleteSelected}>
                                <Trash2 size={18} /> Delete {selectedIds.length}
                            </button>
                        )}
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <button className="btn-secondary" onClick={handleImportClick}>
                            <Upload size={18} /> Import Excel
                        </button>
                        <button className="btn-primary" onClick={() => { setClientToEdit(null); setIsModalOpen(true); }}>
                            <UserPlus size={18} /> Add Client
                        </button>
                    </div>
                </div>

                {/* Client Table */}
                <div className="card table-card mt-6">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-cell">
                                        <button className="checkbox-btn" onClick={toggleSelectAll}>
                                            {selectedIds.length > 0 && selectedIds.length === filteredClients.length
                                                ? <CheckSquare size={18} className="text-primary" />
                                                : <Square size={18} className="text-muted" />}
                                        </button>
                                    </th>
                                    <th>Firm Name</th>
                                    <th>GSTIN</th>
                                    <th>Tags</th>
                                    <th>Last Downloaded</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.length > 0 ? (
                                    filteredClients.map(client => (
                                        <tr key={client.id} className={selectedIds.includes(client.id) ? 'selected-row' : ''}>
                                            <td className="checkbox-cell">
                                                <button className="checkbox-btn" onClick={() => toggleSelect(client.id)}>
                                                    {selectedIds.includes(client.id)
                                                        ? <CheckSquare size={18} className="text-primary" />
                                                        : <Square size={18} className="text-muted" />}
                                                </button>
                                            </td>
                                            <td className="font-medium">{client.name}</td>
                                            <td>{client.gstin}</td>
                                            <td>
                                                <div className="tags-container">
                                                    {client.tags?.slice(0, 2).map(tag => (
                                                        <span key={tag} className="tag">{tag}</span>
                                                    ))}
                                                    {client.tags?.length > 2 && (
                                                        <span className="tag tag-more">+{client.tags.length - 2}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-muted">{client.lastDownloaded}</td>
                                            <td><span className="badge badge-success">{client.status}</span></td>
                                            <td className="text-right actions-cell">
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => { setClientToEdit(client); setIsModalOpen(true); }}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="icon-btn text-error"
                                                    onClick={() => handleDeleteSingle(client.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="empty-state">
                                            {searchQuery ? "No clients match your search." : "No clients added yet. Add manually or import from Excel."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <ClientModal
                    client={clientToEdit}
                    onClose={() => setIsModalOpen(false)}
                    onSave={() => { setIsModalOpen(false); loadClients(); }}
                />
            )}
        </MainLayout>
    );
};

export default ClientManagerView;
