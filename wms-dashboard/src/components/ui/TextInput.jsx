import { inputCls } from "./inputCls.js";

export function TextInput({ value, onChange, placeholder, mono = false, className = "", ...props }) {
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputCls} block w-full ${mono ? "wms-mono" : ""} ${className}`}
      {...props}
    />
  );
}
