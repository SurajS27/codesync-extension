/**
 * PlatformRegistry
 * Registry managing all supported coding platforms and providing dynamic adapter selection.
 */
const PlatformRegistry = {
  adapters: {},

  /**
   * Registers a platform adapter class.
   * @param {string} name - Name of the platform.
   * @param {function} AdapterClass - Constructor of the platform adapter class.
   */
  register(name, AdapterClass) {
    this.adapters[name] = new AdapterClass();
    console.log(`[CodeSync PlatformRegistry] Registered platform: ${name}`);
  },

  /**
   * Selects and returns the proper platform adapter based on page URL.
   * @param {string} url - The current page URL.
   * @returns {BasePlatform|null}
   */
  getAdapter(url) {
    for (const name in this.adapters) {
      if (this.adapters[name].supports(url)) {
        return this.adapters[name];
      }
    }
    return null;
  }
};

// Auto-register LeetCode platform if loaded
if (window.LeetCodePlatform) {
  PlatformRegistry.register("leetcode", window.LeetCodePlatform);
}

// Make it available globally in content script context
window.PlatformRegistry = PlatformRegistry;
