/**
 * CodeSync Main Entrypoint
 * Orchestrates platform detection, initializes the correct adapter, and sets up MutationObservers.
 */
(async function() {
  const url = window.location.href;
  const adapter = window.PlatformRegistry ? window.PlatformRegistry.getAdapter(url) : null;
  if (!adapter) {
    console.log("[CodeSync main] URL not supported by any registered platform adapter:", url);
    return;
  }

  adapter.initialize();

  let lastUrl = window.location.href;
  let lastSlug = "";
  let lastTitle = "";
  
  // Track last processed submission ID and metrics to prevent redundant dispatches
  let lastProcessedSubmissionId = null;
  let lastProcessedRuntime = "N/A";
  let lastProcessedMemory = "N/A";

  async function checkProblem() {
    try {
      const problemMeta = await adapter.detectProblem();
      if (!problemMeta) return;

      const currentUrl = window.location.href;

      // Prevent redundant storage save if nothing has changed
      if (problemMeta.slug === lastSlug && problemMeta.title === lastTitle && currentUrl === lastUrl) {
        return;
      }

      lastSlug = problemMeta.slug;
      lastTitle = problemMeta.title;
      lastUrl = currentUrl;

      if (window.PayloadBuilder) {
        const payload = window.PayloadBuilder.buildProblemPayload({
          title: problemMeta.title,
          slug: problemMeta.slug,
          difficulty: problemMeta.difficulty,
          url: problemMeta.url,
          questionNumber: problemMeta.question_number
        });
        if (payload) {
          console.log(`[CodeSync] Detected problem: "${problemMeta.title}" (${problemMeta.difficulty})`);
          chrome.runtime.sendMessage(payload);
        }
      }
    } catch (error) {
      console.error("[CodeSync] Error during problem detection:", error);
    }
  }

  async function getSavedProblemMeta() {
    return new Promise((resolve) => {
      const currentProblemKey = window.CodeSyncConstants 
        ? window.CodeSyncConstants.STORAGE_KEYS.CURRENT_PROBLEM 
        : "current_problem";
      chrome.storage.local.get([currentProblemKey], (result) => {
        resolve(result[currentProblemKey] || null);
      });
    });
  }

  async function checkSubmission() {
    try {
      const submissionDetails = await adapter.detectSubmission();
      if (!submissionDetails || !submissionDetails.isAccepted) return;

      // Gather metrics, code, and language from the adapter
      const metrics = adapter.extractMetrics();
      const code = await adapter.extractCode();
      const language = adapter.extractLanguage();

      // Prevent duplicate runs on the same submission ID with identical metrics
      if (
        submissionDetails.id === lastProcessedSubmissionId &&
        metrics.runtime === lastProcessedRuntime &&
        metrics.memory === lastProcessedMemory
      ) {
        return;
      }

      const problemMeta = await getSavedProblemMeta();
      if (!problemMeta) {
        console.log("[CodeSync] No saved problem metadata found in storage.");
        return;
      }

      const payload = adapter.buildPayload(problemMeta, submissionDetails, code, language, metrics);
      if (!payload) {
        return;
      }

      lastProcessedSubmissionId = submissionDetails.id;
      lastProcessedRuntime = metrics.runtime;
      lastProcessedMemory = metrics.memory;

      console.log("[CodeSync] Dispatching submission payload:", payload.data);
      chrome.runtime.sendMessage(payload);
    } catch (error) {
      console.error("[CodeSync] Error during submission detection:", error);
    }
  }

  function runAllChecks() {
    checkProblem();
    checkSubmission();
  }

  // 1. MutationObserver to handle SPA DOM transitions
  const observer = new MutationObserver(() => {
    runAllChecks();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 2. Initial execution
  runAllChecks();

  // 3. Fallback polling (every 8 seconds)
  setInterval(runAllChecks, 8000);
})();
