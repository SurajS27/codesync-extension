import { StorageClient } from "./storage.js";

/**
 * StateManager acts as an abstraction layer over StorageClient to query
 * authentication status, current user profile, and active repositories.
 */
export const StateManager = {
  /**
   * Evaluates authentication state by looking for a persisted token.
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    const token = await StorageClient.getToken();
    return !!token;
  },

  /**
   * Retrieves the current user details from local storage.
   * @returns {Promise<object|null>}
   */
  async getCurrentUser() {
    return await StorageClient.getUser();
  },

  /**
   * Retrieves the selected repository ID from local storage.
   * @returns {Promise<string|null>}
   */
  async getSelectedRepositoryId() {
    return await StorageClient.getSelectedRepositoryId();
  }
};
