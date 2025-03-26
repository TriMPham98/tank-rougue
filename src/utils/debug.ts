/**
 * Debug utility for logging
 */
export const debug = {
  log: (...args: any[]) => {
    if (false) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (false) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (false) {
      console.warn(...args);
    }
  },
};
