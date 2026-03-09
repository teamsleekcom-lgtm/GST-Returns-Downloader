const STORAGE_KEY = 'gst_run_history';

export const getHistory = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

export const saveHistory = (history) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

export const addHistoryRecord = (record) => {
    const history = getHistory();
    const newRecord = {
        id: `R-${Date.now().toString().slice(-4)}`,
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        ...record
    };
    saveHistory([newRecord, ...history]);
    return newRecord;
};

export const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
};
