import React, { useState, useEffect } from 'react';
import { addClient, updateClient } from '../services/clientService';
import { X } from 'lucide-react';
import './ClientModal.css';

const ClientModal = ({ client, onClose, onSave }) => {
    const isEditing = !!client;

    const [formData, setFormData] = useState({
        name: '',
        gstin: '',
        username: '',
        password: '',
        notes: '',
        tags: ''
    });

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name || '',
                gstin: client.gstin || '',
                username: client.username || '',
                password: client.password || '',
                notes: client.notes || '',
                tags: (client.tags || []).join(', ')
            });
        }
    }, [client]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const tagsArray = formData.tags
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        const clientData = {
            ...formData,
            tags: tagsArray
        };

        if (isEditing) {
            updateClient(client.id, clientData);
        } else {
            addClient(clientData);
        }

        onSave();
    };

    return (
        <div className="modal-backdrop flex-center">
            <div className="card modal-card">
                <div className="modal-header flex-between mb-4">
                    <h3 className="section-title">{isEditing ? 'Edit Client' : 'Add New Client'}</h3>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Firm Name <span className="text-error">*</span></label>
                        <input
                            type="text"
                            name="name"
                            className="input-field"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Acme Corporation"
                        />
                    </div>

                    <div className="form-group">
                        <label>GSTIN <span className="text-error">*</span></label>
                        <input
                            type="text"
                            name="gstin"
                            className="input-field uppercase-input"
                            required
                            value={formData.gstin}
                            onChange={handleChange}
                            placeholder="22AAAAA0000A1Z5"
                            maxLength={15}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label>Portal Username <span className="text-error">*</span></label>
                            <input
                                type="text"
                                name="username"
                                className="input-field"
                                required
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="GST Portal Username"
                            />
                        </div>
                        <div className="form-group flex-1">
                            <label>Portal Password <span className="text-error">*</span></label>
                            <input
                                type="password"
                                name="password"
                                className="input-field"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="********"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Tags (Comma separated)</label>
                        <input
                            type="text"
                            name="tags"
                            className="input-field"
                            value={formData.tags}
                            onChange={handleChange}
                            placeholder="Proprietorship, Priority, Audit..."
                        />
                    </div>

                    <div className="form-group">
                        <label>Notes</label>
                        <textarea
                            name="notes"
                            className="input-field textarea-field"
                            value={formData.notes}
                            onChange={handleChange}
                            placeholder="Optional notes about this client..."
                            rows={3}
                        />
                    </div>

                    <div className="modal-actions mt-6 flex-between">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary">
                            {isEditing ? 'Save Changes' : 'Add Client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientModal;
