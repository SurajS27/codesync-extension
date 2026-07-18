/**
 * BasePlatform
 * Abstract interface/class defining the contract for all platform adapters in CodeSync.
 * Every supported platform must inherit from this class and implement its methods.
 */
class BasePlatform {
  /**
   * Evaluates if the adapter supports the given URL.
   * @param {string} url - The current page URL.
   * @returns {boolean}
   */
  supports(url) {
    throw new Error("Method 'supports(url)' must be implemented.");
  }

  /**
   * Initializes platform-specific observers, listeners, or state.
   */
  initialize() {
    throw new Error("Method 'initialize()' must be implemented.");
  }

  /**
   * Detects problem metadata from the current page.
   * @returns {Promise<{title: string, slug: string, difficulty: string, question_number: string|null, url: string} | null>}
   */
  async detectProblem() {
    throw new Error("Method 'detectProblem()' must be implemented.");
  }

  /**
   * Checks if a successful submission is currently visible on the page.
   * @returns {Promise<{id: string, url: string, isAccepted: boolean} | null>}
   */
  async detectSubmission() {
    throw new Error("Method 'detectSubmission()' must be implemented.");
  }

  /**
   * Extracts the source code from the active editor.
   * @returns {Promise<string|null>|string|null}
   */
  async extractCode() {
    throw new Error("Method 'extractCode()' must be implemented.");
  }

  /**
   * Extracts the programming language from the editor select/dropdown.
   * @returns {string|null}
   */
  extractLanguage() {
    throw new Error("Method 'extractLanguage()' must be implemented.");
  }

  /**
   * Extracts performance metrics (runtime and memory usage).
   * @returns {{runtime: string, memory: string}}
   */
  extractMetrics() {
    throw new Error("Method 'extractMetrics()' must be implemented.");
  }

  /**
   * Builds the unified submission payload ready for dispatching.
   * @param {object} problemMeta - The problem metadata.
   * @param {object} submissionDetails - The submission ID/URL details.
   * @param {string} code - The extracted source code.
   * @param {string} language - The normalized language code.
   * @param {object} metrics - The runtime & memory metrics.
   * @returns {object}
   */
  buildPayload(problemMeta, submissionDetails, code, language, metrics) {
    throw new Error("Method 'buildPayload()' must be implemented.");
  }

  /**
   * Returns the canonical string identifier for the platform (e.g. "leetcode").
   * @returns {string}
   */
  getPlatformName() {
    throw new Error("Method 'getPlatformName()' must be implemented.");
  }
}

// Make it available globally in content script context
window.BasePlatform = BasePlatform;
