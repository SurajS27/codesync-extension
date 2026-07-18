/**
 * LeetCodeDetector
 * Handles LeetCode-specific page state detection and problem metadata parsing.
 */
const LeetCodeDetector = {
  /**
   * Validates if the current page is a LeetCode problem description page.
   * Ignores solution pages, submissions list, contest pages, and overall problem set indexes.
   * @param {string} url - The current URL.
   * @returns {boolean}
   */
  shouldProcessPage(url) {
    try {
      const path = new URL(url).pathname;
      if (!path.startsWith("/problems/")) return false;

      const ignoreList = ["/problemset/", "/submissions/", "/solutions/", "/contest/"];
      for (const segment of ignoreList) {
        if (path.includes(segment)) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Extracts the problem slug from the location path.
   * @param {string} url - The current URL.
   * @returns {string|null}
   */
  getSlug(url) {
    try {
      const path = new URL(url).pathname;
      const match = path.match(/^\/problems\/([^/]+)/);
      return match ? match[1] : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Extracts and normalizes the problem title (removes question number prefix).
   * @returns {string|null}
   */
  getTitle() {
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
  },

  /**
   * Extracts the question number from the title text (e.g. "175. Combine Two Tables" -> "175").
   * @returns {string|null}
   */
  getQuestionNumber() {
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
  },

  /**
   * Detects and normalizes LeetCode problem difficulty level to lowercase.
   * @returns {"easy"|"medium"|"hard"|null}
   */
  getDifficulty() {
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
};

// Make it available globally in content script context
window.LeetCodeDetector = LeetCodeDetector;
