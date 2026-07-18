/**
 * LeetCodeExtractor
 * Parses the LeetCode DOM to extract source code, runtime, memory, and submission details.
 */
const LeetCodeExtractor = {
  async extractSourceCode() {
    // 1. Try to get code from the main world script via custom events (highly reliable, no virtualization issues)
    const mainWorldCode = await new Promise((resolve) => {
      const onResponse = (e) => {
        document.removeEventListener("CodeSync_Response_Monaco_Code", onResponse);
        if (e.detail && e.detail.code) {
          resolve(e.detail.code);
        } else {
          resolve(null);
        }
      };
      document.addEventListener("CodeSync_Response_Monaco_Code", onResponse);

      // Dispatch the request event to MAIN world
      document.dispatchEvent(new CustomEvent("CodeSync_Request_Monaco_Code"));

      // Set a quick timeout to prevent hanging if no response is received
      setTimeout(() => {
        document.removeEventListener("CodeSync_Response_Monaco_Code", onResponse);
        resolve(null);
      }, 400);
    });

    if (mainWorldCode && mainWorldCode.trim().length > 5) {
      console.log("[CodeSync] Extracted complete code from main world bridge. Length:", mainWorldCode.length);
      return mainWorldCode;
    }

    console.log("[CodeSync] Main world bridge returned no code. Falling back to DOM scraping.");

    // 2. Fallback: Check Monaco DOM lines (textContent) - virtualized/scrolled only
    const lines = Array.from(document.querySelectorAll(".view-line"));
    if (lines.length > 0) {
      // Sort lines by their top offset to prevent scrambled lines due to Monaco virtualization
      lines.sort((a, b) => {
        const topA = parseFloat(a.style.top) || a.getBoundingClientRect().top;
        const topB = parseFloat(b.style.top) || b.getBoundingClientRect().top;
        return topA - topB;
      });

      let code = lines.map(line => line.textContent).join("\n");
      if (code && code.trim().length > 5) {
        return code.replace(/\u00a0/g, " ");
      }
      
      // Fallback 2: Monaco DOM lines (innerText)
      let codeInner = lines.map(line => line.innerText).join("\n");
      if (codeInner && codeInner.trim().length > 5) {
        return codeInner.replace(/\u00a0/g, " ");
      }
    }

    // Fallback 3: Fallback to general read-only view code blocks
    const codeEl = document.querySelector("pre, code, textarea.inputarea");
    if (codeEl) {
      const code = codeEl.value || codeEl.textContent || codeEl.innerText;
      if (code && code.trim().length > 5) {
        return code.replace(/\u00a0/g, " ");
      }
    }

    return null;
  },

  /**
   * Extracts language preference from page selectors.
   * @returns {string|null}
   */
  getLanguage() {
    const elements = document.querySelectorAll("div, span, p, h1, h2, h3, button, a");
    
    // 1. Try matching "Code | Language" pattern (common on submissions page)
    for (const el of elements) {
      const text = el.textContent.trim();
      const match = text.match(/Code\s*\|\s*([a-zA-Z0-9#\+\-]+)/i);
      if (match) {
        const norm = window.LanguageMapper ? window.LanguageMapper.normalize(match[1]) : null;
        if (norm) return norm;
      }
    }

    // 2. Try matching specific lang selectors
    const selectors = [
      "button[id^='lang-select']",
      "[class*='lang-select']",
      ".ant-select-selection-item",
      "div.text-sm.font-medium"
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent.trim();
        const norm = window.LanguageMapper ? window.LanguageMapper.normalize(text) : null;
        if (norm) return norm;
      }
    }

    // 3. Fallback: Search elements with short text content matching language names
    for (const el of elements) {
      const text = el.textContent.trim();
      if (text.length > 0 && text.length < 15) {
        const norm = window.LanguageMapper ? window.LanguageMapper.normalize(text) : null;
        if (norm) return norm;
      }
    }
    return null;
  },

  /**
   * Extracts performance metrics (runtime and memory usage).
   * @returns {{runtime: string, memory: string}}
   */
  getMetrics() {
    let runtime = "";
    let memory = "";

    const elements = Array.from(document.querySelectorAll("span, div, p, label"));
    
    // 1. Search parent containers of "Runtime" and "Memory" labels
    for (const el of elements) {
      const text = el.textContent.trim();
      if (text.length > 0 && text.length < 15 && (/^runtime$/i.test(text) || text === "Runtime")) {
        const parent = el.parentElement;
        if (parent) {
          const match = parent.textContent.match(/(\d+(?:\.\d+)?\s*(?:ms|seconds|sec|s))/i);
          if (match) {
            runtime = match[1];
            break;
          }
        }
      }
    }

    for (const el of elements) {
      const text = el.textContent.trim();
      if (text.length > 0 && text.length < 15 && (/^memory$/i.test(text) || text === "Memory")) {
        const parent = el.parentElement;
        if (parent) {
          const match = parent.textContent.match(/(\d+(?:\.\d+)?\s*(?:mb|kb|gb))/i);
          if (match) {
            memory = match[1];
            break;
          }
        }
      }
    }

    // 2. Fallback: Parse matching regex patterns from body text content
    if (!runtime) {
      const match = document.body.textContent.match(/Runtime\s*[:\s]*(\d+(?:\.\d+)?\s*(?:ms|seconds|sec|s))/i);
      if (match) runtime = match[1];
    }
    if (!memory) {
      const match = document.body.textContent.match(/Memory\s*[:\s]*(\d+(?:\.\d+)?\s*(?:mb|kb|gb))/i);
      if (match) memory = match[1];
    }

    return {
      runtime: runtime || "N/A",
      memory: memory || "N/A"
    };
  },

  /**
   * Identifies the unique submission ID and constructs its URL.
   * @returns {{id: string, url: string}|null}
   */
  getSubmissionDetails() {
    // 1. Check URL pathname
    const path = window.location.pathname;
    const urlMatch = path.match(/\/submissions\/(?:detail\/)?(\d+)/);
    if (urlMatch) {
      return {
        id: urlMatch[1],
        url: window.location.href
      };
    }

    // 2. Fallback: Parse visible detail link elements
    const detailLink = document.querySelector('a[href*="/submissions/"]');
    if (detailLink) {
      const href = detailLink.getAttribute("href");
      const hrefMatch = href.match(/\/submissions\/(?:detail\/)?(\d+)/);
      if (hrefMatch) {
        const absoluteUrl = href.startsWith("http") ? href : `${window.location.origin}${href}`;
        return {
          id: hrefMatch[1],
          url: absoluteUrl
        };
      }
    }

    return null;
  },

  /**
   * Searches the DOM for a successful "Accepted" status label.
   * @returns {boolean}
   */
  isAcceptedStatusVisible() {
    const selectors = [
      "[class*='text-success']",
      "[class*='text-green']",
      "[class*='text-emerald']",
      ".text-green-s",
      ".text-emerald-s",
      "[data-e2e-locator='submission-status']"
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const txt = el.textContent.trim().toLowerCase();
        if (txt === "accepted" || txt.startsWith("accepted")) {
          return true;
        }
      }
    }

    // Fallback: search leaf nodes for exact or starts-with match
    const nodes = document.querySelectorAll("span, div, p, h1, h2, h3, a");
    for (const node of nodes) {
      if (node.children.length === 0) {
        const txt = node.textContent.trim().toLowerCase();
        if (txt === "accepted" || txt.startsWith("accepted")) {
          return true;
        }
      }
    }
    return false;
  }
};

// Make it available globally in content script context
window.LeetCodeExtractor = LeetCodeExtractor;
