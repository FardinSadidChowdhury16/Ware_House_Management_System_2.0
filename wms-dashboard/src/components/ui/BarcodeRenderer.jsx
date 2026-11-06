import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/**
 * BarcodeRenderer
 * Renders a crisp, scannable Code-128 SVG barcode using JsBarcode.
 */
export function BarcodeRenderer({
  value,
  format = "CODE128",
  width = 1.6,
  height = 40,
  displayValue = false,
  fontSize = 12,
  font = "monospace",
  textMargin = 2,
  margin = 0,
  className = "",
  lineColor = "#0f172a",
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const barcodeValue = String(value || "").trim();
    if (!barcodeValue) return;

    try {
      JsBarcode(svgRef.current, barcodeValue, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        font,
        textMargin,
        margin,
        lineColor,
        background: "transparent",
        valid: () => {},
      });
    } catch (err) {
      console.warn("Invalid barcode value for JsBarcode:", barcodeValue, err);
    }
  }, [value, format, width, height, displayValue, fontSize, font, textMargin, margin, lineColor]);

  if (!value) {
    return <span className="text-slate-400 text-xs italic">No barcode</span>;
  }

  return (
    <svg
      ref={svgRef}
      className={`inline-block select-none ${className}`}
      aria-label={`Barcode: ${value}`}
    />
  );
}

export default BarcodeRenderer;
