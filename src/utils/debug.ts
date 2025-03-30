/**
 * Debug utility for logging
 */
// Debug flag that can be controlled via environment variable or build process
const DEBUG_ENABLED = false; // Set to true to enable debug logs in development

export const debug = {
  log: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.warn(...args);
    }
  },
};
