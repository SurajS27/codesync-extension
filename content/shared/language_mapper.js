/**
 * LanguageMapper
 * Centralized utility for normalizing coding platform programming language labels into standardized extension-friendly keys.
 */
const LanguageMapper = {
  /**
   * Normalizes programming language strings to standard keys.
   * @param {string} lang - The raw language string.
   * @returns {string|null}
   */
  normalize(lang) {
    if (!lang) return null;
    const clean = lang.toLowerCase().trim();
    if (clean.includes("python")) return "python";
    if (clean.includes("javascript") || clean === "js") return "javascript";
    if (clean.includes("typescript") || clean === "ts") return "typescript";
    if (clean === "java") return "java";
    if (clean === "c++" || clean === "cpp") return "cpp";
    if (clean === "c" && clean.length === 1) return "c";
    if (clean === "go" || clean === "golang") return "go";
    if (clean === "rust") return "rust";
    if (clean === "c#" || clean === "csharp") return "csharp";
    if (clean.includes("sql") || clean === "mysql") return "sql";
    if (clean.includes("kotlin")) return "kotlin";
    if (clean.includes("swift")) return "swift";
    if (clean.includes("php")) return "php";
    if (clean.includes("ruby")) return "ruby";
    return null;
  }
};

// Make it available globally in content script context
window.LanguageMapper = LanguageMapper;
