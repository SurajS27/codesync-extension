/**
 * CodeSync Diagnostic Logging System
 * Tracks and persists the last 50 diagnostic events for troubleshooting.
 */
export const Logger = {
  /**
   * Appends a log entry to chrome.storage.local under the 'debug_logs' key.
   * Newest entries appear first. Keeps at most 50 entries.
   * @param {string} level - 'info' | 'warning' | 'error'
   * @param {string} tag - Context identifier (e.g. 'sync', 'detection', 'startup')
   * @param {string} message - Human-readable log details
   * @returns {Promise<void>}
   */
  async log(level, tag, message) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      tag,
      message
    };

    return new Promise((resolve) => {
      chrome.storage.local.get(["debug_logs"], (result) => {
        let logs = result.debug_logs || [];
        logs.unshift(entry);
        if (logs.length > 50) {
          logs = logs.slice(0, 50);
        }
        chrome.storage.local.set({ debug_logs: logs }, () => resolve());
      });
    });
  },

  async logInfo(tag, message) {
    return this.log("info", tag, message);
  },

  async logWarning(tag, message) {
    return this.log("warning", tag, message);
  },

  async logError(tag, message) {
    return this.log("error", tag, message);
  }
};
