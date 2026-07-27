/**
 * CodeSync Main World Script
 * Runs in the webpage context (MAIN world).
 *
 * Intercepts LeetCode's fetch() submit calls to capture source code 
 * at the exact moment the user clicks Submit. This is a backup method;
 * the primary method is the GraphQL API fetch in submission_detector.js.
 */

(function () {
  let capturedCode = null;
  let capturedLang = null;

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [resource, config] = args;

    try {
      const url = typeof resource === "string" ? resource : resource?.url;
      const method = config?.method?.toUpperCase() || "GET";

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
              // Broadcast to content script immediately
              document.dispatchEvent(new CustomEvent("CodeSync_Submit_Captured", {
                detail: { code: capturedCode, lang: capturedLang }
              }));
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    return originalFetch.apply(this, args);
  };

  // Also respond to on-demand requests
  document.addEventListener("CodeSync_Request_Monaco_Code", () => {
    document.dispatchEvent(new CustomEvent("CodeSync_Response_Monaco_Code", {
      detail: { code: capturedCode, lang: capturedLang }
    }));
  });
})();
