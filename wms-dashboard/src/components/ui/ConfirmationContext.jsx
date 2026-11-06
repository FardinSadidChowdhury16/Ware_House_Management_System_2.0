import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { ConfirmationDialog } from "./ConfirmationDialog.jsx";

const ConfirmationContext = createContext(null);

export function ConfirmationProvider({ children }) {
  const [config, setConfig] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfig({
        title: options.title || "Confirm Action",
        message: options.message || "Are you sure you want to proceed?",
        details: options.details || null,
        confirmText: options.confirmText || "Yes, Confirm",
        cancelText: options.cancelText || "Cancel",
        variant: options.variant || "primary", // 'danger' | 'warning' | 'primary' | 'success'
      });
    });
  }, []);

  const handleClose = (result) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setConfig(null);
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {config && (
        <ConfirmationDialog
          config={config}
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
        />
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmationProvider");
  }
  return context;
}

