import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'gst_clients_data';
const SALT_KEY = 'gst_key_salt';
const VERIFY_KEY = 'gst_key_verify';
const SESSION_KEY_NAME = 'gst_derived_key';

// --- Key Derivation ---
// Derive a strong AES key from the user's master password using PBKDF2

const getSalt = () => {
    let salt = localStorage.getItem(SALT_KEY);
    if (!salt) {
        salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
        localStorage.setItem(SALT_KEY, salt);
    }
    return salt;
};

const deriveKey = (password) => {
    const salt = getSalt();
    return CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 10000 }).toString();
};

// Store derived key in sessionStorage (lives only for this tab session)
export const unlockVault = (password) => {
    const key = deriveKey(password);
    sessionStorage.setItem(SESSION_KEY_NAME, key);
    return key;
};

export const getSessionKey = () => {
    return sessionStorage.getItem(SESSION_KEY_NAME);
};

export const lockVault = () => {
    sessionStorage.removeItem(SESSION_KEY_NAME);
};

export const isVaultSetup = () => {
    return localStorage.getItem(VERIFY_KEY) !== null;
};

export const setupVault = (password) => {
    const key = deriveKey(password);
    // Store a verification token so we can verify the password later
    const verifyToken = CryptoJS.AES.encrypt('GST_VERIFIED', key).toString();
    localStorage.setItem(VERIFY_KEY, verifyToken);
    sessionStorage.setItem(SESSION_KEY_NAME, key);
    return key;
};

export const verifyPassword = (password) => {
    const key = deriveKey(password);
    const verifyToken = localStorage.getItem(VERIFY_KEY);
    if (!verifyToken) return false;
    try {
        const bytes = CryptoJS.AES.decrypt(verifyToken, key);
        return bytes.toString(CryptoJS.enc.Utf8) === 'GST_VERIFIED';
    } catch {
        return false;
    }
};

export const isVaultUnlocked = () => {
    return !!getSessionKey();
};

// --- Client Data CRUD ---

export const getClients = () => {
    const key = getSessionKey();
    if (!key) return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
        const bytes = CryptoJS.AES.decrypt(data, key);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decrypted);
    } catch (e) {
        console.error("Failed to decrypt client data", e);
        return [];
    }
};

export const saveClients = (clients) => {
    const key = getSessionKey();
    if (!key) return;
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(clients), key).toString();
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
