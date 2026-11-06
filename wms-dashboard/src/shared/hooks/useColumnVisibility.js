import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { userPreferenceStorage } from "../../core/storage/userPreferenceStorage.js";

const EMPTY_ARRAY = Object.freeze([]);

function areSetsEqual(setA, arrayOrSetB) {
  const setB = arrayOrSetB instanceof Set ? arrayOrSetB : new Set(arrayOrSetB);
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}

/**
 * Custom hook to manage user-scoped column visibility with persistent storage.
 *
 * Persists user preference per-profile as long as the user is logged in.
 * Cleared automatically upon logout and isolated across different user IDs.
 *
 * @param {Object} options
 * @param {string} options.tableKey - Unique identifier for the table (e.g. "product_items")
 * @param {Array<{ key: string, label: string }>} options.columns - Available columns list
 * @param {string|number|null} options.userId - Logged in user ID
 * @param {Array<string>} [options.defaultHiddenKeys=[]] - Default hidden column keys
 */
export function useColumnVisibility({
  tableKey,
  columns = EMPTY_ARRAY,
  userId = null,
  defaultHiddenKeys = EMPTY_ARRAY,
}) {
  const preferenceKey = `${tableKey}_hidden_columns`;
  const defaultHiddenKeysRef = useRef(defaultHiddenKeys);
  defaultHiddenKeysRef.current = defaultHiddenKeys;

  // Load initial hidden keys from user preference storage for this userId
  const [hiddenKeys, setHiddenKeys] = useState(() => {
    if (!userId) return new Set(defaultHiddenKeys);
    const saved = userPreferenceStorage.get(userId, preferenceKey, null);
    if (Array.isArray(saved)) {
      return new Set(saved);
    }
    return new Set(defaultHiddenKeys);
  });

  // When userId or preferenceKey changes (e.g. login/logout/switch user), reload user preferences safely
  useEffect(() => {
    if (!userId) {
      const def = defaultHiddenKeysRef.current;
      setHiddenKeys((prev) => (areSetsEqual(prev, def) ? prev : new Set(def)));
      return;
    }
    const saved = userPreferenceStorage.get(userId, preferenceKey, null);
    const target = Array.isArray(saved) ? saved : defaultHiddenKeysRef.current;
    setHiddenKeys((prev) => (areSetsEqual(prev, target) ? prev : new Set(target)));
  }, [userId, preferenceKey]);

  // Save to userPreferenceStorage whenever hiddenKeys changes
  const savePreferences = useCallback(
    (newHiddenSet) => {
      if (!userId) return;
      userPreferenceStorage.set(userId, preferenceKey, Array.from(newHiddenSet));
    },
    [userId, preferenceKey]
  );

  // Toggle a single column visibility
  const toggleColumn = useCallback(
    (colKey) => {
      setHiddenKeys((prev) => {
        const next = new Set(prev);
        if (next.has(colKey)) {
          // Column was hidden -> make it visible
          next.delete(colKey);
        } else {
          // Column was visible -> hide it, but ensure at least 1 column stays visible
          const currentVisibleCount = columns.filter((col) => !next.has(col.key)).length;
          if (currentVisibleCount <= 1) {
            // Cannot hide the last visible column
            return prev;
          }
          next.add(colKey);
        }

        savePreferences(next);
        return next;
      });
    },
    [columns, savePreferences]
  );

  // Show all available columns (reset hidden columns)
  const showAll = useCallback(() => {
    const emptySet = new Set();
    setHiddenKeys(emptySet);
    savePreferences(emptySet);
  }, [savePreferences]);

  // Reset to default columns
  const resetToDefault = useCallback(() => {
    const def = defaultHiddenKeysRef.current;
    const defaultSet = new Set(def);
    setHiddenKeys(defaultSet);
    if (userId) {
      if (def.length === 0) {
        userPreferenceStorage.remove(userId, preferenceKey);
      } else {
        userPreferenceStorage.set(userId, preferenceKey, def);
      }
    }
  }, [userId, preferenceKey]);

  // Helper to check if a specific column is visible
  const isColumnVisible = useCallback(
    (colKey) => !hiddenKeys.has(colKey),
    [hiddenKeys]
  );

  // Array of column objects that are currently visible
  const visibleColumns = useMemo(
    () => columns.filter((col) => !hiddenKeys.has(col.key)),
    [columns, hiddenKeys]
  );

  // Set of visible keys for O(1) checks
  const visibleKeys = useMemo(
    () => new Set(visibleColumns.map((c) => c.key)),
    [visibleColumns]
  );

  return {
    hiddenKeys,
    visibleKeys,
    visibleColumns,
    isColumnVisible,
    toggleColumn,
    showAll,
    resetToDefault,
  };
}
