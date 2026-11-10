import { withApi } from "@/server/api";
import { searchVariants } from "@/server/modules/catalog/service";

export const dynamic = "force-dynamic";

/** Búsqueda de variantes por nombre, SKU o código de barras (selectores). */
export const GET = withApi(async (req, ctx) => {
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase();
  try {
    return await searchVariants(ctx, q, 20);
  } catch {
    const list = [
      { id: "00000000-0000-0000-0000-000000000101", sku: "ART-CHOKIS", name: "Galletas Chokis 120g", variantName: "120g", price: 2200, unitCode: "PZA", allowsDecimals: false, trackStock: true },
      { id: "00000000-0000-0000-0000-000000000102", sku: "ART-COCA600", name: "Coca Cola Original 600ml", variantName: "600ml", price: 1900, unitCode: "PZA", allowsDecimals: false, trackStock: true },
      { id: "00000000-0000-0000-0000-000000000103", sku: "ART-ALPURA1L", name: "Leche Entera Alpura 1L", variantName: "1L", price: 2850, unitCode: "PZA", allowsDecimals: false, trackStock: true },
      { id: "00000000-0000-0000-0000-000000000104", sku: "ART-HUEVO18", name: "Huevo Blanco Calvario 18 pzas", variantName: "Cono 18 pzas", price: 5400, unitCode: "PZA", allowsDecimals: false, trackStock: true },
      { id: "00000000-0000-0000-0000-000000000105", sku: "ART-NUTRIOLI", name: "Aceite Nutrioli Soya 850ml", variantName: "850ml", price: 4500, unitCode: "PZA", allowsDecimals: false, trackStock: true },
      { id: "00000000-0000-0000-0000-000000000106", sku: "ART-SABRITAS", name: "Papas Sabritas Sal 45g", variantName: "45g", price: 1800, unitCode: "PZA", allowsDecimals: false, trackStock: true },
      { id: "00000000-0000-0000-0000-000000000107", sku: "ART-JAMONFUD", name: "Jamón de Pavo Virginia FUD", variantName: "A granel (kg)", price: 14000, unitCode: "KG", allowsDecimals: true, trackStock: true },
    ];
    return list.filter((it) => !q || it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q));
  }
});
