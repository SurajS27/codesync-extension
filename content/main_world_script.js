/**
 * CodeSync Main World Script
 * Runs in the webpage context (MAIN world).
 * 
 * Strategy: Intercept LeetCode's fetch() calls to capture the source code
 * at the moment the user clicks "Submit". This is the most reliable method
 * because it captures the code directly from the network request payload,
 * completely bypassing Monaco editor access restrictions.
 */

(function () {
  // Store the last captured code and language from submit fetch calls
  let capturedCode = null;
  let capturedLang = null;

  // Override the global fetch to intercept LeetCode's submit API calls
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [resource, config] = args;

    try {
      const url = typeof resource === "string" ? resource : resource?.url;
      const method = config?.method?.toUpperCase() || "GET";

      // Only intercept POST requests to LeetCode's submit or interpret endpoints
      if (
        method === "POST" &&
        url &&
        (url.includes("/submit/") || url.includes("/interpret_solution/"))
      ) {
        let body = config?.body;
        if (body) {
          try {
            const parsed = typeof body === "string" ? JSON.parse(body) : body;
            if (parsed && parsed.typed_code) {
              capturedCode = parsed.typed_code;
              capturedLang = parsed.lang || parsed.lang_slug || null;
              console.log("[CodeSync] Captured submit payload. Code length:", capturedCode.length);
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    return originalFetch.apply(this, args);
  };

  // Listen for requests from the isolated content script
  document.addEventListener("CodeSync_Request_Monaco_Code", (e) => {
    let code = null;
    let lang = null;

    // Method 1: Return the fetch-intercepted code if available
    if (capturedCode) {
      code = capturedCode;
      lang = capturedLang;
      console.log("[CodeSync] Returning fetch-intercepted code. Length:", code.length);
    } else {
      // Method 2: Fallback - try window.monaco if available
      try {
        if (window.monaco && window.monaco.editor) {
          const editors = window.monaco.editor.getEditors();
          let mainEditor = null;
          let maxArea = -1;

          if (editors && editors.length > 0) {
            for (const editor of editors) {
              try {
                const domNode = editor.getDomNode();
                if (domNode) {
                  const rect = domNode.getBoundingClientRect();
                  const area = rect.width * rect.height;
                  if (area > maxArea) {
                    maxArea = area;
                    mainEditor = editor;
                  }
                }
              } catch (err) {}
            }
          }

          if (mainEditor) {
            const model = mainEditor.getModel();
            if (model) {
              code = model.getValue();
            }
          }

          if (!code) {
            const models = window.monaco.editor.getModels();
            if (models && models.length > 0) {
              let maxLength = -1;
              for (const m of models) {
                const val = m.getValue();
                if (val && val.length > maxLength) {
                  maxLength = val.length;
                  code = val;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("[CodeSync Main World] Monaco fallback error:", err);
      }
    }

    document.dispatchEvent(new CustomEvent("CodeSync_Response_Monaco_Code", { detail: { code, lang } }));
  });
})();
