export function FormModal({ title, onClose, onSubmit, submitLabel, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-lg border border-slate-200 p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button type="button" className="text-slate-500 text-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm text-slate-500 px-3 py-2">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-md">
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
