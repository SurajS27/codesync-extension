/**
 * StorageClient handles persistent storage operations using Chrome's local storage API.
 * Every method returns a Promise for asynchronous flow control.
 */
export const StorageClient = {
  /**
   * Persist the authentication token.
   * @param {string} token 
   * @returns {Promise<void>}
   */
  setToken(token) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ token }, () => resolve());
    });
  },

  /**
   * Retrieve the persisted authentication token.
   * @returns {Promise<string|null>}
   */
  getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["token"], (result) => resolve(result.token || null));
    });
  },

  /**
   * Persist user profile data.
   * @param {object} user 
   * @returns {Promise<void>}
   */
  setUser(user) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ user }, () => resolve());
    });
  },

  /**
   * Retrieve persisted user profile data.
   * @returns {Promise<object|null>}
   */
  getUser() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["user"], (result) => resolve(result.user || null));
    });
  },

  /**
   * Persist the selected repository ID.
   * @param {string} id 
   * @returns {Promise<void>}
   */
  setSelectedRepositoryId(id) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ selectedRepositoryId: id }, () => resolve());
    });
  },

  /**
   * Retrieve the persisted selected repository ID.
   * @returns {Promise<string|null>}
   */
  getSelectedRepositoryId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["selectedRepositoryId"], (result) => resolve(result.selectedRepositoryId || null));
    });
  },

  /**
   * Persist custom backend API base URL settings.
   * @param {string} url 
   * @returns {Promise<void>}
   */
  setApiBaseUrl(url) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ apiBaseUrl: url }, () => resolve());
    });
  },

  /**
   * Retrieve custom backend API base URL setting, falling back to default.
   * @returns {Promise<string>}
   */
  getApiBaseUrl() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["apiBaseUrl"], (result) => {
        resolve(result.apiBaseUrl || "http://localhost:8000/api/v1");
      });
    });
  },

  /**
   * Clears all persisted storage variables (used for logging out).
   * @returns {Promise<void>}
   */
  clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => resolve());
    });
  }
};
