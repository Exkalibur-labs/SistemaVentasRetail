import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "@/lib/pos/local-db";
import { db } from "@/server/db";
import { companyModules, MODULE_KEYS, paymentMethods, taxProfiles, unitsOfMeasure } from "@/server/db/schema";
import { ConflictError, NotFoundError } from "@/server/errors";
import { createProduct } from "@/server/modules/catalog/service";
import { openSession } from "@/server/modules/cash/service";
import { cancelSale, createSale } from "@/server/modules/sales/service";
import { getInvoiceById, issueInvoiceFromSale, listInvoices } from "@/server/modules/invoicing/service";
import { contextFor, createTenantFixture, resetDatabase, type Fixture } from "../helpers";

type Ctx = Awaited<ReturnType<typeof contextFor>>;

const receiver = { rfc: "XAXX010101000", name: "PUBLICO EN GENERAL", regime: "616", postalCode: "91000", cfdiUse: "S01" };

describe("Fase 5B · facturación simulada", () => {
  let f: Fixture;
  let owner: Ctx;
  let cashier: Ctx;
  let variant: { id: string };
  let cash: string;

  beforeEach(async () => {
    await resetDatabase();
    f = await createTenantFixture();
    for (const mod of MODULE_KEYS) await db.insert(companyModules).values({ companyId: f.company.id, module: mod, enabled: true }).onConflictDoUpdate({ target: [companyModules.companyId, companyModules.module], set: { enabled: true } });
    owner = await contextFor(f.owner);
    cashier = await contextFor(f.cashier);
    const [iva] = await db.select().from(taxProfiles).where(and(eq(taxProfiles.companyId, f.company.id), eq(taxProfiles.code, "IVA16")));
    const [pza] = await db.select().from(unitsOfMeasure).where(and(eq(unitsOfMeasure.companyId, f.company.id), eq(unitsOfMeasure.code, "PZA")));
    variant = (await createProduct(owner, { name: "Coca", sku: "COCA", kind: "simple", categoryName: "Bebidas", unitId: pza.id, taxProfileId: iva.id, variants: [{ sku: "COCA", price: "11.60", cost: "6.00", initialStock: 50 }] })).variants[0];
    const methods = await db.select().from(paymentMethods).where(eq(paymentMethods.companyId, f.company.id));
    cash = methods.find((x) => x.code === "EFECTIVO")!.id;
    await openSession(cashier, { cashRegisterId: f.register.id, openingAmount: "500" });
  });

  const sell = () =>
    createSale(cashier, { id: uuidv7(), cashRegisterId: f.register.id, lines: [{ variantId: variant.id, quantity: 2, unitPrice: 1160, discount: 0 }], payments: [{ paymentMethodId: cash, amount: 2320 }] }, { origin: "online" });

  it("emite un comprobante marcado como SIMULADO, con folio y sin sello real", async () => {
    const { sale } = await sell();
    const inv = await issueInvoiceFromSale(owner, { saleId: sale.id, receiver });
    expect(inv.saleId).toBe(sale.id);
    expect(inv.folio).toBeTruthy();
    expect(inv.satSeal ?? "").toMatch(/^SIMULADO:/);
    expect(inv.digitalStamp ?? "").toMatch(/^SIMULADO:/);
    expect(inv.satCertificateNumber).toBe("SIMULADO");
    expect(inv.qrData ?? "").toContain("SIMULACION-SIN-VALIDEZ-FISCAL");
    expect(inv.xmlContent).toContain("SIMULACIÓN: documento sin validez fiscal");

    const again = await getInvoiceById(owner, inv.id);
    expect(again.fiscalUuid).toBe(inv.fiscalUuid);
    expect((await listInvoices(owner, { limit: 10 })).some((i) => i.id === inv.id)).toBe(true);
  });

  it("no inventa datos: venta inexistente o cancelada se rechaza", async () => {
    await expect(issueInvoiceFromSale(owner, { saleId: uuidv7(), receiver })).rejects.toBeInstanceOf(NotFoundError);
    const { sale } = await sell();
    await cancelSale(owner, sale.id, { reason: "Error de captura" });
    await expect(issueInvoiceFromSale(owner, { saleId: sale.id, receiver })).rejects.toBeInstanceOf(ConflictError);
  });
});
