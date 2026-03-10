import { ENGINE_BASE } from './config';

export const isEngineRunning = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${ENGINE_BASE}/status`, {
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return data.status === "ready";
    }
  } catch (error) {
    return false;
  }
  return false;
};
