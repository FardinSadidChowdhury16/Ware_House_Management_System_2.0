import { X } from "lucide-react";
import { Field } from "../../components/ui/Field.jsx";
import { inputCls } from "../../components/ui/inputCls.js";
import { getAvailableUnits } from "../utils/wmsHelpers.js";

export function SerialPicker({ productName, warehouse, value, onChange, helperText }) {
  const available = getAvailableUnits(productName, warehouse);

  const toggle = (serial) => {
    onChange(value.includes(serial) ? value.filter((s) => s !== serial) : [...value, serial]);
  };

  const addFromText = (text) => {
    const parsed = text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    onChange([...new Set([...value, ...parsed])]);
  };

  return (
    <div>
      <Field label="Serial numbers to move">
        {available.length > 0 ? (
          <div className="mb-2">
            <p className="text-xs text-slate-500 mb-1.5">Available in {warehouse}</p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto border border-slate-100 rounded-md p-2">
              {available.map((u) => (
                <button
                  key={u.serial}
                  type="button"
                  onClick={() => toggle(u.serial)}
                  className={`text-xs wms-mono px-2 py-1 rounded-md border transition-colors ${value.includes(u.serial) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
                >
                  {u.serial}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 mb-2">No in-stock units at this warehouse — scan or type IDs manually.</p>
        )}
        <textarea
          placeholder={"SN-88041\nSN-88213"}
          rows={3}
          className={`${inputCls} wms-mono resize-y`}
          onBlur={(e) => addFromText(e.target.value)}
        />
        <p className="text-xs text-slate-400 mt-1">{helperText || "Select from list or scan/type serial numbers."}</p>
        {value.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {value.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 text-xs wms-mono bg-slate-100 px-2 py-0.5 rounded">
                {s}
                <button type="button" onClick={() => toggle(s)} className="text-slate-400 hover:text-red-500"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </Field>
    </div>
  );
}
