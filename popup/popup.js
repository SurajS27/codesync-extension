import { StorageClient } from "../scripts/storage.js";
import { StateManager } from "../scripts/state.js";
import { APIClient } from "../scripts/api.js";
import { Logger } from "../scripts/logger.js";

// Toggle Developer Mode manual token entry UI
const DEV_MODE = false;

// DOM Elements
const unauthSection = document.getElementById("unauth-section");
const authSection = document.getElementById("auth-section");
const devSection = document.getElementById("dev-section");
const loginBtn = document.getElementById("login-btn");
const jwtInput = document.getElementById("jwt-input");
const saveJwtBtn = document.getElementById("save-jwt-btn");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const repoSelect = document.getElementById("repo-select");
const settingsBtn = document.getElementById("settings-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusMsg = document.getElementById("status-msg");
const autoSyncCheckbox = document.getElementById("auto-sync-checkbox");

// Update banner elements
const updateBanner = document.getElementById("update-banner");
const updateVersion = document.getElementById("update-version");
const updateNotes = document.getElementById("update-notes");
const closeUpdateBtn = document.getElementById("close-update-btn");

// Offline Banner
const offlineBanner = document.getElementById("offline-banner");

// Active Problem Section DOM Elements
const problemHeaderLabel = document.getElementById("problem-header-label");
const problemTitle = document.getElementById("problem-title");
const problemDifficulty = document.getElementById("problem-difficulty");
const syncStatusRow = document.getElementById("sync-status-row");

// Latest Submission DOM Elements
const submissionCard = document.getElementById("submission-card");
const submissionTitle = document.getElementById("submission-title");
const submissionDifficulty = document.getElementById("submission-difficulty");
const submissionLang = document.getElementById("submission-lang");
const submissionId = document.getElementById("submission-id");
const submissionRuntime = document.getElementById("submission-runtime");
const submissionMemory = document.getElementById("submission-memory");
const submissionStatusText = document.getElementById("submission-status-text");

// Sync controls
const syncBtn = document.getElementById("sync-btn");
const syncResult = document.getElementById("sync-result");
const resultSha = document.getElementById("result-sha");
const resultPath = document.getElementById("result-path");
const resultTime = document.getElementById("result-time");
const resultLink = document.getElementById("result-link");

// Last Sync Status Card DOM Elements
const lastSyncState = document.getElementById("last-sync-state");
const lastSyncDetails = document.getElementById("last-sync-details");
const lastSyncProblem = document.getElementById("last-sync-problem");
const lastSyncRepo = document.getElementById("last-sync-repo");
const lastSyncBadge = document.getElementById("last-sync-badge");
const lastSyncTime = document.getElementById("last-sync-time");

// Pending Syncs Recovery Card DOM Elements
const pendingSyncsCard = document.getElementById("pending-syncs-card");
const pendingCount = document.getElementById("pending-count");
const retryPendingBtn = document.getElementById("retry-pending-btn");
const clearPendingBtn = document.getElementById("clear-pending-btn");

// History controls
const historyCard = document.getElementById("history-card");
const historyList = document.getElementById("history-list");

document.addEventListener("DOMContentLoaded", async () => {
  setupDevModeVisibility();
  await initPopupState();
  await renderUpdateBanner();
  await renderActiveProblem();
  await renderLatestSubmission();
  await renderSyncHistory();
  await renderAnalytics();
  await renderLastSyncStatus();
  await renderPendingSyncs();
  updateOfflineStatus();
  setupEventListeners();
  await Logger.logInfo("startup", "Popup opened and UI initialized.");
});


/**
 * Configure developer mode interface visibility.
 */
function setupDevModeVisibility() {
  if (DEV_MODE) {
    devSection.classList.remove("hidden");
  } else {
    devSection.classList.add("hidden");
  }
}

/**
 * Initialize popup state by reading saved tokens and verifying session validity.
 */
async function initPopupState() {
  showStatus("", "");
  
  // Load auto-sync preference
  const autoSync = await StorageClient.getAutoSync();
  if (autoSyncCheckbox) {
    autoSyncCheckbox.checked = autoSync;
  }

  const token = await StorageClient.getToken();
  
  if (!token) {
    showUnauthenticatedState();
    return;
  }

  try {
    // 1. Fetch authenticated user profile
    const profile = await APIClient.fetchProfile(token);
    await StorageClient.setUser(profile);

    // 2. Load user details into popup UI
    userAvatar.src = profile.github_avatar_url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%236366f1'><circle cx='50' cy='50' r='50'/></svg>";
    userName.textContent = profile.github_username || "User Account";
    userEmail.textContent = profile.github_email || "No public email";

    // 3. Load available repositories
    await loadRepositories(token);
    
    showAuthenticatedState();
  } catch (error) {
    console.error("Popup verification failed:", error);
    // Invalid token or network error. Clear storage and force re-login
    await StorageClient.clearAll();
    showUnauthenticatedState();
    showStatus(error.message, "error");
  }
}

/**
 * Reads the active problem from storage and populates the popup interface.
 */
async function renderActiveProblem() {
  const data = await chrome.storage.local.get(["current_problem", "token", "selectedRepositoryId"]);
  const current = data.current_problem;
  const token = data.token;
  const repoId = data.selectedRepositoryId;

  if (!current) {
    problemHeaderLabel.textContent = "Current Problem";
    problemTitle.textContent = "No LeetCode problem detected";
    problemDifficulty.className = "badge-difficulty hidden";
    problemDifficulty.textContent = "";
    syncStatusRow.classList.add("hidden");
    syncBtn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
      <span>Open LeetCode to Sync</span>
    `;
    syncBtn.disabled = false;
    syncBtn.onclick = () => chrome.tabs.create({ url: "https://leetcode.com/problemset/all/" });
    return;
  }

  // Restore normal click handler
  syncBtn.onclick = null;

  problemHeaderLabel.textContent = "Active LeetCode Problem";
  problemTitle.textContent = current.title;

  // Render difficulty badge
  const diffClass = current.difficulty.toLowerCase();
  problemDifficulty.className = `badge-difficulty ${diffClass}`;
  problemDifficulty.textContent = current.difficulty.charAt(0).toUpperCase() + current.difficulty.slice(1);
  
  syncStatusRow.classList.remove("hidden");

  // Enable button if user is authenticated and repo is selected
  syncBtn.disabled = !(token && repoId);
  syncBtn.innerHTML = `
    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
    <span>Sync Current Solution</span>
  `;
}

/**
 * Reads the latest submission and sync states from storage and populates the popup interface.
 */
async function renderLatestSubmission() {
  const data = await chrome.storage.local.get([
    "latest_submission",
    "latest_sync",
    "last_sync",
    "token",
    "selectedRepositoryId"
  ]);
  const submission = data.latest_submission;
  const token = data.token;
  const repoId = data.selectedRepositoryId;
  const lastSync = data.last_sync;
  const latestSync = data.latest_sync;

  if (!submission) {
    submissionCard.classList.add("hidden");
    return;
  }

  submissionTitle.textContent = submission.problem_title;

  // Difficulty badge
  const diffClass = submission.difficulty.toLowerCase();
  submissionDifficulty.className = `badge-difficulty ${diffClass}`;
  submissionDifficulty.textContent = submission.difficulty.charAt(0).toUpperCase() + submission.difficulty.slice(1);

  // Metadata
  submissionLang.textContent = submission.language;
  submissionId.textContent = submission.submission_id;
  submissionRuntime.textContent = submission.runtime || "N/A";
  submissionMemory.textContent = submission.memory || "N/A";

  submissionCard.classList.remove("hidden");

  // Determine button state and label based on repository-aware duplicate check
  let isSynced = false;
  if (lastSync && lastSync.repository_id === repoId) {
    if (lastSync.submission_id === submission.submission_id || lastSync.source_code === submission.source_code) {
      isSynced = true;
    }
  }

  if (isSynced) {
    submissionStatusText.textContent = "Accepted \u2022 Synced";
    syncBtn.innerHTML = `<span>Already Synced</span>`;
    syncBtn.disabled = true;
  } else {
    submissionStatusText.textContent = "Accepted \u2022 Ready for Sync";
    syncBtn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
      <span>Sync Current Solution</span>
    `;
    syncBtn.disabled = !(token && repoId);
  }


  // Render Latest Sync Details if applicable
  if (latestSync && (latestSync.status === "completed" || latestSync.status === "success")) {
    resultSha.textContent = latestSync.commit_sha ? latestSync.commit_sha.substring(0, 7) : "N/A";
    resultPath.textContent = latestSync.github_file_path || "N/A";
    resultTime.textContent = latestSync.synced_at ? new Date(latestSync.synced_at).toLocaleString() : "N/A";
    
    if (latestSync.commit_url) {
      resultLink.href = latestSync.commit_url;
      resultLink.classList.remove("hidden");
    } else {
      resultLink.classList.add("hidden");
    }
    syncResult.classList.remove("hidden");
  } else {
    syncResult.classList.add("hidden");
  }
}

/**
 * Retrieves the user's active repositories from the backend and populates the select box.
 * @param {string} token 
 */
async function loadRepositories(token) {
  try {
    const repos = await APIClient.fetchRepositories(token);
    
    // Clear existing dynamic options
    repoSelect.innerHTML = '<option value="" disabled>Select a repository...</option>';
    
    if (!repos || repos.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.text = "No provisioned repositories found";
      opt.disabled = true;
      repoSelect.appendChild(opt);
      return;
    }

    const savedRepoId = await StorageClient.getSelectedRepositoryId();
    let isSavedRepoStillValid = false;

    repos.forEach((repo) => {
      const option = document.createElement("option");
      option.value = repo.id;
      // Show full name and bootstrap status
      const statusLabel = repo.bootstrap_status ? `[${repo.bootstrap_status}]` : "";
      option.text = `${repo.repo_name} ${statusLabel}`;
      
      if (repo.id === savedRepoId) {
        option.selected = true;
        isSavedRepoStillValid = true;
        chrome.storage.local.set({ selectedRepositoryName: option.text });
      }
      repoSelect.appendChild(option);
    });

    // Fallback if the saved repository ID is no longer in the list
    if (!isSavedRepoStillValid && repos.length > 0) {
      repoSelect.selectedIndex = 0;
      await StorageClient.setSelectedRepositoryId(repoSelect.value);
      const selectedName = repoSelect.options[0]?.text || "";
      await chrome.storage.local.set({ selectedRepositoryName: selectedName });
    }
  } catch (error) {
    console.error("Failed to load repositories:", error);
    showStatus("Failed to retrieve repositories list.", "error");
  }
}

/**
 * Event Listeners configuration.
 */
function setupEventListeners() {
  // Login redirects user to GitHub login endpoint
  loginBtn.addEventListener("click", async () => {
    try {
      showStatus("Initiating GitHub login...", "");
      const response = await APIClient.request("GET", "/auth/github/login");
      if (response && response.authorization_url) {
        chrome.tabs.create({ url: response.authorization_url });
        showStatus("", "");
      } else {
        showStatus("Failed to retrieve GitHub login URL.", "error");
      }
    } catch (error) {
      showStatus(`Login error: ${error.message}`, "error");
    }
  });

  // Manual JWT entry handler (Developer mode)
  if (DEV_MODE) {
    saveJwtBtn.addEventListener("click", async () => {
      const jwtValue = jwtInput.value.trim();
      if (!jwtValue) {
        showStatus("Please enter a valid non-empty token.", "error");
        return;
      }
      
      try {
        showStatus("Validating token...", "");
        // Verify token with backend
        const profile = await APIClient.fetchProfile(jwtValue);
        
        // Save token and user details to storage
        await StorageClient.setToken(jwtValue);
        await StorageClient.setUser(profile);
        
        jwtInput.value = "";
        showStatus("Authentication successful!", "success");
        
        // Reload UI state
        await initPopupState();
        await renderSyncHistory();
      } catch (error) {
        showStatus(`Authentication failed: ${error.message}`, "error");
      }
    });
  }

  // Repository selection change event
  repoSelect.addEventListener("change", async (event) => {
    const selectedId = event.target.value;
    const selectedName = repoSelect.options[repoSelect.selectedIndex]?.text || "";
    if (selectedId) {
      await StorageClient.setSelectedRepositoryId(selectedId);
      await chrome.storage.local.set({ selectedRepositoryName: selectedName });
      showStatus("Repository preference updated.", "success");
      // Update sync button state
      await renderLatestSubmission();
      setTimeout(() => showStatus("", ""), 1500);
    }
  });

  // Redirect to Options settings page
  settingsBtn.addEventListener("click", () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("options/options.html"));
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", async () => {
    const token = await StorageClient.getToken();
    if (token) {
      try {
        await APIClient.logout(token);
      } catch (e) {
        console.warn("API logout call failed, clearing local session anyway.", e);
      }
    }
    await StorageClient.clearAll();
    showUnauthenticatedState();
    showStatus("Logged out successfully.", "success");
  });

  // Sync button click event
  syncBtn.addEventListener("click", handleSyncClick);

  // Online / Offline listeners
  window.addEventListener("online", updateOfflineStatus);
  window.addEventListener("offline", updateOfflineStatus);

  // Pending sync queue controls
  retryPendingBtn.addEventListener("click", handleRetryPending);
  clearPendingBtn.addEventListener("click", handleClearPending);

  // Auto-sync setting change handler
  if (autoSyncCheckbox) {
    autoSyncCheckbox.addEventListener("change", async (event) => {
      await StorageClient.setAutoSync(event.target.checked);
      showStatus("Auto-Sync preferences updated.", "success");
    });
  }

  if (closeUpdateBtn) {
    closeUpdateBtn.addEventListener("click", () => {
      updateBanner.classList.add("hidden");
    });
  }

  // Task 12 requirement: Subscribe to storage updates to update popup in real-time
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === "local") {
      if (changes.updateAvailable || changes.latestVersion) {
        await renderUpdateBanner();
      }
      if (changes.auto_sync && autoSyncCheckbox) {
        autoSyncCheckbox.checked = changes.auto_sync.newValue !== false;
      }
      if (changes.current_problem) {
        console.log("[Popup] Active problem changed in storage, re-rendering.");
        await renderActiveProblem();
      }
      if (changes.latest_submission) {
        console.log("[Popup] Latest submission changed in storage, re-rendering.");
        await renderLatestSubmission();
      }
      if (changes.latest_sync || changes.last_sync || changes.selectedRepositoryId || changes.token) {
        console.log("[Popup] Sync state changed in storage, re-rendering.");
        await renderLatestSubmission();
      }
      if (changes.sync_history_cache || changes.last_sync_result) {
        console.log("[Popup] Sync history or result changed, re-rendering history and analytics.");
        await renderSyncHistory();
        await renderAnalytics();
      }

      if (changes.last_sync_result) {
        console.log("[Popup] Last sync result changed, re-rendering.");
        await renderLastSyncStatus();
      }
      if (changes.pending_syncs) {
        console.log("[Popup] Pending syncs changed, re-rendering.");
        await renderPendingSyncs();
      }
    }
  });
}

/**
 * Classifies an HTTP or network error into a user-friendly message.
 */
function classifyError(error) {
  if (!navigator.onLine || error.status === 503 || (error.message && error.message.includes("Unable to connect"))) {
    return "Internet connection unavailable";
  }
  if (error.status === 408 || (error.message && error.message.includes("timed out")) || (error.message && error.message.includes("Request timed out"))) {
    return "Request timed out";
  }
  if (error.status === 401) {
    return "Authentication expired";
  }
  if (error.status === 403) {
    return "Repository access denied";
  }
  if (error.status === 409) {
    return "Already synced";
  }
  if (error.status === 500) {
    return "Server error";
  }
  return error.message || "Unknown error";
}

/**
 * Updates successful and failed sync stats in chrome storage.
 */
function updateSyncStats(isSuccess) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sync_stats"], (result) => {
      const stats = result.sync_stats || { total_syncs: 0, successful_syncs: 0, failed_syncs: 0 };
      stats.total_syncs += 1;
      if (isSuccess) {
        stats.successful_syncs += 1;
      } else {
        stats.failed_syncs += 1;
      }
      chrome.storage.local.set({ sync_stats: stats }, () => resolve());
    });
  });
}

/**
 * Renders the last sync status details card.
 */
async function renderLastSyncStatus() {
  const result = await chrome.storage.local.get(["last_sync_result"]);
  const lastSync = result.last_sync_result;

  if (!lastSync) {
    lastSyncState.textContent = "No Previous Sync";
    lastSyncDetails.classList.add("hidden");
    return;
  }

  if (lastSync.status === "success" || lastSync.status === "completed") {
    lastSyncState.innerHTML = '<span style="color: var(--success-color)">✓ Last Sync Successful</span>';
    lastSyncBadge.className = "history-status-badge completed";
    lastSyncBadge.textContent = "Success";
  } else {
    lastSyncState.innerHTML = '<span style="color: var(--danger-color)">⚠ Last Sync Failed</span>';
    lastSyncBadge.className = "history-status-badge failed";
    lastSyncBadge.textContent = "Failed";
  }

  lastSyncProblem.textContent = lastSync.problem_title || "Unknown";
  lastSyncRepo.textContent = lastSync.repository_name || "Unknown";
  lastSyncTime.textContent = lastSync.timestamp ? new Date(lastSync.timestamp).toLocaleString() : "N/A";
  
  if (lastSync.status === "failed" && lastSync.error_message) {
    lastSyncBadge.textContent = lastSync.error_message;
  }

  lastSyncDetails.classList.remove("hidden");
}

/**
 * Renders the pending syncs queue manual recovery card.
 */
async function renderPendingSyncs() {
  const result = await chrome.storage.local.get(["pending_syncs"]);
  const queue = result.pending_syncs || [];

  if (queue.length === 0) {
    pendingSyncsCard.classList.add("hidden");
    return;
  }

  pendingCount.textContent = queue.length;
  pendingSyncsCard.classList.remove("hidden");
}

/**
 * Monitors connection state changes to disable/enable inputs.
 */
function updateOfflineStatus() {
  const isOffline = !navigator.onLine;
  if (isOffline) {
    offlineBanner.classList.remove("hidden");
    syncBtn.disabled = true;
    syncBtn.textContent = "Offline";
    Logger.logInfo("sync", "Offline Detection: Browser went offline");
  } else {
    offlineBanner.classList.add("hidden");
    renderLatestSubmission();
    Logger.logInfo("sync", "Offline Detection: Browser went online");
  }
}

/**
 * Writes failed requests to pending queue in chrome storage.
 */
async function addRequestToPendingQueue(submissionId, repoId, payload) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["pending_syncs"], async (result) => {
      const queue = result.pending_syncs || [];
      if (!queue.some(item => item.submission_id === submissionId && item.repository_id === repoId)) {
        queue.push({
          submission_id: submissionId,
          repository_id: repoId,
          payload,
          created_at: new Date().toISOString()
        });
        await chrome.storage.local.set({ pending_syncs: queue });
        await Logger.logInfo("sync", `Queue Addition: Added ${payload.problem_title} to pending syncs`);
      }
      resolve();
    });
  });
}

/**
 * Retries all pending sync items one-by-one.
 */
async function handleRetryPending() {
  const token = await StorageClient.getToken();
  if (!token) {
    showStatus("Authentication required to retry syncs.", "error");
    return;
  }

  if (!navigator.onLine) {
    showStatus("Cannot retry while offline.", "error");
    return;
  }

  const result = await chrome.storage.local.get(["pending_syncs"]);
  const queue = result.pending_syncs || [];
  if (queue.length === 0) return;

  retryPendingBtn.disabled = true;
  retryPendingBtn.textContent = "Retrying...";
  showStatus(`Processing ${queue.length} pending syncs...`, "");

  await Logger.logInfo("sync", `Queue Retry: Starting retry for ${queue.length} items`);

  let succeeded = 0;
  let failed = 0;
  const remainingQueue = [];

  for (const item of queue) {
    try {
      await APIClient.syncLeetCodeSubmission(token, item.payload);
      succeeded++;
      await updateSyncStats(true);
      
      const lastSyncResultPayload = {
        status: "success",
        timestamp: Date.now(),
        problem_title: item.payload.problem_title,
        repository_name: "GitHub Repository",
        repository_id: item.repository_id,
        submission_id: item.submission_id
      };
      await chrome.storage.local.set({ last_sync_result: lastSyncResultPayload });
      await Logger.logInfo("sync", `Queue Removal: Removed ${item.payload.problem_title} from queue after successful sync`);
    } catch (err) {
      failed++;
      remainingQueue.push(item);
      
      const classified = classifyError(err);
      await updateSyncStats(false);
      
      const lastSyncResultPayload = {
        status: "failed",
        timestamp: Date.now(),
        problem_title: item.payload.problem_title,
        repository_name: "GitHub Repository",
        repository_id: item.repository_id,
        submission_id: item.submission_id,
        error_message: classified
      };
      await chrome.storage.local.set({ last_sync_result: lastSyncResultPayload });
      await Logger.logError("sync", `Sync Failure: Queued retry failed for ${item.payload.problem_title}: ${classified}`);
    }
  }

  await chrome.storage.local.set({ pending_syncs: remainingQueue });
  
  retryPendingBtn.disabled = false;
  retryPendingBtn.textContent = "Retry Pending Syncs";

  if (failed === 0) {
    showStatus(`Successfully synced all ${succeeded} pending items!`, "success");
  } else {
    showStatus(`Synced ${succeeded} items. ${failed} failed.`, "error");
  }

  await renderPendingSyncs();
  await renderLastSyncStatus();
  await renderLatestSubmission();
  await chrome.storage.local.remove(["sync_history_cache"]);
  await renderSyncHistory();
}

/**
 * Clears the pending syncs queue.
 */
async function handleClearPending() {
  if (!confirm("Are you sure you want to clear all pending syncs?")) {
    return;
  }
  await chrome.storage.local.set({ pending_syncs: [] });
  await Logger.logInfo("sync", "Queue Removal: Cleared all pending syncs manually");
  await renderPendingSyncs();
  showStatus("Pending syncs queue cleared.", "success");
}

/**
 * Handles the solution synchronization flow when Sync is clicked.
 */
async function handleSyncClick() {
  const data = await chrome.storage.local.get([
    "latest_submission",
    "selectedRepositoryId",
    "token"
  ]);
  const submission = data.latest_submission;
  const repoId = data.selectedRepositoryId;
  const token = data.token;

  if (!submission || !repoId || !token) {
    showStatus("Missing required fields for synchronization.", "error");
    return;
  }

  // Confirmation dialog
  const repoText = repoSelect.options[repoSelect.selectedIndex]?.text || "Selected Repository";
  const confirmMessage = `Sync this solution?\n\nProblem: ${submission.problem_title}\nLanguage: ${submission.language}\nRepository: ${repoText}`;
  if (!confirm(confirmMessage)) {
    return;
  }

  // Check offline first
  if (!navigator.onLine) {
    const errorMsg = "Internet connection unavailable";
    showStatus(errorMsg, "error");
    
    const payload = {
      repository_id: repoId,
      problem_title: submission.problem_title,
      problem_slug: submission.problem_slug,
      difficulty: submission.difficulty.toLowerCase(),
      language: submission.language,
      source_code: submission.source_code,
      question_number: submission.question_number,
      platform: submission.platform || "leetcode"
    };
    
    await addRequestToPendingQueue(submission.submission_id, repoId, payload);
    await updateSyncStats(false);
    
    const lastSyncResultPayload = {
      status: "failed",
      timestamp: Date.now(),
      problem_title: submission.problem_title,
      repository_name: repoText,
      repository_id: repoId,
      submission_id: submission.submission_id,
      error_message: errorMsg
    };
    await chrome.storage.local.set({ last_sync_result: lastSyncResultPayload });
    await Logger.logError("sync", `Sync Failure: ${errorMsg}`);
    
    await renderLastSyncStatus();
    await renderPendingSyncs();
    return;
  }

  // Disable button and change state
  syncBtn.disabled = true;
  syncBtn.textContent = "Syncing...";
  showStatus("Sync in progress...", "");

  const payload = {
    repository_id: repoId,
    problem_title: submission.problem_title,
    problem_slug: submission.problem_slug,
    difficulty: submission.difficulty.toLowerCase(),
    language: submission.language,
    source_code: submission.source_code,
    question_number: submission.question_number,
    platform: submission.platform || "leetcode"
  };

  try {
    const response = await APIClient.syncLeetCodeSubmission(token, payload);
    
    // Save to latest_sync and last_sync
    const now = Date.now();
    const latestSyncPayload = {
      sync_id: response.sync_id,
      status: response.status,
      commit_sha: response.commit_sha,
      commit_url: response.commit_url,
      github_file_path: response.github_file_path,
      synced_at: now
    };
    
    const lastSyncPayload = {
      submission_id: submission.submission_id,
      repository_id: repoId,
      source_code: submission.source_code,
      synced_at: now
    };

    await chrome.storage.local.set({
      latest_sync: latestSyncPayload,
      last_sync: lastSyncPayload
    });

    await updateSyncStats(true);
    
    const lastSyncResultPayload = {
      status: "success",
      timestamp: now,
      problem_title: submission.problem_title,
      repository_name: repoText,
      repository_id: repoId,
      submission_id: submission.submission_id
    };
    await chrome.storage.local.set({ last_sync_result: lastSyncResultPayload });
    await Logger.logInfo("sync", `Sync Success: Solution synced successfully for ${submission.problem_title}`);

    syncBtn.textContent = "\u2713 Synced Successfully";
    showStatus("Solution synced successfully!", "success");

    await chrome.storage.local.remove(["sync_history_cache"]);
    await renderSyncHistory();
    await renderLastSyncStatus();
    await renderLatestSubmission();
  } catch (error) {
    console.error("Sync failed:", error);
    const classified = classifyError(error);
    const isConflict = error.status === 409;

    await updateSyncStats(isConflict);

    const lastSyncResultPayload = {
      status: isConflict ? "success" : "failed",
      timestamp: Date.now(),
      problem_title: submission.problem_title,
      repository_name: repoText,
      repository_id: repoId,
      submission_id: submission.submission_id,
      error_message: isConflict ? null : classified
    };
    await chrome.storage.local.set({ last_sync_result: lastSyncResultPayload });

    if (isConflict) {
      await Logger.logInfo("sync", `Sync Success (Conflict): Solution already synced for ${submission.problem_title}`);
      
      const lastSyncPayload = {
        submission_id: submission.submission_id,
        repository_id: repoId,
        source_code: submission.source_code,
        synced_at: Date.now()
      };
      await chrome.storage.local.set({ last_sync: lastSyncPayload });
      
      syncBtn.textContent = "Re-sync to GitHub";
      syncBtn.disabled = !(token && repoId);
      showStatus("This submission already exists in the selected repository.", "success");
      await renderLatestSubmission();
    } else {
      await Logger.logError("sync", `Sync Failure: ${classified}`);

      const isNetworkError = error.status === 503 || (error.message && error.message.includes("Unable to connect"));
      const isTimeoutError = error.status === 408 || (error.message && error.message.includes("timed out"));
      const is5xxError = error.status >= 500 && error.status < 600;
      const shouldQueue = isNetworkError || isTimeoutError || is5xxError;

      if (shouldQueue) {
        await addRequestToPendingQueue(submission.submission_id, repoId, payload);
        await renderPendingSyncs();
      }

      syncBtn.textContent = "Sync Failed";
      showStatus(classified, "error");
      syncBtn.disabled = !navigator.onLine;
    }
    
    await renderLastSyncStatus();
  }
}

/**
 * Fetches and renders user sync history list (caching retrieved history for 5 mins).
 */
async function renderSyncHistory() {
  const token = await StorageClient.getToken();
  if (!token) {
    historyCard.classList.add("hidden");
    return;
  }

  // Load from cache first
  const cacheData = await chrome.storage.local.get(["sync_history_cache"]);
  const cache = cacheData.sync_history_cache;
  const now = Date.now();
  const cacheDurationLimit = 5 * 60 * 1000; // 5 minutes

  let historyEntries = null;

  if (cache && (now - cache.fetchedAt < cacheDurationLimit)) {
    console.log("[Popup] Loading sync history from cache.");
    historyEntries = cache.entries;
  } else {
    console.log("[Popup] Fetching fresh sync history.");
    try {
      historyEntries = await APIClient.fetchSyncHistory(token);
      await chrome.storage.local.set({
        sync_history_cache: {
          entries: historyEntries,
          fetchedAt: now
        }
      });
    } catch (error) {
      console.warn("Failed to fetch sync history:", error);
      // If API call fails but we have stale cache, fallback to cache
      if (cache) {
        historyEntries = cache.entries;
      }
    }
  }

  if (!historyEntries || historyEntries.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No recent synchronizations</div>';
    historyCard.classList.add("hidden");
    return;
  }

  // Render top 5
  const top5 = historyEntries.slice(0, 5);
  historyList.innerHTML = "";
  
  top5.forEach(item => {
    const itemEl = document.createElement("div");
    itemEl.className = "history-item";
    
    const formattedTime = new Date(item.created_at || item.updated_at).toLocaleString();
    const statusClass = item.sync_status.toLowerCase(); // completed, failed, running
    
    // Left section (details)
    const leftEl = document.createElement("div");
    leftEl.className = "history-left";
    
    const titleEl = document.createElement("div");
    titleEl.className = "history-title";
    titleEl.textContent = item.problem_title;
    
    const metaEl = document.createElement("div");
    metaEl.className = "history-meta";
    metaEl.textContent = `${item.language.toUpperCase()} \u2022 ${formattedTime}`;
    
    leftEl.appendChild(titleEl);
    leftEl.appendChild(metaEl);
    
    // Right section (status & link)
    const rightEl = document.createElement("div");
    rightEl.className = "history-right";
    
    const badgeEl = document.createElement("span");
    badgeEl.className = `history-status-badge ${statusClass}`;
    badgeEl.textContent = item.sync_status;
    
    rightEl.appendChild(badgeEl);
    
    if (item.commit_url) {
      const linkEl = document.createElement("a");
      linkEl.href = item.commit_url;
      linkEl.target = "_blank";
      linkEl.className = "history-link-icon";
      linkEl.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      `;
      rightEl.appendChild(linkEl);
    }
    
    itemEl.appendChild(leftEl);
    itemEl.appendChild(rightEl);
    historyList.appendChild(itemEl);
  });

  historyCard.classList.remove("hidden");
}

/**
 * Fetches user analytics stats from backend and dynamically populates streak, weekly tracker, heatmap, and analytics chips.
 */
async function renderAnalytics() {
  const token = await StorageClient.getToken();
  if (!token) return;

  try {
    let historyEntries = null;
    const cacheData = await chrome.storage.local.get(["sync_history_cache"]);
    if (cacheData.sync_history_cache) historyEntries = cacheData.sync_history_cache.entries;

    const stats = await APIClient.fetchAnalytics(token);
    if (!stats) return;


    // Check local storage for real LeetCode GraphQL calendar streak
    const leetcodeStorage = await chrome.storage.local.get(["leetcode_calendar"]);
    const leetcodeCalendar = leetcodeStorage.leetcode_calendar;
    const realLeetCodeStreak = leetcodeCalendar ? leetcodeCalendar.leetcode_streak : (stats.leetcode_streak || stats.current_streak || 0);

    // Calculate fallback streak and weekly activity from history entries if backend returned 0
    let streakValue = realLeetCodeStreak;

    let todayCountVal = stats.today_count || 0;
    let weeklyAct = stats.weekly_activity;

    if (!streakValue && Array.isArray(historyEntries) && historyEntries.length > 0) {
      const activeDates = new Set();
      const dailyCounts = {};
      const todayStr = new Date().toISOString().split("T")[0];

      historyEntries.forEach(item => {
        const dtStr = item.created_at || item.updated_at;
        if (dtStr) {
          const dStr = new Date(dtStr).toISOString().split("T")[0];
          activeDates.add(dStr);
          dailyCounts[dStr] = (dailyCounts[dStr] || 0) + 1;
        }
      });

      todayCountVal = dailyCounts[todayStr] || 0;

      // Compute consecutive streak ending today or yesterday
      let checkD = new Date();
      let cStr = checkD.toISOString().split("T")[0];
      if (!activeDates.has(cStr)) {
        checkD.setDate(checkD.getDate() - 1);
        cStr = checkD.toISOString().split("T")[0];
      }

      let streakCount = 0;
      while (activeDates.has(cStr)) {
        streakCount++;
        checkD.setDate(checkD.getDate() - 1);
        cStr = checkD.toISOString().split("T")[0];
      }
      streakValue = streakCount;

      // Compute weekly activity (Mon..Sun)
      const nowD = new Date();
      const dayOfWeek = (nowD.getDay() + 6) % 7; // Mon=0..Sun=6
      const monday = new Date();
      monday.setDate(nowD.getDate() - dayOfWeek);

      weeklyAct = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const k = d.toISOString().split("T")[0];
        weeklyAct.push(dailyCounts[k] || 0);
      }
    }

    // 1. Streak Badges & Today count
    const streakNum = document.getElementById("streak-num");
    const headerStreakCount = document.getElementById("header-streak-count");
    const todayTag = document.getElementById("today-tag");
    const bestBadge = document.getElementById("best-badge");
    const githubStreakBadge = document.getElementById("github-streak-badge");

    if (streakNum) streakNum.textContent = streakValue || 0;
    if (headerStreakCount) headerStreakCount.textContent = `${streakValue || 0}d`;
    if (todayTag) todayTag.textContent = `+${todayCountVal} today`;
    if (bestBadge) bestBadge.textContent = `Best: ${stats.best_streak || streakValue || 0} days`;
    if (githubStreakBadge) githubStreakBadge.textContent = `GitHub: ${stats.github_streak || 0}d streak`;

    // 2. Weekly 7-day Tracker Dots (Mon-Sun)
    const weekDotsRow = document.getElementById("week-dots-row");
    if (weekDotsRow && Array.isArray(weeklyAct)) {
      const todayIndex = (new Date().getDay() + 6) % 7; // Convert Sun=0 to Mon=0..Sun=6
      weekDotsRow.innerHTML = "";

      weeklyAct.forEach((count, idx) => {
        const colEl = document.createElement("div");
        colEl.className = "day-dot-col";

        const iconEl = document.createElement("div");
        const isToday = idx === todayIndex;

        if (count > 0) {
          iconEl.className = isToday ? "dot-icon today" : "dot-icon checked";
          iconEl.textContent = "\u2713";
        } else {
          iconEl.className = "dot-icon";
          iconEl.textContent = "0";
        }

        const countEl = document.createElement("span");
        countEl.className = isToday ? "day-count mono-font today-label" : "day-count mono-font";
        countEl.textContent = isToday ? `${count} Today` : `${count}`;

        colEl.appendChild(iconEl);
        colEl.appendChild(countEl);
        weekDotsRow.appendChild(colEl);
      });
    }

    // 3. Heatmap Grid Matrix (5 Cols x 5 Rows)
    const heatmapGrid = document.getElementById("heatmap-grid");
    if (heatmapGrid) {
      const matrix = (stats.heatmap_matrix && stats.heatmap_matrix.some(col => col.some(lvl => lvl > 0))) 
        ? stats.heatmap_matrix 
        : buildHeatmapFromHistory(historyEntries);

      heatmapGrid.innerHTML = "";
      matrix.forEach(colLevels => {
        const colEl = document.createElement("div");
        colEl.className = "heatmap-col";

        colLevels.forEach(level => {
          const cellEl = document.createElement("div");
          cellEl.className = `hm-cell level-${level}`;
          colEl.appendChild(cellEl);
        });

        heatmapGrid.appendChild(colEl);
      });
    }


    // 4. Analytics Chips
    const totalCommitsBadge = document.getElementById("total-commits-badge");
    const acceptanceChip = document.getElementById("acceptance-rate-chip");
    const runtimeChip = document.getElementById("avg-runtime-chip");
    const locChip = document.getElementById("total-loc-chip");

    const totalCount = stats.total_commits || (historyEntries ? historyEntries.length : 0);
    if (totalCommitsBadge) totalCommitsBadge.textContent = `${totalCount} Total Commits`;

    if (acceptanceChip) {
      const acc = stats.acceptance_rate || (totalCount > 0 ? 100.0 : 0.0);
      acceptanceChip.textContent = `${acc.toFixed(1)}%`;
    }

    if (runtimeChip) {
      const runtime = stats.avg_runtime_ms || (totalCount > 0 ? 12 : 0);
      runtimeChip.textContent = `${runtime}ms`;
    }

    if (locChip) {
      const loc = stats.total_loc || (totalCount * 42);
      locChip.textContent = `${loc} LOC`;
    }
  } catch (error) {
    console.warn("Failed to load user analytics:", error);
  }
}

/**
 * Builds a 5x5 heatmap level matrix from user history entries when backend data is fresh/empty.
 */
function buildHeatmapFromHistory(historyEntries) {
  const dailyCounts = {};
  if (Array.isArray(historyEntries)) {
    historyEntries.forEach(item => {
      const dtStr = item.created_at || item.updated_at;
      if (dtStr) {
        const dStr = new Date(dtStr).toISOString().split("T")[0];
        dailyCounts[dStr] = (dailyCounts[dStr] || 0) + 1;
      }
    });
  }

  const today = new Date();
  const matrix = [];
  // 25 days backwards (5 cols x 5 rows)
  let dayPointer = new Date();
  dayPointer.setDate(today.getDate() - 24);

  for (let col = 0; col < 5; col++) {
    const colLevels = [];
    for (let row = 0; row < 5; row++) {
      const dateKey = dayPointer.toISOString().split("T")[0];
      const count = dailyCounts[dateKey] || 0;
      let level = 0;
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count >= 3 && count <= 4) level = 3;
      else if (count >= 5) level = 4;
      
      colLevels.push(level);
      dayPointer.setDate(dayPointer.getDate() + 1);
    }
    matrix.push(colLevels);
  }
  return matrix;
}


function showUnauthenticatedState() {

  unauthSection.classList.remove("hidden");
  authSection.classList.add("hidden");
}

function showAuthenticatedState() {
  unauthSection.classList.add("hidden");
  authSection.classList.remove("hidden");
}

/**
 * Display a user-facing success or error message.
 * @param {string} msg 
 * @param {'success'|'error'|''} type 
 */
function showStatus(msg, type) {
  if (!msg) {
    statusMsg.className = "status-msg hidden";
    statusMsg.textContent = "";
    return;
  }
  statusMsg.className = `status-msg ${type}`;
  statusMsg.textContent = msg;
  statusMsg.classList.remove("hidden");
}

/**
 * Renders the version update banner if an update is available.
 */
async function renderUpdateBanner() {
  chrome.storage.local.get(["updateAvailable", "latestVersion", "releaseNotes"], (result) => {
    if (result.updateAvailable) {
      if (updateVersion) updateVersion.textContent = result.latestVersion;
      if (updateNotes) updateNotes.textContent = result.releaseNotes || "Bug fixes and performance improvements.";
      if (updateBanner) updateBanner.classList.remove("hidden");
    } else {
      if (updateBanner) updateBanner.classList.add("hidden");
    }
  });
}
