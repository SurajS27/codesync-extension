/**
 * CodeSync Content Script for LeetCode Problem Detection
 * Detects challenge metadata and reports changes back to the background worker.
 */

// Tracking variables to prevent redundant messaging
let lastUrl = window.location.href;
let lastSlug = "";
let lastTitle = "";

/**
 * Validates if the current page is a LeetCode problem description page.
 * Ignores solution pages, submissions list, contest pages, and overall problem set indexes.
 * @returns {boolean}
 */
function shouldProcessPage() {
  const path = window.location.pathname;
  if (!path.startsWith("/problems/")) return false;

  const ignoreList = ["/problemset/", "/submissions/", "/solutions/", "/contest/"];
  for (const segment of ignoreList) {
    if (path.includes(segment)) return false;
  }
  return true;
}

/**
 * Extracts the problem slug from the location path.
 * @returns {string|null}
 */
function getSlug() {
  const path = window.location.pathname;
  const match = path.match(/^\/problems\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Extracts and normalizes the problem title.
 * Removes question number prefixes (e.g. "1. Two Sum" -> "Two Sum").
 * @returns {string|null}
 */
function getTitle() {
  let titleText = "";
  
  // Try modern UI title header class
  const titleEl = document.querySelector("div.text-title-large");
  if (titleEl) {
    titleText = titleEl.textContent;
  } else {
    // Try legacy selector
    const legacyTitleEl = document.querySelector('div[data-cy="question-title"]');
    if (legacyTitleEl) {
      titleText = legacyTitleEl.textContent;
    }
  }

  // Fallback to document.title parsing if DOM tags are not loaded yet
  if (!titleText || !titleText.trim()) {
    const docTitle = document.title;
    if (docTitle && docTitle.includes(" - LeetCode")) {
      titleText = docTitle.split(" - LeetCode")[0];
    }
  }

  if (!titleText) return null;

  // Trim and strip leading digits (e.g., "1. Two Sum" -> "Two Sum")
  return titleText.trim().replace(/^\d+\.\s*/, "");
}

/**
 * Extracts the question number from the title text (e.g. "175. Combine Two Tables" -> "175").
 * @returns {string|null}
 */
function getQuestionNumber() {
  let titleText = "";
  
  const titleEl = document.querySelector("div.text-title-large");
  if (titleEl) {
    titleText = titleEl.textContent;
  } else {
    const legacyTitleEl = document.querySelector('div[data-cy="question-title"]');
    if (legacyTitleEl) {
      titleText = legacyTitleEl.textContent;
    }
  }

  if (!titleText || !titleText.trim()) {
    const docTitle = document.title;
    if (docTitle && docTitle.includes(" - LeetCode")) {
      titleText = docTitle.split(" - LeetCode")[0];
    }
  }

  if (!titleText) return null;

  const match = titleText.trim().match(/^(\d+)\./);
  return match ? match[1] : null;
}

/**
 * Detects and normalizes LeetCode problem difficulty level to lowercase.
 * @returns {"easy"|"medium"|"hard"|null}
 */
function getDifficulty() {
  // Select potential difficulty badge elements directly
  const selectors = [
    "div.text-difficulty-easy", "div.text-difficulty-medium", "div.text-difficulty-hard",
    "span.text-difficulty-easy", "span.text-difficulty-medium", "span.text-difficulty-hard",
    ".text-green-s", ".text-brand-orange", ".text-pink", ".text-orange-s", ".text-yellow",
    "[class*='text-difficulty-']"
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.textContent.trim().toLowerCase();
      if (text === "easy") return "easy";
      if (text === "medium") return "medium";
      if (text === "hard") return "hard";
    }
  }

  // Fallback: search leaf nodes for exact match
  const nodes = document.querySelectorAll("div, span, p");
  for (const node of nodes) {
    if (node.children.length === 0) {
      const textVal = node.textContent.trim().toLowerCase();
      if (textVal === "easy") return "easy";
      if (textVal === "medium") return "medium";
      if (textVal === "hard") return "hard";
    }
  }

  return null;
}

/**
 * Performs extraction and communicates changes to the background script.
 */
function extractAndNotify() {
  try {
    if (!shouldProcessPage()) return;

    const slug = getSlug();
    const title = getTitle();
    const difficulty = getDifficulty();
    const questionNumber = getQuestionNumber();
    const url = window.location.href;

    // Task 5 validation: ensure all elements are present before saving
    if (!title || !slug || !difficulty) {
      return;
    }

    // Prevent sending duplicate messages if nothing has changed
    if (slug === lastSlug && title === lastTitle && url === lastUrl) {
      return;
    }

    lastSlug = slug;
    lastTitle = title;
    lastUrl = url;

    const payload = {
      type: "PROBLEM_DETECTED",
      data: {
        title,
        slug,
        difficulty,
        url,
        question_number: questionNumber
      }
    };

    console.log("[CodeSync Detection Engine] Dispatching metadata:", payload.data);
    chrome.runtime.sendMessage(payload);
  } catch (error) {
    console.error("[CodeSync Detection Engine] Error during metadata extraction:", error);
  }
}

// 1. MutationObserver to handle Single Page Application (SPA) DOM state transitions
const observer = new MutationObserver(() => {
  extractAndNotify();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 2. Initial execution trigger
extractAndNotify();

// 3. Fallback poll (every 8 seconds) to backstop observer transitions
setInterval(extractAndNotify, 8000);
