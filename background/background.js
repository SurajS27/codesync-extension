import { Logger } from "../scripts/logger.js";
import { APIClient } from "../scripts/api.js";

/**
 * CodeSync Background Service Worker
 * Coordinates solution detection state, tab focus states, and action badges.
 */

chrome.runtime.onInstalled.addListener(async () => {
  console.log("CodeSync Extension (v0.7.0) successfully installed/reloaded.");
  await Logger.logInfo("startup", "CodeSync Extension successfully installed/reloaded.");
});

chrome.runtime.onStartup.addListener(async () => {
  console.log("CodeSync Extension startup event triggered.");
  await Logger.logInfo("startup", "CodeSync Extension startup event triggered.");
  chrome.storage.local.get(["pending_syncs"], async (result) => {
    const queue = result.pending_syncs || [];
    const msg = `${queue.length} pending syncs waiting for manual recovery.`;
    console.log(`[Background] ${msg}`);
    await Logger.logInfo("sync", msg);
  });
});

// Helper: Checks if a URL represents a supported problem description page
function isSupportedProblemUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    
    // LeetCode Matcher
    if (host.includes("leetcode.com")) {
      const path = parsed.pathname;
      if (!path.startsWith("/problems/")) return false;
      const ignoreList = ["/problemset/", "/submissions/", "/solutions/", "/contest/"];
      return !ignoreList.some(segment => path.includes(segment));
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

// Helper: Updates the extension action badge color and label based on difficulty
function updateBadge(difficulty) {
  if (!difficulty) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  const cleanDiff = difficulty.toLowerCase();
  let text = "";
  let color = "";

  if (cleanDiff === "easy") {
    text = "E";
    color = "#10b981"; // Vibrant Green
  } else if (cleanDiff === "medium") {
    text = "M";
    color = "#f59e0b"; // Vibrant Orange
  } else if (cleanDiff === "hard") {
    text = "H";
    color = "#ef4444"; // Vibrant Red
  }

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Helper: Evaluates tab properties to set or clear active badges dynamically
async function handleTabStateChange(tab) {
  if (!tab || !tab.url) {
    updateBadge(null);
    return;
  }

  if (isSupportedProblemUrl(tab.url)) {
    const data = await chrome.storage.local.get(["current_problem"]);
    const current = data.current_problem;
    
    // Check if the stored problem matches the active tab's pathname slug
    if (current && tab.url.includes(`/problems/${current.slug}`)) {
      updateBadge(current.difficulty);
    } else {
      // Loading/transition state
      chrome.action.setBadgeText({ text: "..." });
      chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
    }
  } else {
    // Hide badge if the user is on a non-LeetCode tab (stored problem remains intact)
    updateBadge(null);
  }
}

// 1. Message Broker: Listens for dispatches from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FOCUS_POPUP") {
    if (chrome.action && typeof chrome.action.openPopup === "function") {
      chrome.action.openPopup().catch(err => console.debug("openPopup failed:", err));
    }
  }

  if (message.type === "PROBLEM_DETECTED") {
    const { title, slug, difficulty, url, question_number } = message.data;
    const tabId = sender.tab ? sender.tab.id : null;

    const storagePayload = {
      current_problem: { title, slug, difficulty, url, question_number },
      last_detected_at: Date.now(),
      source_tab_id: tabId
    };

    chrome.storage.local.set(storagePayload, () => {
      console.log(`[Background] Saved active problem: "${title}" (${difficulty}, #${question_number})`);
      Logger.logInfo("detection", `Problem detected: ${title} (${difficulty}, #${question_number})`);
      // Update badge immediately if the message is from the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id === tabId) {
          updateBadge(difficulty);
        }
      });
    });
  }

  if (message.type === "SUBMISSION_DETECTED") {
    const submission = message.data;

    // Validate payload against all rules
    if (
      submission.status === "accepted" &&
      submission.submission_id &&
      submission.language &&
      submission.source_code &&
      submission.source_code.length > 5 &&
      submission.problem_title &&
      submission.problem_slug &&
      submission.difficulty
    ) {
      chrome.storage.local.get(["latest_submission", "submission_history"], (result) => {
        const latest = result.latest_submission;

        // Prevent duplicate storage for the same submission_id with identical metrics
        if (
          latest &&
          latest.submission_id === submission.submission_id &&
          latest.runtime === submission.runtime &&
          latest.memory === submission.memory
        ) {
          console.log(`[Background] Duplicate submission ID ${submission.submission_id} ignored.`);
          return;
        }

        const detectedAt = Date.now();
        const payloadToStore = {
          latest_submission: submission,
          detected_at: detectedAt
        };

        // Manage optional rolling history of up to 20 entries (newest first)
        let history = result.submission_history || [];
        // Filter out old version of the same submission ID to update in history
        history = history.filter(item => item.submission_id !== submission.submission_id);
        
        history.unshift({
          ...submission,
          detected_at: detectedAt
        });
        if (history.length > 20) {
          history = history.slice(0, 20);
        }
        payloadToStore.submission_history = history;

        chrome.storage.local.set(payloadToStore, () => {
          console.log(`[Background] Stored/Updated latest submission ID ${submission.submission_id} for "${submission.problem_title}"`);
          Logger.logInfo("detection", `Submission detected for "${submission.problem_title}" (ID: ${submission.submission_id})`);
          
          // Trigger Auto-Sync Check
          chrome.storage.local.get(["token", "selectedRepositoryId", "auto_sync"], async (settings) => {
            const token = settings.token;
            const repoId = settings.selectedRepositoryId;
            const autoSync = settings.auto_sync !== false; // Default to true if not set

            if (autoSync && token && repoId) {
              console.log("[Background] Auto-Sync is enabled. Initiating sync...");
              const syncPayload = {
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
                const response = await APIClient.syncLeetCodeSubmission(token, syncPayload);
                console.log("[Background] Auto-Sync successful:", response);
                await Logger.logInfo("sync", `Auto-Sync successful for "${submission.problem_title}" (SHA: ${response.commit_sha})`);

                const lastSyncResult = {
                  status: "completed",
                  repository_id: repoId,
                  submission_id: submission.submission_id,
                  source_code: submission.source_code,
                  commit_sha: response.commit_sha,
                  github_file_path: response.github_file_path,
                  commit_url: response.commit_url,
                  synced_at: new Date().toISOString()
                };
                chrome.storage.local.set({ last_sync_result: lastSyncResult });
              } catch (err) {
                console.error("[Background] Auto-Sync failed:", err);
                await Logger.logError("sync", `Auto-Sync failed: ${err.message}`);

                const lastSyncResult = {
                  status: "failed",
                  repository_id: repoId,
                  submission_id: submission.submission_id,
                  source_code: submission.source_code,
                  error_message: err.message || "Unknown error",
                  synced_at: new Date().toISOString()
                };
                chrome.storage.local.set({ last_sync_result: lastSyncResult });
              }
            } else {
              console.log("[Background] Auto-Sync skipped: either disabled or missing token/repository settings.");
            }
          });
        });
      });
    } else {
      console.warn("[Background] Ignored invalid or non-accepted submission payload:", submission);
    }
  }
});

// 2. Tab Change Monitors: Triggers badge state evaluations on tab focus or URL load
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await handleTabStateChange(tab);
  } catch (err) {
    console.debug("[Background] Tab query warning:", err);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id === tabId) {
      await handleTabStateChange(activeTab);
    }
  }
});

// 3. Storage Observer (Debugging / Logging)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "local") return;

  if (changes.token) {
    const action = changes.token.newValue ? "saved" : "removed";
    console.log(`[Background] Auth token ${action}.`);
  }
});
