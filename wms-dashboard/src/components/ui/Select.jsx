import { inputCls } from "./inputCls.js";

export function Select({ value, onChange, options = [], placeholder, className = "", disabled = false, ...props }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange && onChange(e.target.value)}
      disabled={disabled}
      className={`${inputCls} block w-full truncate cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {placeholder && (
        <option value="">
          {placeholder}
        </option>
      )}
      {options.map((o, idx) => {
        const val = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        return (
          <option key={val !== undefined && val !== null ? String(val) : idx} value={val}>
            {label}
          </option>
        );
      })}
    </select>
  );
}
