const PREF_PREFIX = "wms_user_pref_";

/**
 * Safe localStorage wrapper for user-scoped preferences.
 * Each preference is partitioned by userId (e.g., wms_user_pref_1_product_items_hidden_columns).
 * This ensures strict isolation across user accounts and easy resetting upon logout.
 */
export const userPreferenceStorage = {
  /**
   * Generates a namespaced key for the given user ID and preference key.
   * @param {string|number} userId
   * @param {string} key
   * @returns {string|null}
   */
  getStorageKey(userId, key) {
    if (!userId) return null;
    return `${PREF_PREFIX}${userId}_${key}`;
  },

  /**
   * Retrieves a preference for a specific user ID.
   * @param {string|number} userId
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  get(userId, key, defaultValue = null) {
    const storageKey = this.getStorageKey(userId, key);
    if (!storageKey) return defaultValue;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null || raw === undefined) return defaultValue;
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`[userPreferenceStorage] Error reading "${storageKey}":`, error);
      return defaultValue;
    }
  },

  /**
   * Stores a preference for a specific user ID.
   * @param {string|number} userId
   * @param {string} key
   * @param {*} value
   */
  set(userId, key, value) {
    const storageKey = this.getStorageKey(userId, key);
    if (!storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      console.warn(`[userPreferenceStorage] Error saving "${storageKey}":`, error);
    }
  },

  /**
   * Removes a specific preference for a specific user ID.
   * @param {string|number} userId
   * @param {string} key
   */
  remove(userId, key) {
    const storageKey = this.getStorageKey(userId, key);
    if (!storageKey) return;

    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn(`[userPreferenceStorage] Error removing "${storageKey}":`, error);
    }
  },

  /**
   * Clears all preferences belonging to a specific user ID.
   * @param {string|number} userId
   */
  clearUser(userId) {
    if (!userId) return;
    const prefix = `${PREF_PREFIX}${userId}_`;

    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (error) {
      console.warn(`[userPreferenceStorage] Error clearing user preferences for "${userId}":`, error);
    }
  },

  /**
   * Clears ALL user preferences from localStorage (e.g. on logout or app reset).
   */
  clearAll() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREF_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (error) {
      console.warn("[userPreferenceStorage] Error clearing all user preferences:", error);
    }
  },
};
