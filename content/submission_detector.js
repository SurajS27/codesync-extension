/**
 * CodeSync Content Script for LeetCode Submission Detection
 * Detects successful submissions ("Accepted"), extracts source code, language,
 * submission ID, runtime, and memory metrics, and relays them to the background worker.
 */

// Track last processed submission ID and metrics to prevent redundant dispatches
let lastProcessedSubmissionId = null;
let lastProcessedRuntime = "N/A";
let lastProcessedMemory = "N/A";

/**
 * Normalizes programming language strings to standardized extensions keys.
 * @param {string} lang 
 * @returns {string|null}
 */
function normalizeLanguage(lang) {
  const clean = lang.toLowerCase().trim();
  if (clean.includes("python")) return "python";
  if (clean.includes("javascript") || clean === "js") return "javascript";
  if (clean.includes("typescript") || clean === "ts") return "typescript";
  if (clean === "java") return "java";
  if (clean === "c++" || clean === "cpp") return "cpp";
  if (clean === "c" && clean.length === 1) return "c";
  if (clean === "go" || clean === "golang") return "go";
  if (clean === "rust") return "rust";
  if (clean === "c#" || clean === "csharp") return "csharp";
  if (clean.includes("sql") || clean === "mysql") return "sql";
  return null;
}

/**
 * Extracts language preference from page selectors.
 * @returns {string|null}
 */
function getLanguage() {
  const elements = document.querySelectorAll("div, span, p, h1, h2, h3, button, a");
  
  // 1. Try matching "Code | Language" pattern (common on submissions page)
  for (const el of elements) {
    const text = el.textContent.trim();
    const match = text.match(/Code\s*\|\s*([a-zA-Z0-9#\+\-]+)/i);
    if (match) {
      const norm = normalizeLanguage(match[1]);
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
      const norm = normalizeLanguage(text);
      if (norm) return norm;
    }
  }

  // 3. Fallback: Search elements with short text content matching language names
  for (const el of elements) {
    const text = el.textContent.trim();
    if (text.length > 0 && text.length < 15) {
      const norm = normalizeLanguage(text);
      if (norm) return norm;
    }
  }
  return null;
}

/**
 * Extracts code from the page.
 * Primary: Asks the main-world script which intercepts LeetCode's fetch() submit calls.
 * Fallback: DOM-based code block extraction.
 * @returns {Promise<{code: string|null, lang: string|null}>}
 */
async function extractSourceCode(language) {
  // Method 1: Ask the main-world script (uses fetch intercept or monaco fallback)
  try {
    const result = await new Promise((resolve) => {
      const listener = (e) => {
        document.removeEventListener("CodeSync_Response_Monaco_Code", listener);
        resolve(e.detail);
      };
      document.addEventListener("CodeSync_Response_Monaco_Code", listener);
      
      document.dispatchEvent(new CustomEvent("CodeSync_Request_Monaco_Code", { detail: { language } }));
      
      // Timeout fallback
      setTimeout(() => {
        document.removeEventListener("CodeSync_Response_Monaco_Code", listener);
        resolve(null);
      }, 2000);
    });

    // Handle both old string format and new {code, lang} format
    if (result) {
      const code = typeof result === "string" ? result : result.code;
      const lang = typeof result === "string" ? null : result.lang;
      if (code && code.trim().length > 5) {
        return { code, lang };
      }
    }
  } catch (e) {
    console.warn("[CodeSync] Failed to extract from main world:", e);
  }

  // Method 2: Fallback to general read-only view code blocks
  const codeEl = document.querySelector("pre, code, textarea.inputarea");
  if (codeEl) {
    const code = codeEl.value || codeEl.textContent || codeEl.innerText;
    if (code && code.trim().length > 5) {
      return { code: code.replace(/\u00a0/g, " "), lang: null };
    }
  }

  return { code: null, lang: null };
}


/**
 * Identifies the unique submission ID and constructs its URL.
 * @returns {{id: string, url: string}|null}
 */
function getSubmissionDetails() {
  // 1. Check URL pathname
  const path = window.location.pathname;
  const urlMatch = path.match(/\/submissions\/(?:detail\/)?(\d+)/);
  if (urlMatch) {
    return {
      id: urlMatch[1],
      url: window.location.href
    };
  }

  // 2. Fallback: Parse all visible detail link elements and select the one with the largest ID
  const detailLinks = Array.from(document.querySelectorAll('a[href*="/submissions/"]'));
  if (detailLinks.length > 0) {
    let maxId = -1;
    let bestLink = null;

    for (const link of detailLinks) {
      const href = link.getAttribute("href");
      if (!href) continue;
      const match = href.match(/\/submissions\/(?:detail\/)?(\d+)/);
      if (match) {
        const id = parseInt(match[1], 10);
        if (id > maxId) {
          maxId = id;
          bestLink = link;
        }
      }
    }

    if (bestLink && maxId !== -1) {
      const href = bestLink.getAttribute("href");
      const absoluteUrl = href.startsWith("http") ? href : `${window.location.origin}${href}`;
      return {
        id: maxId.toString(),
        url: absoluteUrl
      };
    }
  }

  return null;
}

function getMetrics() {
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
}

/**
 * Fetches current challenge meta from chrome storage.
 * @returns {Promise<object|null>}
 */
function getSavedProblemMeta() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["current_problem"], (result) => {
      resolve(result.current_problem || null);
    });
  });
}

/**
 * Searches the DOM for a successful "Accepted" status label.
 * @returns {boolean}
 */
function isAcceptedStatusVisible() {
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

/**
 * Main parser: gathers all payload variables, validates them, and transmits to background.
 */
async function processSubmission() {
  try {
    const isAccepted = isAcceptedStatusVisible();
    const subDetails = getSubmissionDetails();

    console.log("[CodeSync Debug] Checking submission page:", {
      url: window.location.href,
      isAcceptedStatusVisible: isAccepted,
      submissionDetails: subDetails
    });

    // 1. Confirm "Accepted" text is present
    if (!isAccepted) return;

    // 2. Extract submission ID and details
    if (!subDetails) {
      console.log("[CodeSync Debug] No submission details extracted.");
      return;
    }

    // 3. Gather code, language, and performance metrics
    const detectedLanguage = getLanguage();
    const { code: sourceCode, lang: interceptedLang } = await extractSourceCode(detectedLanguage);
    // Prefer the language from the fetch-intercepted payload (most accurate)
    const language = interceptedLang || detectedLanguage;
    const { runtime, memory } = getMetrics();

    // Prevent duplicate runs on the same submission ID with identical metrics
    if (
      subDetails.id === lastProcessedSubmissionId &&
      runtime === lastProcessedRuntime &&
      memory === lastProcessedMemory
    ) {
      return;
    }

    // 4. Retrieve problem details (slug, title, difficulty)
    const problemMeta = await getSavedProblemMeta();

    console.log("[CodeSync Debug] Extracted payload parts:", {
      sourceCodeLength: sourceCode ? sourceCode.length : 0,
      language: language,
      interceptedLang: interceptedLang,
      runtime: runtime,
      memory: memory,
      problemMeta: problemMeta
    });

    if (!problemMeta) {
      console.log("[CodeSync Debug] No saved problem metadata found in storage.");
      return;
    }

    // 5. Validation Check: Reject incomplete payloads
    if (!sourceCode || sourceCode.length <= 5 || !language || !subDetails.id) {
      console.warn("[CodeSync Debug] Validation failed. Missing fields: " + JSON.stringify({
        hasSourceCode: !!sourceCode,
        sourceCodeLength: sourceCode ? sourceCode.length : 0,
        language: language,
        submissionId: subDetails.id
      }));
      return;
    }

    lastProcessedSubmissionId = subDetails.id;
    lastProcessedRuntime = runtime;
    lastProcessedMemory = memory;

    const payload = {
      type: "SUBMISSION_DETECTED",
      data: {
        platform: "leetcode",
        problem_title: problemMeta.title,
        problem_slug: problemMeta.slug,
        difficulty: problemMeta.difficulty,
        status: "accepted",
        language: language,
        source_code: sourceCode,
        submission_id: subDetails.id,
        submission_url: subDetails.url,
        runtime: runtime,
        memory: memory,
        question_number: problemMeta.question_number
      }
    };

    console.log("[CodeSync Submission Detector] Dispatching payload:", payload.data);
    chrome.runtime.sendMessage(payload);
  } catch (error) {
    console.error("[CodeSync Submission Detector] Error during submission processing:", error);
  }
}

// 1. Setup MutationObserver to watch result card states
const submissionObserver = new MutationObserver(() => {
  processSubmission();
});

submissionObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// 2. Initial execution pass
processSubmission();

