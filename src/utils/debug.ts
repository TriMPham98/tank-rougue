/**
 * Debug utility for logging
 */
export const debug = {
  log: (...args: any[]) => {
    if (import.meta.env.MODE !== "production") {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (import.meta.env.MODE !== "production") {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (import.meta.env.MODE !== "production") {
      console.warn(...args);
    }
  },
};
