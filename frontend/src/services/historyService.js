const STORAGE_KEY = 'gst_run_history';

export const getHistory = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to parse history data", e);
        return [];
    }
};

export const saveHistory = (history) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

export const addHistoryRecord = (record) => {
    const history = getHistory();
    const newRecord = {
        id: `R-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        ...record
    };
    saveHistory([newRecord, ...history]);
    return newRecord;
};

export const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
};
