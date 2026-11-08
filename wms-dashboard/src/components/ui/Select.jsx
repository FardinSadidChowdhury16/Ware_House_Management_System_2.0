import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { inputCls } from "./inputCls.js";

function splitLayoutClasses(className = "") {
  const width = [];
  const rest = [];
  for (const part of className.split(/\s+/).filter(Boolean)) {
    if (/^(?:!)?(?:[\w-]+:)*(?:w-|min-w-|max-w-|shrink|grow|basis-)/.test(part)) width.push(part);
    else rest.push(part);
  }
  return {
    width: width.join(" ") || "w-full",
    rest: rest.join(" "),
  };
}

function normalizeOptions(options) {
  return options.map((option, index) => {
    if (typeof option === "string" || typeof option === "number") {
      const value = String(option);
      return { value, label: value, group: "", key: `${value}-${index}` };
    }
    const value = option?.value == null ? "" : String(option.value);
    const label = option?.label == null ? value : String(option.label);
    return {
      value,
      label,
      group: option?.group ? String(option.group) : "",
      key: `${value}-${label}-${index}`,
    };
  });
}

export function Select({
  value,
  onChange,
  options = [],
  placeholder,
  className = "",
  disabled = false,
  ...props
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const { width, rest } = splitLayoutClasses(className);
  const items = useMemo(() => {
    const normalized = normalizeOptions(options);
    if (placeholder && !normalized.some((item) => item.value === "")) {
      return [{ value: "", label: placeholder, group: "", key: "placeholder" }, ...normalized];
    }
    return normalized;
  }, [options, placeholder]);
  const currentValue = String(value ?? "");
  const selected = items.find((item) => item.value === currentValue);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      item.label.toLowerCase().includes(needle) || item.group.toLowerCase().includes(needle)
    );
  }, [items, query]);

  const placeMenu = () => {
    const node = rootRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const menuHeight = 280;
    const width = Math.max(rect.width, 180);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    setMenuStyle({
      position: "fixed",
      left: Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8)),
      width,
      zIndex: 80,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    setQuery("");
    setActiveIndex(Math.max(filtered.findIndex((item) => item.value === currentValue), 0));
    placeMenu();
    const onPointer = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onLayout = () => placeMenu();
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      window.clearTimeout(timer);
    };
  }, [open]);

  const choose = (next) => {
    onChange?.(next);
    setOpen(false);
  };

  const onSearchKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = filtered[activeIndex];
      if (item) choose(item.value);
    }
  };

  let lastGroup = "";

  return (
    <div ref={rootRef} className={`relative ${width}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={`${inputCls} flex items-center justify-between gap-2 text-left disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${rest}`}
        {...props}
      >
        <span className={`truncate ${selected ? "" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder || "Select"}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              className="rounded-md border border-slate-200 bg-white text-slate-800 shadow-lg overflow-hidden"
            >
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={onSearchKeyDown}
                    placeholder="Search..."
                    className="w-full border border-slate-200 rounded-md pl-7 pr-2 py-1.5 text-sm bg-white"
                  />
                </div>
              </div>
              <ul role="listbox" className="max-h-56 overflow-auto py-1">
                {filtered.length === 0 && (
                  <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
                )}
                {filtered.map((item, index) => {
                  const showGroup = Boolean(item.group) && item.group !== lastGroup;
                  if (item.group) lastGroup = item.group;
                  const isSelected = item.value === currentValue;
                  return (
                    <li key={item.key}>
                      {showGroup && (
                        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {item.group}
                        </div>
                      )}
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-2 ${
                          index === activeIndex ? "bg-slate-100" : "hover:bg-slate-50"
                        } ${isSelected ? "font-medium" : ""}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => choose(item.value)}
                      >
                        <span className="truncate">{item.label}</span>
                        {isSelected && <Check size={14} className="shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
