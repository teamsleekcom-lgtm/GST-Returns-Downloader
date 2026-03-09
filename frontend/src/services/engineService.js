export const isEngineRunning = async () => {
  try {
    // Timeout applied to avoid long hangs when engine is offline
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const res = await fetch("http://127.0.0.1:7842/status", { 
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      return data.status === "ready";
    }
  } catch (error) {
    // Fetch fails when connection is refused (engine is completely offline)
    return false;
  }
  return false;
};
