import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'gst_clients_data';
const SECRET_KEY = 'GST_DOWNLOADER_SECRET_LOCAL_KEY'; // Simple key for local browser storage

export const getClients = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
        const bytes = CryptoJS.AES.decrypt(data, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decrypted);
    } catch (e) {
        console.error("Failed to decrypt client data", e);
        return [];
    }
};

export const saveClients = (clients) => {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(clients), SECRET_KEY).toString();
    localStorage.setItem(STORAGE_KEY, encrypted);
};

export const addClient = (client) => {
    const clients = getClients();
    const newClient = {
        ...client,
        id: Date.now().toString(),
        lastDownloaded: 'Never',
        status: 'Active',
        tags: client.tags || []
    };
    saveClients([...clients, newClient]);
    return newClient;
};

export const updateClient = (id, updates) => {
    const clients = getClients();
    const index = clients.findIndex(c => c.id === id);
    if (index !== -1) {
        clients[index] = { ...clients[index], ...updates };
        saveClients(clients);
    }
};

export const deleteClients = (ids) => {
    const clients = getClients();
    saveClients(clients.filter(c => !ids.includes(c.id)));
};

export const importClients = (newClients) => {
    const existing = getClients();
    let addedCount = 0;

    const clientsToAdd = newClients.filter(nc => {
        // Avoid exact duplicate GSTINs if possible
        if (existing.some(ec => ec.gstin === nc.gstin)) return false;
        addedCount++;
        return true;
    }).map((c, i) => ({
        ...c,
        id: Date.now().toString() + i,
        lastDownloaded: 'Never',
        status: 'Active',
        tags: c.tags || []
    }));

    saveClients([...existing, ...clientsToAdd]);
    return addedCount;
};
