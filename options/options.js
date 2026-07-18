import { StorageClient } from "../scripts/storage.js";
import { APIClient } from "../scripts/api.js";

// Developer Mode toggle for advanced settings
const DEV_MODE = false;

// DOM Elements
const connectionSettingsCard = document.getElementById("connection-settings-card");
const apiUrlInput = document.getElementById("api-url-input");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const repoCard = document.getElementById("repo-card");
const repoSelect = document.getElementById("repo-select");
const accountCard = document.getElementById("account-card");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const statusMsg = document.getElementById("status-msg");
const autoSyncCheckbox = document.getElementById("auto-sync-checkbox");

// Diagnostics DOM Elements
const statsTotal = document.getElementById("stats-total");
const statsSuccess = document.getElementById("stats-success");
const statsFailed = document.getElementById("stats-failed");
const logCount = document.getElementById("log-count");
const lastEventText = document.getElementById("last-event-text");
const viewLogsBtn = document.getElementById("view-logs-btn");
const clearLogsBtn = document.getElementById("clear-logs-btn");
const logsViewerBox = document.getElementById("logs-viewer-box");
const logsList = document.getElementById("logs-list");

document.addEventListener("DOMContentLoaded", async () => {
  await initOptionsState();
  await renderDiagnostics();
  setupEventListeners();
});

/**
 * Loads current configurations and configures cards based on authentication status.
 */
async function initOptionsState() {
  // Show or hide Connection Settings based on Developer Mode
  if (DEV_MODE) {
    connectionSettingsCard.classList.remove("hidden");
  } else {
    connectionSettingsCard.classList.add("hidden");
  }

  // Load saved API base URL
  const baseUrl = await StorageClient.getApiBaseUrl();
  apiUrlInput.value = baseUrl;

  // Load auto sync preference
  const autoSync = await StorageClient.getAutoSync();
  autoSyncCheckbox.checked = autoSync;

  const token = await StorageClient.getToken();
  if (!token) {
    hideAuthenticatedOptions();
    return;
  }

  try {
    const profile = await APIClient.fetchProfile(token);
    await StorageClient.setUser(profile);

    // Populate user profile information
    userAvatar.src = profile.github_avatar_url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%236366f1'><circle cx='50' cy='50' r='50'/></svg>";
    userName.textContent = profile.github_username || "User Account";
    userEmail.textContent = profile.github_email || "No public email";

    // Load user repositories
    await loadRepositories(token);

    showAuthenticatedOptions();
  } catch (error) {
    console.error("Options session verification failed:", error);
    await StorageClient.clearAll();
    hideAuthenticatedOptions();
    showToast("Session expired. Please re-login via the extension popup.", "error");
  }
}

/**
 * Queries backend repositories and populates options dropdown list.
 * @param {string} token 
 */
async function loadRepositories(token) {
  try {
    const repos = await APIClient.fetchRepositories(token);
    
    // Clear select elements
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
      const statusLabel = repo.bootstrap_status ? `[${repo.bootstrap_status}]` : "";
      option.text = `${repo.repo_name} ${statusLabel}`;
      
      if (repo.id === savedRepoId) {
        option.selected = true;
        isSavedRepoStillValid = true;
        chrome.storage.local.set({ selectedRepositoryName: option.text });
      }
      repoSelect.appendChild(option);
    });

    if (!isSavedRepoStillValid && repos.length > 0) {
      repoSelect.selectedIndex = 0;
      await StorageClient.setSelectedRepositoryId(repoSelect.value);
      const selectedName = repoSelect.options[0]?.text || "";
      await chrome.storage.local.set({ selectedRepositoryName: selectedName });
    }
  } catch (error) {
    console.error("Options failed loading repositories:", error);
    showToast("Failed to load repositories.", "error");
  }
}

/**
 * Configure UI action listeners.
 */
function setupEventListeners() {
  // Save custom backend API base URL URL
  saveSettingsBtn.addEventListener("click", async () => {
    let urlValue = apiUrlInput.value.trim();
    if (!urlValue) {
      showToast("API Base URL cannot be empty.", "error");
      return;
    }

    // Clean trailing slashes
    if (urlValue.endsWith("/")) {
      urlValue = urlValue.slice(0, -1);
    }

    await StorageClient.setApiBaseUrl(urlValue);
    showToast("Connection settings updated successfully.", "success");
    
    // Re-verify session with new URL if token exists
    await initOptionsState();
  });

  // Save selected repository preference
  repoSelect.addEventListener("change", async (event) => {
    const selectedId = event.target.value;
    const selectedName = repoSelect.options[repoSelect.selectedIndex]?.text || "";
    if (selectedId) {
      await StorageClient.setSelectedRepositoryId(selectedId);
      await chrome.storage.local.set({ selectedRepositoryName: selectedName });
      showToast("Active repository preference updated.", "success");
    }
  });

  // Save auto sync toggle change
  autoSyncCheckbox.addEventListener("change", async (event) => {
    await StorageClient.setAutoSync(event.target.checked);
    showToast("Auto-Sync preferences updated.", "success");
  });

  // Log Out handler
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
    hideAuthenticatedOptions();
    showToast("Successfully logged out and session cleared.", "success");
  });

  // View Logs button handler
  viewLogsBtn.addEventListener("click", () => {
    const isHidden = logsViewerBox.classList.contains("hidden");
    if (isHidden) {
      chrome.storage.local.get(["debug_logs"], (result) => {
        const logs = result.debug_logs || [];
        logsList.innerHTML = "";
        if (logs.length === 0) {
          logsList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 12px 0;">No diagnostic logs stored.</div>';
        } else {
          logs.forEach((log) => {
            const row = document.createElement("div");
            row.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
            row.style.padding = "6px 0";
            row.style.display = "flex";
            row.style.flexDirection = "column";
            
            const meta = document.createElement("div");
            meta.style.display = "flex";
            meta.style.justifyContent = "space-between";
            meta.style.color = "var(--text-muted)";
            meta.style.fontSize = "10px";
            
            let color = "var(--text-secondary)";
            if (log.level === "error") color = "var(--danger-color)";
            else if (log.level === "warning") color = "#f59e0b";
            else if (log.level === "info") color = "var(--success-color)";
            
            meta.innerHTML = `<span>${new Date(log.timestamp).toLocaleTimeString()} &bull; <strong style="color: ${color};">${log.level.toUpperCase()}</strong> &bull; [${log.tag}]</span>`;
            
            const msg = document.createElement("div");
            msg.style.wordBreak = "break-all";
            msg.style.marginTop = "2px";
            msg.style.color = "var(--text-primary)";
            msg.textContent = log.message;
            
            row.appendChild(meta);
            row.appendChild(msg);
            logsList.appendChild(row);
          });
        }
        logsViewerBox.classList.remove("hidden");
        viewLogsBtn.textContent = "Hide Logs";
      });
    } else {
      logsViewerBox.classList.add("hidden");
      viewLogsBtn.textContent = "View Logs";
    }
  });

  // Clear Logs button handler
  clearLogsBtn.addEventListener("click", async () => {
    if (confirm("Are you sure you want to clear all diagnostic logs?")) {
      await new Promise((resolve) => {
        chrome.storage.local.set({ debug_logs: [] }, () => resolve());
      });
      showToast("Diagnostic logs cleared.", "success");
      await renderDiagnostics();
      logsList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 12px 0;">No diagnostic logs stored.</div>';
    }
  });
}

/**
 * Loads and displays synchronization stats and diagnostic logging info.
 */
async function renderDiagnostics() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sync_stats", "debug_logs"], (result) => {
      const stats = result.sync_stats || { total_syncs: 0, successful_syncs: 0, failed_syncs: 0 };
      statsTotal.textContent = stats.total_syncs;
      statsSuccess.textContent = stats.successful_syncs;
      statsFailed.textContent = stats.failed_syncs;

      const logs = result.debug_logs || [];
      logCount.textContent = logs.length;
      if (logs.length > 0) {
        const last = logs[0];
        lastEventText.textContent = `[${last.level.toUpperCase()}] ${last.message}`;
        lastEventText.title = `[${last.level.toUpperCase()}] ${last.message} (${new Date(last.timestamp).toLocaleTimeString()})`;
      } else {
        lastEventText.textContent = "None";
        lastEventText.title = "";
      }
      resolve();
    });
  });
}

function showAuthenticatedOptions() {
  repoCard.classList.remove("hidden");
  accountCard.classList.remove("hidden");
}

function hideAuthenticatedOptions() {
  repoCard.classList.add("hidden");
  accountCard.classList.add("hidden");
}

/**
 * Displays a quick transient notification bubble.
 * @param {string} msg 
 * @param {'success'|'error'} type 
 */
function showToast(msg, type) {
  statusMsg.className = `status-msg ${type}`;
  statusMsg.textContent = msg;
  statusMsg.classList.remove("hidden");
  
  setTimeout(() => {
    statusMsg.classList.add("hidden");
  }, 3000);
}
