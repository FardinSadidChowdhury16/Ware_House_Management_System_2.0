import React from "react";
import { BarcodeRenderer } from "./BarcodeRenderer";

export function MiniBarcode({ seed = "1234567890", height = 34, width = 1.3 }) {
  if (!seed) return null;
  return (
    <BarcodeRenderer
      value={seed}
      height={height}
      width={width}
      displayValue={false}
      className="max-h-full"
    />
  );
}

export default MiniBarcode;
