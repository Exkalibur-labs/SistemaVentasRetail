"use client";

import { useRef, useState } from "react";
import { useBarcodeScanner } from "@/lib/hardware/use-barcode-scanner";
import { formatCents } from "@/lib/money";

interface Warehouse {
  id: string;
  name: string;
  branchName: string;
}

interface ProductInfo {
  variantId: string;
  productId: string;
  name: string;
  variantName?: string | null;
  sku: string;
  price: number;
  cost?: number | null;
  trackStock: boolean;
  categoryName?: string | null;
  barcodes: string[];
  onHand: number;
  warehouseId?: string;
}

interface ScanLogItem {
  id: string;
  barcode: string;
  name: string;
  quantityAdded: number;
  newStock: number;
  price: number;
  timestamp: Date;
}

export function InventoryScannerView({
  warehouses,
  defaultWarehouseId,
  currency = "MXN",
}: {
  warehouses: Warehouse[];
  defaultWarehouseId: string;
  currency?: string;
}) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(defaultWarehouseId);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<ProductInfo | null>(null);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);

  // Campos para sumar stock a producto existente
  const [addQty, setAddQty] = useState<number>(1);
  const [newPrice, setNewPrice] = useState<string>("");
  const [submittingStock, setSubmittingStock] = useState(false);

  // Campos para alta rápida de producto nuevo
  const [newName, setNewName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductQty, setNewProductQty] = useState(1);
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Mensajes de feedback
  const [statusMsg, setStatusMsg] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanLogItem[]>([]);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Búsqueda por código
  const handleLookup = async (code: string) => {
    const term = code.trim();
    if (!term) return;

    setSearching(true);
    setStatusMsg(null);
    setCurrentProduct(null);
    setUnknownBarcode(null);

    try {
      const res = await fetch(`/api/v1/inventory/quick?q=${encodeURIComponent(term)}&warehouseId=${selectedWarehouseId}`);
      const data = await res.json();

      if (!res.ok) {
        setStatusMsg({ text: data.error?.message || "Error al buscar el código.", tone: "error" });
        return;
      }

      if (data.found && data.product) {
        setCurrentProduct(data.product);
        setNewPrice((data.product.price / 100).toFixed(2));
        setAddQty(1);
        setStatusMsg({ text: `Producto encontrado: ${data.product.name}`, tone: "success" });
      } else {
        setUnknownBarcode(term);
        setNewName("");
        setNewProductPrice("");
        setNewProductQty(1);
        setStatusMsg({ text: `Código ${term} no registrado. Puedes darlo de alta rápido abajo.`, tone: "info" });
      }
    } catch {
      setStatusMsg({ text: "Error de red al consultar producto.", tone: "error" });
    } finally {
      setSearching(false);
      setBarcodeInput("");
    }
  };

  // Escucha activa de pistola Znemaz (captura global por ráfagas HID)
  useBarcodeScanner({
    onScan: (scannedCode) => {
      handleLookup(scannedCode);
    },
    enabled: true,
    audioFeedback: true,
  });

  // Guardar entrada de stock a producto existente
  const handleAddStock = async () => {
    if (!currentProduct || addQty <= 0) return;

    setSubmittingStock(true);
    setStatusMsg(null);

    try {
      const priceInCents = newPrice ? Math.round(parseFloat(newPrice) * 100) : undefined;
      const res = await fetch("/api/v1/inventory/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_stock",
          variantId: currentProduct.variantId,
          warehouseId: selectedWarehouseId,
          quantity: addQty,
          unitPrice: priceInCents,
          reason: "Entrada rápida con escáner Znemaz",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ text: data.error?.message || "Error al actualizar stock.", tone: "error" });
        return;
      }

      const updatedOnHand = data.newOnHand;
      const appliedPrice = priceInCents ?? currentProduct.price;

      // Agregar al historial
      setScanHistory((prev) => [
        {
          id: Math.random().toString(),
          barcode: currentProduct.barcodes[0] || currentProduct.sku,
          name: currentProduct.name,
          quantityAdded: addQty,
          newStock: updatedOnHand,
          price: appliedPrice,
          timestamp: new Date(),
        },
        ...prev.slice(0, 19),
      ]);

      setStatusMsg({
        text: `✓ Agregadas +${addQty} unidades de "${currentProduct.name}". Nueva existencia: ${updatedOnHand}`,
        tone: "success",
      });

      // Limpiar producto para el siguiente escaneo
      setCurrentProduct(null);
      barcodeInputRef.current?.focus();
    } catch {
      setStatusMsg({ text: "Error de red al registrar stock.", tone: "error" });
    } finally {
      setSubmittingStock(false);
    }
  };

  // Guardar alta rápida de producto nuevo
  const handleCreateProduct = async () => {
    if (!unknownBarcode || !newName.trim() || !newProductPrice) return;

    setCreatingProduct(true);
    setStatusMsg(null);

    try {
      const priceCents = Math.round(parseFloat(newProductPrice) * 100);
      if (isNaN(priceCents) || priceCents <= 0) {
        setStatusMsg({ text: "El precio debe ser un número válido mayor a 0.", tone: "error" });
        return;
      }

      const res = await fetch("/api/v1/inventory/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_product",
          barcode: unknownBarcode,
          name: newName.trim(),
          price: priceCents,
          quantity: newProductQty,
          warehouseId: selectedWarehouseId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ text: data.error?.message || "Error al crear producto.", tone: "error" });
        return;
      }

      setScanHistory((prev) => [
        {
          id: Math.random().toString(),
          barcode: unknownBarcode,
          name: newName.trim(),
          quantityAdded: newProductQty,
          newStock: newProductQty,
          price: priceCents,
          timestamp: new Date(),
        },
        ...prev.slice(0, 19),
      ]);

      setStatusMsg({
        text: `✓ Producto "${newName.trim()}" creado exitosamente con ${newProductQty} piezas.`,
        tone: "success",
      });

      setUnknownBarcode(null);
      barcodeInputRef.current?.focus();
    } catch {
      setStatusMsg({ text: "Error de red al crear producto.", tone: "error" });
    } finally {
      setCreatingProduct(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      {/* Columna Izquierda: Escáner y Acción Rápida */}
      <div className="space-y-4">
        {/* Selector de Almacén y Barra de Escaneo Manual/Pistola */}
        <div className="rounded-2xl border border-app bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-fg">Lector de Códigos Znemaz</h2>
              <p className="text-xs text-muted">
                Pistola lista. Escanea cualquier código o escribe manualmente abajo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted uppercase">Almacén:</span>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="h-9 rounded-lg border border-app bg-bg px-3 text-xs font-medium text-fg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.branchName} · {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup(barcodeInput);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Escanea con pistola Znemaz o escribe código / SKU..."
                disabled={searching}
                className="h-14 w-full rounded-xl border-2 border-primary/40 bg-bg px-4 font-mono text-base font-semibold text-fg placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              {searching && (
                <div className="absolute right-4 top-4 text-xs font-medium text-primary animate-pulse">
                  Consultando...
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={searching || !barcodeInput.trim()}
              className="h-14 rounded-xl bg-primary px-6 font-semibold text-primary-fg shadow transition hover:opacity-95 disabled:opacity-50"
            >
              Buscar
            </button>
          </form>

          {/* Feedback de estado */}
          {statusMsg && (
            <div
              className={`mt-4 rounded-xl p-3 text-sm font-medium ${
                statusMsg.tone === "success"
                  ? "border border-success/20 bg-success/10 text-success"
                  : statusMsg.tone === "error"
                  ? "border border-danger/20 bg-danger/10 text-danger"
                  : "border border-primary/20 bg-primary/10 text-primary"
              }`}
            >
              {statusMsg.text}
            </div>
          )}
        </div>

        {/* Tarjeta de Producto Encontrado: Sumar Stock / Ajustar Precio */}
        {currentProduct && (
          <div className="rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-md animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-app pb-4">
              <div>
                <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {currentProduct.categoryName || "Abarrotes"}
                </span>
                <h3 className="mt-1 text-xl font-bold text-fg">{currentProduct.name}</h3>
                <p className="font-mono text-xs text-muted">
                  SKU: {currentProduct.sku} · Códigos: {currentProduct.barcodes.join(", ") || "Sin código"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted">Existencia Actual</span>
                <div className="text-2xl font-black text-fg">{currentProduct.onHand} pzas</div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {/* Botones de incremento táctil rápido */}
              <div>
                <label className="text-xs font-bold uppercase text-muted">Cantidad a ingresar</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {[1, 5, 10, 12, 24].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAddQty(n)}
                      className={`h-11 rounded-xl px-4 text-sm font-bold transition ${
                        addQty === n
                          ? "bg-primary text-primary-fg shadow"
                          : "border border-app bg-bg text-fg hover:border-primary/50"
                      }`}
                    >
                      +{n}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    value={addQty}
                    onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-11 w-24 rounded-xl border border-app bg-bg px-3 text-center text-sm font-bold text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Precio de venta */}
              <div>
                <label className="text-xs font-bold uppercase text-muted">Precio de venta ({currency})</label>
                <div className="relative mt-1.5 max-w-xs">
                  <span className="absolute left-3.5 top-2.5 font-bold text-muted">$</span>
                  <input
                    type="number"
                    step="0.50"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="h-11 w-full rounded-xl border border-app bg-bg pl-8 pr-4 font-mono text-base font-bold text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Botón de confirmación */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddStock}
                  disabled={submittingStock || addQty <= 0}
                  className="h-13 w-full rounded-xl bg-success font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
                >
                  {submittingStock
                    ? "Guardando..."
                    : `Confirmar Entrada (+${addQty} pzas a ${formatCents(Math.round(parseFloat(newPrice || "0") * 100), currency)})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tarjeta de Producto NO Encontrado: Alta Rápida en 3 Campos */}
        {unknownBarcode && (
          <div className="rounded-2xl border-2 border-warning/40 bg-card p-5 shadow-md animate-in fade-in">
            <div className="border-b border-app pb-3">
              <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning">
                Nuevo Código Escaneado
              </span>
              <h3 className="mt-1.5 text-base font-bold text-fg">
                Alta rápida para código: <span className="font-mono text-primary">{unknownBarcode}</span>
              </h3>
              <p className="text-xs text-muted">
                Ingresa el nombre y el precio para darlo de alta instantáneamente en catálogo e inventario.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-muted">Nombre del Producto</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Galletas Chokis 120g"
                  className="mt-1 h-11 w-full rounded-xl border border-app bg-bg px-4 text-sm font-semibold text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-muted">Precio de Venta ($)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    placeholder="25.00"
                    className="mt-1 h-11 w-full rounded-xl border border-app bg-bg px-4 font-mono text-sm font-bold text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-muted">Cantidad Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={newProductQty}
                    onChange={(e) => setNewProductQty(parseInt(e.target.value) || 0)}
                    className="mt-1 h-11 w-full rounded-xl border border-app bg-bg px-4 font-mono text-sm font-bold text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCreateProduct}
                  disabled={creatingProduct || !newName.trim() || !newProductPrice}
                  className="h-12 w-full rounded-xl bg-primary font-bold text-primary-fg shadow transition hover:opacity-95 disabled:opacity-50"
                >
                  {creatingProduct ? "Creando..." : "Guardar Producto y Registrar Stock"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Columna Derecha: Historial de Escaneos de la Sesión */}
      <div className="rounded-2xl border border-app bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-app pb-3">
          <div>
            <h3 className="font-bold text-fg">Registro de Escaneos</h3>
            <p className="text-xs text-muted">Artículos ingresados en esta sesión de mostrador</p>
          </div>
          <span className="rounded-full bg-muted/15 px-2.5 py-0.5 text-xs font-bold text-fg">
            {scanHistory.length} registros
          </span>
        </div>

        {scanHistory.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-muted">
            <span className="text-4xl">📦</span>
            <p className="mt-2 text-sm font-medium">No hay escaneos recientes</p>
            <p className="text-xs">Los artículos que registres aparecerán aquí en vivo.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {scanHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-app bg-bg p-3 text-sm shadow-xs transition hover:border-primary/30"
              >
                <div>
                  <div className="font-semibold text-fg">{item.name}</div>
                  <div className="font-mono text-xs text-muted">
                    {item.barcode} · {formatCents(item.price, currency)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-md bg-success/15 px-2 py-0.5 font-bold text-success text-xs">
                    +{item.quantityAdded} pzas
                  </span>
                  <div className="text-xs text-muted">Total: {item.newStock}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
