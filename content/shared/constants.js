/**
 * CodeSyncConstants
 * Centralized registry of event/message names, storage keys, and platform IDs to avoid duplicate string literals.
 */
const CodeSyncConstants = {
  PLATFORMS: {
    LEETCODE: "leetcode"
  },
  MESSAGES: {
    PROBLEM_DETECTED: "PROBLEM_DETECTED",
    SUBMISSION_DETECTED: "SUBMISSION_DETECTED",
    FOCUS_POPUP: "FOCUS_POPUP"
  },
  STORAGE_KEYS: {
    CURRENT_PROBLEM: "current_problem",
    LATEST_SUBMISSION: "latest_submission",
    SUBMISSION_HISTORY: "submission_history",
    PENDING_SYNCS: "pending_syncs",
    LAST_SYNC: "last_sync",
    LAST_SYNC_RESULT: "last_sync_result"
  }
};

// Make it available globally in content script context
window.CodeSyncConstants = CodeSyncConstants;
