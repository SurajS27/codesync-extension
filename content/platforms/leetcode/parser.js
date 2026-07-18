/**
 * LeetCodePlatform
 * Adapter implementing the BasePlatform interface for the LeetCode platform.
 */
class LeetCodePlatform extends BasePlatform {
  /**
   * Evaluates if the adapter supports the given URL.
   */
  supports(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.includes("leetcode.com");
    } catch (e) {
      return false;
    }
  }

  /**
   * Initializes platform-specific logic.
   */
  initialize() {
    console.log("[CodeSync] LeetCodePlatform adapter active.");
  }

  /**
   * Detects problem metadata.
   */
  async detectProblem() {
    const url = window.location.href;
    if (!window.LeetCodeDetector.shouldProcessPage(url)) {
      return null;
    }

    const title = window.LeetCodeDetector.getTitle();
    const slug = window.LeetCodeDetector.getSlug(url);
    const difficulty = window.LeetCodeDetector.getDifficulty();
    const questionNumber = window.LeetCodeDetector.getQuestionNumber();

    if (!title || !slug || !difficulty) {
      return null;
    }

    return {
      title,
      slug,
      difficulty,
      question_number: questionNumber,
      url
    };
  }

  /**
   * Checks if a successful submission is currently visible.
   */
  async detectSubmission() {
    const isAccepted = window.LeetCodeExtractor.isAcceptedStatusVisible();
    const details = window.LeetCodeExtractor.getSubmissionDetails();
    if (details) {
      return {
        id: details.id,
        url: details.url,
        isAccepted
      };
    }
    return null;
  }

  /**
   * Extracts source code.
   */
  async extractCode() {
    return await window.LeetCodeExtractor.extractSourceCode();
  }

  /**
   * Extracts and normalizes language.
   */
  extractLanguage() {
    return window.LeetCodeExtractor.getLanguage();
  }

  /**
   * Extracts metrics.
   */
  extractMetrics() {
    return window.LeetCodeExtractor.getMetrics();
  }

  /**
   * Builds the submission payload.
   */
  buildPayload(problemMeta, submissionDetails, code, language, metrics) {
    if (!window.PayloadBuilder) return null;
    return window.PayloadBuilder.buildSubmissionPayload({
      platform: this.getPlatformName(),
      problemTitle: problemMeta.title,
      problemSlug: problemMeta.slug,
      difficulty: problemMeta.difficulty,
      language: language,
      sourceCode: code,
      submissionId: submissionDetails.id,
      submissionUrl: submissionDetails.url,
      runtime: metrics.runtime,
      memory: metrics.memory,
      questionNumber: problemMeta.question_number
    });
  }

  /**
   * Returns canonical name.
   */
  getPlatformName() {
    return window.CodeSyncConstants ? window.CodeSyncConstants.PLATFORMS.LEETCODE : "leetcode";
  }
}

// Make it available globally in content script context
window.LeetCodePlatform = LeetCodePlatform;
