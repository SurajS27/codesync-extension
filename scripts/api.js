import { StorageClient } from "./storage.js";
import { Logger } from "./logger.js";

/**
 * APIClient communicates with the CodeSync Backend API.
 * Automatically fetches the API base URL from StorageClient settings.
 */
export const APIClient = {
  /**
   * Performs an HTTP request to the backend with authentication header injection.
   * Handles 401 Unauthorized, invalid JSON responses, and network failures.
   * @param {string} method - HTTP Verb (GET, POST, etc.)
   * @param {string} path - Target API route path (e.g. '/auth/me')
   * @param {string|null} token - JWT Access Token
   * @param {object|null} body - Request body payload
   * @returns {Promise<any>}
   */
  async request(method, path, token = null, body = null, timeoutMs = 30000) {
    const baseUrl = await StorageClient.getApiBaseUrl();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${baseUrl}${cleanPath}`;

    const headers = {
      "Accept": "application/json"
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    const options = {
      method,
      headers,
      signal: controller.signal
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      clearTimeout(timerId);

      // Handle 401 Unauthorized automatically by wiping storage
      if (response.status === 401) {
        await StorageClient.clearAll();
        throw new Error("Session expired or unauthorized. Please log in again.");
      }

      const text = await response.text();
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error("Server returned an invalid JSON response.");
        }
      }

      if (!response.ok) {
        const detail = data && (data.detail || data.message);
        const err = new Error(detail || `Server request failed with status code ${response.status}.`);
        err.status = response.status;
        throw err;
      }

      return data;
    } catch (error) {
      clearTimeout(timerId);
      if (error.name === "AbortError") {
        const timeoutErr = new Error("Request timed out. Please try again.");
        timeoutErr.status = 408;
        throw timeoutErr;
      }
      // Differentiate network failures from parsed server errors
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        const netErr = new Error("Unable to connect to the CodeSync backend. Check your network or API Base URL settings.");
        netErr.status = 503;
        throw netErr;
      }
      throw error;
    }
  },

  /**
   * Fetches the current user profile from /auth/me
   * @param {string} token 
   * @returns {Promise<object>}
   */
  async fetchProfile(token) {
    return await this.request("GET", "/auth/me", token);
  },

  /**
   * Fetches the list of user repositories from /repositories
   * @param {string} token 
   * @returns {Promise<Array>}
   */
  async fetchRepositories(token) {
    return await this.request("GET", "/repositories", token);
  },

  /**
   * Requests logout and token invalidation on backend
   * @param {string} token 
   * @returns {Promise<object>}
   */
  async logout(token) {
    return await this.request("POST", "/auth/logout", token);
  },

  /**
   * Helper request wrapper with retry logic.
   * Retries 3 times with 1s, 2s, 4s exponential backoff.
   * Only retries on network errors, timeouts, or 5xx server responses.
   */
  async requestWithRetry(method, path, token = null, body = null, timeoutMs = 30000) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const backoffSchedule = [1000, 2000, 4000];

    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        return await this.request(method, path, token, body, timeoutMs);
      } catch (error) {
        const isNetworkError = error.status === 503 || (error.message && error.message.includes("Unable to connect"));
        const isTimeoutError = error.status === 408 || (error.message && error.message.includes("timed out"));
        const is5xxError = error.status >= 500 && error.status < 600;
        const shouldRetry = isNetworkError || isTimeoutError || is5xxError;

        if (!shouldRetry || attempt === 4) {
          throw error;
        }

        const backoffMs = backoffSchedule[attempt - 1];
        await Logger.logWarning(
          "api",
          `Attempt ${attempt} failed (status: ${error.status}). Retrying in ${backoffMs}ms. Error: ${error.message}`
        );
        await delay(backoffMs);
      }
    }
  },

  /**
   * Synchronizes a LeetCode submission to the target repository
   * @param {string} token 
   * @param {object} payload 
   * @returns {Promise<object>}
   */
  async syncLeetCodeSubmission(token, payload) {
    return await this.requestWithRetry("POST", "/sync/leetcode", token, payload);
  },

  /**
   * Fetches user's synchronization history
   * @param {string} token 
   * @returns {Promise<Array>}
   */
  async fetchSyncHistory(token) {
    return await this.request("GET", "/sync/history", token);
  }
};
