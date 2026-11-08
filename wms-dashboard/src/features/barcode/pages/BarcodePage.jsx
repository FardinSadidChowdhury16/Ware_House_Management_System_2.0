import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Barcode as BarcodeIcon,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Package,
  Layers,
  Printer,
  DollarSign,
  Tag,
  Check,
  X,
  Eye,
  Calendar,
  ChevronDown,
  ShieldCheck,
  Search,
} from "lucide-react";
import {
  Card,
  PrimaryButton,
  GhostButton,
  Badge,
  Th,
  Td,
  TextInput,
  Select,
  useToast,
  MiniBarcode,
  useConfirm,
} from "../../../components/ui/index.js";
import { BarcodeRenderer } from "../../../components/ui/BarcodeRenderer.jsx";
import { BarcodeSheetModal } from "../components/BarcodeSheetModal.jsx";
import { ViewBarcodeTab } from "../components/ViewBarcodeTab.jsx";
import { Field } from "../../../components/ui/Field.jsx";
import { useProducts } from "../../products/hooks/useProducts.js";
import { productsApi } from "../../products/api/productsApi.js";

const BARCODE_TABS = [
  { id: 1, label: "1. Select Product & Quantity" },
  { id: 2, label: "2. Configure & Generate Items" },
];

// ─── Mini MultiSelect for Tax Rules ──────────────────────────────────────────
function TaxMultiSelect({ taxRules, selectedIds = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedRules = (taxRules || []).filter((t) => selectedIds.includes(t.id));
  const visibleRules = (taxRules || []).filter((t) =>
    String(t.name || "").toLowerCase().includes(query.trim().toLowerCase())
  );
  const label =
    selectedRules.length === 0
      ? "Select tax rules"
      : selectedRules.map((t) => t.name).join(", ");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen((o) => !o);
        }}
        className="w-full flex items-center justify-between border border-slate-200 rounded-md px-3 py-2 text-xs text-left bg-white hover:border-slate-300 transition-colors"
      >
        <span className={selectedRules.length === 0 ? "text-slate-400" : "text-slate-800 truncate"}>
          {label}
        </span>
        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tax rules..."
              className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white"
            />
          </div>
          {(!taxRules || taxRules.length === 0) && (
            <p className="text-xs text-slate-400 px-3 py-2">No tax rules available</p>
          )}
          {taxRules?.length > 0 && visibleRules.length === 0 && (
            <p className="text-xs text-slate-400 px-3 py-2">No matches</p>
          )}
          {visibleRules.map((t) => {
            const checked = selectedIds.includes(t.id);
            return (
              <label
                key={t.id}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) onChange(selectedIds.filter((id) => id !== t.id));
                    else onChange([...selectedIds, t.id]);
                  }}
                  className="accent-slate-900 rounded"
                />
                <span>{t.name}</span>
                <span className="ml-auto text-[11px] text-slate-400">
                  {t.calc_type === "percentage" ? `${t.value}%` : `৳${t.value}`}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Section Label with horizontal rule divider ────────────────────────────
function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon size={13} className="text-slate-400" />}
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

export function BarcodePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { products, productTypes, taxRules, isLoading: isProductsLoading } = useProducts();

  // ── Primary Tab State: 'generate' | 'view' ──
  const activeMainTab = searchParams.get("tab") === "view" ? "view" : "generate";
  const handleMainTabChange = (tabKey) => {
    if (tabKey === "view") {
      setSearchParams({ tab: "view" });
    } else {
      setSearchParams({});
    }
  };

  // ── Step State for Generator ──
  // Step 1: Select Product & Quantity
  // Step 2: Configure Fields & Review Items
  const [currentStep, setCurrentStep] = useState(1);

  // ── Step 1 State ──
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(5);

  // ── Step 2 Fields State ──
  const [barcodeMode, setBarcodeMode] = useState("dynamic"); // 'dynamic' (auto-generates barcodes) | 'manual'
  const [nameTemplate, setNameTemplate] = useState("");
  const [defaultCostPrice, setDefaultCostPrice] = useState("");
  const [defaultSellingPrice, setDefaultSellingPrice] = useState("");
  const [defaultStatus, setDefaultStatus] = useState("active");
  const [defaultWarrantyStart, setDefaultWarrantyStart] = useState("");
  const [defaultWarrantyEnd, setDefaultWarrantyEnd] = useState("");
  const [defaultTaxRuleIds, setDefaultTaxRuleIds] = useState([]);
  const [defaultAttributes, setDefaultAttributes] = useState({}); // { [attrId]: value }

  // ── Generated Items Queue State ──
  const [items, setItems] = useState([]);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSummary, setCreatedSummary] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showQueueSheetModal, setShowQueueSheetModal] = useState(false);

  // Selected product object
  const selectedProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(selectedProductId)) || null;
  }, [products, selectedProductId]);

  // Selected product's category attributes (Extra fields)
  const categoryAttributes = useMemo(() => {
    if (!selectedProduct || !productTypes) return [];
    const cat = productTypes.find((t) => t.id === selectedProduct.category_id);
    return cat?.attributes || [];
  }, [selectedProduct, productTypes]);

  // When product changes, pre-fill intelligent Name defaults and reset category attributes
  useEffect(() => {
    if (selectedProduct) {
      setNameTemplate(`${selectedProduct.name} - Item`);
      setDefaultAttributes({});
    } else {
      setNameTemplate("");
      setDefaultAttributes({});
    }
  }, [selectedProduct]);

  // If products load and none selected, auto-select first product
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(String(products[0].id));
    }
  }, [products, selectedProductId]);

  // ── Transition: Proceed from Step 1 to Step 2 ──
  const handleProceedToStep2 = async () => {
    if (!selectedProduct) {
      toast.error("Please select a target product.");
      return;
    }
    const count = Math.max(1, Math.min(100, Number(quantity) || 1));
    setCurrentStep(2);

    // Auto-generate items preview if not generated yet or count changed
    if (items.length !== count) {
      await generatePreviewRows(count);
    }
  };

  // Helper to generate preview rows
  const generatePreviewRows = async (countToGen) => {
    if (!selectedProduct) return;
    const count = countToGen || Math.max(1, Math.min(100, Number(quantity) || 1));
    const startingIndex = (selectedProduct.variants?.length || 0) + 1;

    setIsGeneratingCodes(true);

    let generatedBarcodes = [];
    try {
      generatedBarcodes = await productsApi.generateBarcodes(count);
    } catch (err) {
      console.error("Barcode generation failed:", err);
    }

    const newRows = [];
    for (let i = 0; i < count; i++) {
      const idx = startingIndex + i;
      const name = `${nameTemplate ? nameTemplate.trim() : selectedProduct.name} #${idx}`;
      const barcode = generatedBarcodes[i] || "";

      newRows.push({
        id: `item-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        name,
        barcode,
        cost_price: defaultCostPrice ? Number(defaultCostPrice) : 0,
        selling_price: defaultSellingPrice ? Number(defaultSellingPrice) : 0,
        status: defaultStatus,
        warranty_start_date: defaultWarrantyStart || null,
        warranty_end_date: defaultWarrantyEnd || null,
        tax_rule_ids: [...defaultTaxRuleIds],
        attributes: { ...defaultAttributes },
      });
    }

    setItems(newRows);
    setIsGeneratingCodes(false);
  };

  // ── Live-Sync Handlers: Update Defaults and Automatically Apply to All Rows ──
  const handleDefaultNameTemplateChange = (val) => {
    setNameTemplate(val);
    const startingIndex = (selectedProduct?.variants?.length || 0) + 1;
    setItems((prev) =>
      prev.map((item, i) => ({
        ...item,
        name: `${val ? val.trim() : (selectedProduct?.name || "Item")} #${startingIndex + i}`,
      }))
    );
  };

  const handleDefaultCostPriceChange = (val) => {
    setDefaultCostPrice(val);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        cost_price: val,
      }))
    );
  };

  const handleDefaultSellingPriceChange = (val) => {
    setDefaultSellingPrice(val);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        selling_price: val,
      }))
    );
  };

  const handleDefaultTaxRulesChange = (newIds) => {
    setDefaultTaxRuleIds(newIds);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        tax_rule_ids: [...newIds],
      }))
    );
  };

  const handleDefaultStatusChange = (val) => {
    setDefaultStatus(val);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: val,
      }))
    );
  };

  const handleDefaultWarrantyStartChange = (val) => {
    setDefaultWarrantyStart(val);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        warranty_start_date: val || null,
      }))
    );
  };

  const handleDefaultWarrantyEndChange = (val) => {
    setDefaultWarrantyEnd(val);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        warranty_end_date: val || null,
      }))
    );
  };

  const handleDefaultAttributeChange = (attrId, val) => {
    setDefaultAttributes((prev) => ({ ...prev, [attrId]: val }));
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        attributes: {
          ...item.attributes,
          [attrId]: val,
        },
      }))
    );
  };

  // ── Duplicate Detection in Manual Mode ──
  const barcodeDuplicates = useMemo(() => {
    const counts = {};
    items.forEach((item) => {
      const code = (item.barcode || "").trim();
      if (code) {
        counts[code] = (counts[code] || 0) + 1;
      }
    });
    return Object.keys(counts).filter((code) => counts[code] > 1);
  }, [items]);

  // ── Switch Barcode Mode (Manual / Dynamic) ──
  const handleSelectBarcodeMode = async (mode) => {
    setBarcodeMode(mode);
    if (mode === "dynamic") {
      // Auto-generate barcodes for all items in queue when dynamic is selected
      if (items.length > 0) {
        setIsGeneratingCodes(true);
        try {
          const codes = await productsApi.generateBarcodes(items.length);
          setItems((prev) =>
            prev.map((item, i) => ({
              ...item,
              barcode: codes[i] || item.barcode,
            }))
          );
          toast.success("Dynamic barcodes generated for all items!");
        } catch (err) {
          console.error("Barcode generation failed:", err);
          toast.error("Failed to generate dynamic barcodes.");
        } finally {
          setIsGeneratingCodes(false);
        }
      }
    }
  };

  // ── Regenerate All Barcodes Dynamically ──
  const handleRegenerateAllBarcodes = async () => {
    if (items.length === 0) return;
    setIsGeneratingCodes(true);
    try {
      const codes = await productsApi.generateBarcodes(items.length);
      setItems((prev) =>
        prev.map((item, i) => ({
          ...item,
          barcode: codes[i] || item.barcode,
        }))
      );
      toast.success("Generated fresh dynamic barcodes for all items!");
    } catch {
      toast.error("Failed to generate barcodes. Please try again.");
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  // ── Refresh Single Row Barcode ──
  const handleRegenerateSingleBarcode = async (index) => {
    try {
      const newBarcode = await productsApi.generateBarcode();
      setItems((prev) =>
        prev.map((row, i) => (i === index ? { ...row, barcode: newBarcode } : row))
      );
    } catch {
      toast.error("Failed to generate barcode for this item.");
    }
  };

  // ── Row Modification Handlers ──
  const handleRowChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleRowAttributeChange = (index, attrId, value) => {
    setItems((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              attributes: {
                ...row.attributes,
                [attrId]: value,
              },
            }
          : row
      )
    );
  };

  const handleRemoveRow = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSingleRow = async () => {
    if (!selectedProduct) return;
    const idx = (selectedProduct.variants?.length || 0) + items.length + 1;
    const name = `${nameTemplate ? nameTemplate.trim() : selectedProduct.name} #${idx}`;

    let barcode = "";
    try {
      barcode = await productsApi.generateBarcode();
    } catch {}

    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name,
        barcode,
        cost_price: defaultCostPrice ? Number(defaultCostPrice) : 0,
        selling_price: defaultSellingPrice ? Number(defaultSellingPrice) : 0,
        status: defaultStatus,
        warranty_start_date: defaultWarrantyStart || null,
        warranty_end_date: defaultWarrantyEnd || null,
        tax_rule_ids: [...defaultTaxRuleIds],
        attributes: { ...defaultAttributes },
      },
    ]);
  };

  // ── Submit All Items to Backend ──
  const handleCreateBatch = async () => {
    if (!selectedProduct) {
      toast.error("Please select a target product.");
      return;
    }
    if (items.length === 0) {
      toast.error("No items in queue to create.");
      return;
    }

    // Validation: Duplicate barcodes in manual mode
    if (barcodeDuplicates.length > 0) {
      toast.error(`Duplicate barcode detected: ${barcodeDuplicates.join(", ")}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-fill any missing barcodes before submitting
      const missingCount = items.filter((it) => !(it.barcode || "").trim()).length;
      let filledItems = [...items];
      if (missingCount > 0) {
        try {
          const generated = await productsApi.generateBarcodes(missingCount);
          let genIdx = 0;
          filledItems = filledItems.map((it) => {
            if (!(it.barcode || "").trim()) {
              const code = generated[genIdx++];
              return { ...it, barcode: code || "" };
            }
            return it;
          });
          setItems(filledItems);
        } catch (err) {
          console.error("Auto barcode generation failed:", err);
        }
      }

      const payload = filledItems.map((row) => {
        const attribute_values = Object.entries(row.attributes || {})
          .filter(([_, val]) => val !== undefined && val !== null && String(val).trim() !== "")
          .map(([attrId, val]) => ({
            attribute_id: Number(attrId),
            value: String(val).trim(),
          }));

        return {
          sku: null,
          name: row.name ? row.name.trim() : null,
          barcode: row.barcode ? row.barcode.trim() : null,
          cost_price: Number(row.cost_price) || 0,
          selling_price: Number(row.selling_price) || 0,
          status: row.status || "active",
          warranty_start_date: row.warranty_start_date || null,
          warranty_end_date: row.warranty_end_date || null,
          tax_rule_ids: row.tax_rule_ids || [],
          attribute_values,
        };
      });

      const created = await productsApi.createVariantsBatch(
        Number(selectedProduct.id),
        payload
      );

      // Invalidate queries so that ViewBarcodeTab, products, and inventory instantly auto-update!
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["serialized-items"] });

      toast.success(
        `Successfully created ${created.length || items.length} items for ${selectedProduct.name}!`
      );
      setCreatedSummary({
        product: selectedProduct,
        items: created.length ? created : items,
        timestamp: new Date().toLocaleString(),
      });
      setItems([]);
      setCurrentStep(1); // Return to step 1 for new batches
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to create batch items.";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate Batch Statistics
  const batchStats = useMemo(() => {
    const totalCost = items.reduce((sum, it) => sum + (Number(it.cost_price) || 0), 0);
    const totalSales = items.reduce((sum, it) => sum + (Number(it.selling_price) || 0), 0);
    const validBarcodesCount = items.filter((it) => (it.barcode || "").trim().length > 0).length;
    return { totalCost, totalSales, validBarcodesCount };
  }, [items]);
  // Column group count for table header spanning
  const extraAttrCount = categoryAttributes.length;

  return (
    <div className="space-y-6">
      {/* ── Left-Aligned Mode Options (Generate Barcode / View Barcode) ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => handleMainTabChange("generate")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeMainTab === "generate"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
          }`}
        >
          <BarcodeIcon size={16} />
          <span>Generate Barcode</span>
        </button>

        <button
          type="button"
          onClick={() => handleMainTabChange("view")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeMainTab === "view"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
          }`}
        >
          <Eye size={16} />
          <span>View Barcode</span>
        </button>
      </div>

      {/* ── VIEW BARCODE TAB ── */}
      {activeMainTab === "view" ? (
        <ViewBarcodeTab />
      ) : (
        /* ── GENERATE BARCODES FLOW ── */
        <div className="space-y-6">

      {/* ── STEP 1: SELECT PRODUCT & VARIANT QUANTITY ── */}
      {currentStep === 1 && (
        <Card className="max-w-3xl">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Select Product &amp; Item Quantity
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the target product and specify how many items you want to create.
            </p>
          </div>

          <div className="p-5 space-y-5">
            {/* 1. Target Product Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Target Product <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedProductId}
                onChange={setSelectedProductId}
                disabled={isProductsLoading}
                placeholder={products.length === 0 ? "No products available" : "Select a product"}
                options={products.map((p) => ({
                  value: String(p.id),
                  label: `${p.name} — ${p.variants?.length || 0} existing items`,
                }))}
              />

              {/* Product Info Card Preview */}
              {selectedProduct && (
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-100 text-xs text-slate-600 mt-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <Package size={14} className="text-slate-500" />
                    <span>{selectedProduct.name}</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <span>Category: <strong className="text-slate-800">{selectedProduct.category}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>Tracking: <strong className="text-slate-800">{selectedProduct.tracking}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>Current Items: <strong className="text-slate-900">{selectedProduct.variants?.length || 0}</strong></span>
                </div>
              )}
            </div>

            {/* 2. Number of Variants Selector */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                Number of Items to Create <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-28 border border-slate-200 rounded-md px-3 py-2 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <span className="text-xs text-slate-500 font-medium">Items</span>
              </div>
              <p className="text-xs text-slate-400">
                Type how many items you want to generate under this product.
              </p>
            </div>

            {/* Next Step Action Button */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <PrimaryButton
                onClick={handleProceedToStep2}
                disabled={!selectedProduct}
                icon={ArrowRight}
              >
                Continue to Configure
              </PrimaryButton>
            </div>
          </div>
        </Card>
      )}

      {/* ── STEP 2: CONFIGURE FIELDS & UPDATE VALUES ── */}
      {currentStep === 2 && (
        <div className="space-y-4">
          {/* Top-Left Back Action: Change Product / Quantity */}
          <div className="flex items-center">
            <GhostButton icon={ArrowLeft} onClick={() => setCurrentStep(1)}>
              Change Product / Quantity
            </GhostButton>
          </div>

          {/* Active Product & Count Summary Header Bar */}
          <Card className="p-3.5">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Badge color={selectedProduct?.tracking === "Serialized" ? "blue" : "slate"}>
                {selectedProduct?.tracking || "Product"}
              </Badge>
              <span className="font-semibold text-slate-900 text-sm">{selectedProduct?.name}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Creating: <strong className="text-slate-900">{items.length || quantity} Items</strong></span>
              {categoryAttributes.length > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">{categoryAttributes.length} extra attribute{categoryAttributes.length > 1 ? "s" : ""}</span>
                </>
              )}
            </div>
          </Card>

          {/* Configuration Form Card for Fields */}
          <Card>
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                Default Values
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Set default values to live-update all rows in the table, or edit individual rows directly below.
              </p>
            </div>

            <div className="p-5 space-y-5">

              {/* ── Section 1: Barcode & Identity ── */}
              <div>
                <SectionLabel icon={BarcodeIcon} label="Barcode & Identity" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Barcode Mode */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Barcode Mode <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectBarcodeMode("manual")}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                          barcodeMode === "manual"
                            ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs">
                          <span>✏️ Manual</span>
                        </div>
                        <span className={`text-[10px] mt-0.5 ${barcodeMode === "manual" ? "text-slate-300" : "text-slate-400"}`}>
                          Custom / Type
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={isGeneratingCodes}
                        onClick={() => handleSelectBarcodeMode("dynamic")}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                          barcodeMode === "dynamic"
                            ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs">
                          {isGeneratingCodes ? (
                            <RefreshCw size={13} className="animate-spin text-amber-400" />
                          ) : (
                            <span>⚡ Dynamic</span>
                          )}
                        </div>
                        <span className={`text-[10px] mt-0.5 ${barcodeMode === "dynamic" ? "text-slate-300" : "text-slate-400"}`}>
                          {isGeneratingCodes ? "Generating..." : "Auto Generate"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Name Template */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">Name Template</label>
                    <input
                      type="text"
                      value={nameTemplate}
                      onChange={(e) => handleDefaultNameTemplateChange(e.target.value)}
                      placeholder="e.g. Item Name"
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <span className="text-[10px] text-slate-400">Generates: {nameTemplate || "Item"} #1, #2...</span>
                  </div>
                </div>
              </div>

              {/* ── Section 2: Pricing, Tax & Status ── */}
              <div className="pt-4 border-t border-slate-100">
                <SectionLabel icon={DollarSign} label="Pricing, Tax & Status" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Cost Price</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs text-slate-400 pointer-events-none select-none">৳</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={defaultCostPrice}
                        onChange={(e) => handleDefaultCostPriceChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-slate-200 rounded-md pl-6 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Selling Price</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs text-slate-400 pointer-events-none select-none">৳</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={defaultSellingPrice}
                        onChange={(e) => handleDefaultSellingPriceChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-slate-200 rounded-md pl-6 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono font-semibold text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Tax Rules</label>
                    <TaxMultiSelect
                      taxRules={taxRules}
                      selectedIds={defaultTaxRuleIds}
                      onChange={handleDefaultTaxRulesChange}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Status</label>
                    <Select
                      value={defaultStatus}
                      onChange={handleDefaultStatusChange}
                      options={[
                        { value: "active", label: "Active" },
                        { value: "inactive", label: "Inactive" },
                      ]}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 3: Warranty Period ── */}
              <div className="pt-4 border-t border-slate-100">
                <SectionLabel icon={ShieldCheck} label="Warranty Period" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs max-w-sm">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">From</label>
                    <input
                      type="date"
                      value={defaultWarrantyStart}
                      onChange={(e) => handleDefaultWarrantyStartChange(e.target.value)}
                      className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">To</label>
                    <input
                      type="date"
                      value={defaultWarrantyEnd}
                      onChange={(e) => handleDefaultWarrantyEndChange(e.target.value)}
                      className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 4: Category Extra Fields (Dynamic Attributes) ── */}
              {categoryAttributes.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <SectionLabel icon={Tag} label={`Category Attributes — ${selectedProduct?.category}`} />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
                    {categoryAttributes.map((attr) => {
                      const label = `${attr.field_label}${attr.unit ? ` (${attr.unit})` : ""}`;
                      const val = defaultAttributes[attr.id] || "";

                      if (attr.field_type === "boolean") {
                        return (
                          <div key={attr.id} className="space-y-1">
                            <label className="block text-slate-600 font-medium">{label}</label>
                            <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs">
                              {["Yes", "No"].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleDefaultAttributeChange(attr.id, opt)}
                                  className={`flex-1 py-1 text-xs font-medium transition-colors ${
                                    val === opt
                                      ? "bg-slate-900 text-white"
                                      : "bg-white text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (attr.field_type === "select" && attr.options?.length > 0) {
                        return (
                          <div key={attr.id} className="space-y-1">
                            <label className="block text-slate-600 font-medium">{label}</label>
                            <Select
                              value={val}
                              onChange={(next) => handleDefaultAttributeChange(attr.id, next)}
                              placeholder="Select option"
                              options={attr.options.map((opt) => ({ value: opt, label: opt }))}
                              className="text-xs"
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={attr.id} className="space-y-1">
                          <label className="block text-slate-600 font-medium">{label}</label>
                          <input
                            type={attr.field_type === "number" ? "number" : "text"}
                            value={val}
                            onChange={(e) => handleDefaultAttributeChange(attr.id, e.target.value)}
                            placeholder={`e.g. ${attr.field_label}`}
                            className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Interactive Table Grid for the Items */}
          <Card className="overflow-hidden">
            {/* Header of Table */}
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Items ({items.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Edit any field directly in the table. Each row creates one item.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {barcodeMode === "dynamic" && (
                  <GhostButton
                    icon={RefreshCw}
                    onClick={handleRegenerateAllBarcodes}
                    disabled={isGeneratingCodes}
                  >
                    Regenerate Barcodes
                  </GhostButton>
                )}

                <GhostButton
                  icon={Printer}
                  onClick={() => setShowQueueSheetModal(true)}
                  disabled={items.length === 0}
                >
                  Barcode Sheet ({items.length})
                </GhostButton>

                <PrimaryButton icon={Plus} onClick={handleAddSingleRow}>
                  Add Row
                </PrimaryButton>
              </div>
            </div>

            {/* Quick Summary Strip */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-4">
                <span>Items: <strong className="text-slate-900">{items.length}</strong></span>
                <span>•</span>
                <span>
                  Barcodes Ready:{" "}
                  <strong className={batchStats.validBarcodesCount === items.length ? "text-slate-900" : "text-amber-600"}>
                    {batchStats.validBarcodesCount} / {items.length}
                  </strong>
                </span>
                <span>•</span>
                <span>Total Cost: <strong className="text-slate-900">৳{batchStats.totalCost.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Total Retail: <strong className="text-slate-900">৳{batchStats.totalSales.toLocaleString()}</strong></span>
              </div>

              {barcodeDuplicates.length > 0 && (
                <div className="flex items-center gap-1.5 text-red-600 font-semibold">
                  <AlertTriangle size={14} />
                  <span>Duplicate barcodes found: {barcodeDuplicates.join(", ")}</span>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  {/* ── Group label row ── */}
                  <tr className="bg-slate-200/60 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-3 py-1.5 text-center w-10 border-r border-slate-300" rowSpan={2}>#</th>
                    <th className="px-3 py-1.5 text-center border-r border-slate-300" colSpan={2}>
                      🏷 Identity
                    </th>
                    <th className="px-3 py-1.5 text-center border-r border-slate-300" colSpan={2}>
                      💰 Pricing (৳)
                    </th>
                    {extraAttrCount > 0 && (
                      <th className="px-3 py-1.5 text-center border-r border-slate-300" colSpan={extraAttrCount}>
                        📦 {selectedProduct?.category}
                      </th>
                    )}
                    <th className="px-3 py-1.5 text-center border-r border-slate-300" colSpan={3}>
                      📋 Details
                    </th>
                    <th className="px-3 py-1.5 text-center" colSpan={2}>
                      ⚙ Options
                    </th>
                  </tr>

                  {/* ── Column header row ── */}
                  <tr className="bg-slate-100/80 text-slate-600 border-b-2 border-slate-200">
                    <th className="px-3 py-2 font-semibold min-w-[160px]">Name</th>
                    <th className="px-3 py-2 font-semibold min-w-[180px] border-r border-slate-200">
                      Barcode ({barcodeMode === "dynamic" ? "EAN-13" : "Manual"}) *
                    </th>
                    <th className="px-3 py-2 font-semibold min-w-[135px]">Cost (৳)</th>
                    <th className="px-3 py-2 font-semibold min-w-[135px] border-r border-slate-200">Price (৳)</th>

                    {categoryAttributes.map((attr, i) => (
                      <th
                        key={attr.id}
                        className={`px-3 py-2 font-semibold min-w-[110px]${i === extraAttrCount - 1 ? " border-r border-slate-200" : ""}`}
                      >
                        {attr.field_label}
                        {attr.unit && <span className="text-slate-400 font-normal"> ({attr.unit})</span>}
                      </th>
                    ))}

                    <th className="px-3 py-2 font-semibold min-w-[130px]">Warranty From</th>
                    <th className="px-3 py-2 font-semibold min-w-[130px]">Warranty To</th>
                    <th className="px-3 py-2 font-semibold min-w-[140px] border-r border-slate-200">Tax Rules</th>
                    <th className="px-3 py-2 font-semibold w-24">Status</th>
                    <th className="px-3 py-2 font-semibold w-12 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, idx) => {
                    const isDuplicate = row.barcode && barcodeDuplicates.includes(row.barcode.trim());

                    return (
                      <tr key={row.id} className={`transition-colors ${idx % 2 === 0 ? "bg-white hover:bg-slate-50/60" : "bg-slate-50/30 hover:bg-slate-50"}`}>
                        {/* Row index */}
                        <td className="px-3 py-2.5 text-center text-slate-400 font-mono font-medium border-r border-slate-100">
                          {idx + 1}
                        </td>

                        {/* Name */}
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleRowChange(idx, "name", e.target.value)}
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </td>

                        {/* Barcode — right border = end of Identity group */}
                        <td className="px-3 py-2.5 border-r border-slate-100">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  value={row.barcode}
                                  onChange={(e) => handleRowChange(idx, "barcode", e.target.value.trim())}
                                  placeholder={barcodeMode === "dynamic" ? "Auto-generating..." : "Type barcode"}
                                  className={`w-full border rounded px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 transition-colors ${
                                    isDuplicate
                                      ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-400"
                                      : "border-slate-200 bg-white text-slate-800 focus:ring-slate-400"
                                  }`}
                                />
                                {isDuplicate && (
                                  <span className="block text-[9px] text-red-500 mt-0.5">
                                    Duplicate!
                                  </span>
                                )}
                              </div>

                              {barcodeMode === "dynamic" && (
                                <button
                                  type="button"
                                  onClick={() => handleRegenerateSingleBarcode(idx)}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors shrink-0"
                                  title="Regenerate single barcode"
                                >
                                  <RefreshCw size={13} />
                                </button>
                              )}
                            </div>

                            {/* Live Barcode Bar Visualization */}
                            {row.barcode ? (
                              <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1 flex items-center justify-between">
                                <BarcodeRenderer
                                  value={row.barcode}
                                  height={22}
                                  width={1.2}
                                  displayValue={false}
                                />
                                <span className="font-mono text-[10px] text-slate-500 font-semibold ml-2">
                                  {row.barcode}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </td>

                        {/* Cost Price */}
                        <td className="px-3 py-2.5">
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-xs text-slate-400 pointer-events-none select-none">৳</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.cost_price}
                              onChange={(e) => handleRowChange(idx, "cost_price", e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-slate-200 rounded pl-6 pr-2 py-1 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                        </td>

                        {/* Selling Price — right border = end of Pricing group */}
                        <td className="px-3 py-2.5 border-r border-slate-100">
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-xs text-slate-400 pointer-events-none select-none">৳</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.selling_price}
                              onChange={(e) => handleRowChange(idx, "selling_price", e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-slate-200 rounded pl-6 pr-2 py-1 text-xs font-mono font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                        </td>

                        {/* Category Dynamic Attributes Columns */}
                        {categoryAttributes.map((attr, attrIdx) => {
                          const val = row.attributes?.[attr.id] ?? "";
                          const isLastAttr = attrIdx === extraAttrCount - 1;
                          const cellClass = `px-3 py-2.5${isLastAttr ? " border-r border-slate-100" : ""}`;

                          if (attr.field_type === "select" && attr.options?.length > 0) {
                            return (
                              <td key={attr.id} className={cellClass}>
                                <Select
                                  value={val}
                                  onChange={(next) => handleRowAttributeChange(idx, attr.id, next)}
                                  placeholder="—"
                                  options={attr.options.map((opt) => ({ value: opt, label: opt }))}
                                  className="text-xs py-1"
                                />
                              </td>
                            );
                          }

                          if (attr.field_type === "boolean") {
                            return (
                              <td key={attr.id} className={cellClass}>
                                <Select
                                  value={val}
                                  onChange={(next) => handleRowAttributeChange(idx, attr.id, next)}
                                  placeholder="—"
                                  options={[
                                    { value: "Yes", label: "Yes" },
                                    { value: "No", label: "No" },
                                  ]}
                                  className="text-xs py-1"
                                />
                              </td>
                            );
                          }

                          return (
                            <td key={attr.id} className={cellClass}>
                              <input
                                type={attr.field_type === "number" ? "number" : "text"}
                                value={val}
                                onChange={(e) => handleRowAttributeChange(idx, attr.id, e.target.value)}
                                placeholder="—"
                                className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                              />
                            </td>
                          );
                        })}

                        {/* Warranty From */}
                        <td className="px-3 py-2.5">
                          <input
                            type="date"
                            value={row.warranty_start_date || ""}
                            onChange={(e) => handleRowChange(idx, "warranty_start_date", e.target.value)}
                            className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </td>

                        {/* Warranty To */}
                        <td className="px-3 py-2.5">
                          <input
                            type="date"
                            value={row.warranty_end_date || ""}
                            onChange={(e) => handleRowChange(idx, "warranty_end_date", e.target.value)}
                            className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </td>

                        {/* Tax Rules — right border = end of Details group */}
                        <td className="px-3 py-2.5 border-r border-slate-100">
                          <TaxMultiSelect
                            taxRules={taxRules}
                            selectedIds={row.tax_rule_ids || []}
                            onChange={(ids) => handleRowChange(idx, "tax_rule_ids", ids)}
                          />
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5">
                          <Select
                            value={row.status}
                            onChange={(next) => handleRowChange(idx, "status", next)}
                            options={[
                              { value: "active", label: "Active" },
                              { value: "inactive", label: "Inactive" },
                            ]}
                            className={`text-[11px] font-semibold py-1 ${
                              row.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          />
                        </td>

                        {/* Action: Delete */}
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>
                  Ready to save <strong>{items.length}</strong> items for{" "}
                  <strong className="text-slate-900">{selectedProduct?.name}</strong>.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <GhostButton onClick={() => setCurrentStep(1)}>
                  Change Product / Quantity
                </GhostButton>
                <PrimaryButton
                  onClick={handleCreateBatch}
                  disabled={isSubmitting || barcodeDuplicates.length > 0}
                  icon={Check}
                >
                  {isSubmitting ? (
                    `Creating ${items.length} Items...`
                  ) : (
                    `Create All ${items.length} Items`
                  )}
                </PrimaryButton>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Success Summary Card ── */}
      {createdSummary && (
        <Card className="p-5 mb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Batch Successfully Created
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Added <strong>{createdSummary.items.length} items</strong> to product{" "}
                  <strong>{createdSummary.product.name}</strong> on{" "}
                  {createdSummary.timestamp}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <PrimaryButton icon={Printer} onClick={() => setShowPrintModal(true)}>
                View &amp; Print Barcode Sheet
              </PrimaryButton>
              <GhostButton icon={BarcodeIcon} onClick={() => handleMainTabChange("view")}>
                Open in View Barcode
              </GhostButton>
              <GhostButton icon={Eye} onClick={() => navigate("/products")}>
                View in Products
              </GhostButton>
            </div>
          </div>

          {/* Quick list of generated items with barcodes */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {createdSummary.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-800 truncate">
                    {item.name || "Item"}
                  </span>
                  <div className="my-1.5 flex items-center justify-start overflow-hidden">
                    <BarcodeRenderer
                      value={item.barcode || "123456789012"}
                      height={24}
                      width={1.2}
                      displayValue={false}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-700">
                    <span className="font-semibold">{item.barcode || "No Barcode"}</span>
                    <span className="text-slate-900 font-bold">৳{Number(item.selling_price || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
        </div>
      )}

      {/* ── Printable Barcode Labels Modal (After Batch Creation) ── */}
      <BarcodeSheetModal
        isOpen={showPrintModal && !!createdSummary}
        onClose={() => setShowPrintModal(false)}
        productName={createdSummary?.product?.name || "Product"}
        items={createdSummary?.items || []}
      />

      {/* ── Printable Barcode Labels Modal (During Item Queue / Draft) ── */}
      <BarcodeSheetModal
        isOpen={showQueueSheetModal}
        onClose={() => setShowQueueSheetModal(false)}
        productName={selectedProduct?.name || "Product"}
        items={items}
      />
    </div>
  );
}
