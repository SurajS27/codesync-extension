/**
 * PayloadBuilder
 * Formats and validates unified payloads to be sent from content adapters to background scripts.
 */
const PayloadBuilder = {
  /**
   * Builds the standard submission payload.
   * @param {object} params - The inputs.
   * @param {string} params.platform - Platform name (e.g. 'leetcode').
   * @param {string} params.problemTitle - Title of the problem.
   * @param {string} params.problemSlug - Slug identifier.
   * @param {string} params.difficulty - Difficulty level.
   * @param {string} params.language - Normalized language key.
   * @param {string} params.sourceCode - Extracted code content.
   * @param {string} params.submissionId - Submission identifier.
   * @param {string} params.submissionUrl - Submission URL.
   * @param {string} params.runtime - Submission runtime.
   * @param {string} params.memory - Submission memory usage.
   * @param {string|null} params.questionNumber - The question number prefix.
   * @returns {object|null} The validated payload message, or null if invalid.
   */
  buildSubmissionPayload({
    platform,
    problemTitle,
    problemSlug,
    difficulty,
    language,
    sourceCode,
    submissionId,
    submissionUrl,
    runtime,
    memory,
    questionNumber
  }) {
    // Validation: check for critical fields
    if (!platform || !problemTitle || !problemSlug || !difficulty || !language || !sourceCode || !submissionId) {
      console.warn("[CodeSync PayloadBuilder] Validation failed: missing critical fields", {
        platform, problemTitle, problemSlug, difficulty, language, hasCode: !!sourceCode, submissionId
      });
      return null;
    }

    if (sourceCode.length <= 5) {
      console.warn("[CodeSync PayloadBuilder] Source code too short, skipping payload construction.");
      return null;
    }

    return {
      type: window.CodeSyncConstants ? window.CodeSyncConstants.MESSAGES.SUBMISSION_DETECTED : "SUBMISSION_DETECTED",
      data: {
        platform,
        problem_title: problemTitle,
        problem_slug: problemSlug,
        difficulty: difficulty.toLowerCase(),
        status: "accepted",
        language,
        source_code: sourceCode,
        submission_id: submissionId,
        submission_url: submissionUrl || "",
        runtime: runtime || "N/A",
        memory: memory || "N/A",
        question_number: questionNumber || null
      }
    };
  },

  /**
   * Builds the standard problem metadata update payload.
   */
  buildProblemPayload({ title, slug, difficulty, url, questionNumber }) {
    if (!title || !slug || !difficulty) {
      return null;
    }

    return {
      type: window.CodeSyncConstants ? window.CodeSyncConstants.MESSAGES.PROBLEM_DETECTED : "PROBLEM_DETECTED",
      data: {
        title,
        slug,
        difficulty: difficulty.toLowerCase(),
        url,
        question_number: questionNumber || null
      }
    };
  }
};

// Make it available globally in content script context
window.PayloadBuilder = PayloadBuilder;
