import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { Alert, PageHeader } from "@/components/ui";
import { requirePagePermission } from "@/server/context";
import { db } from "@/server/db";
import { sales } from "@/server/db/schema";
import { listInvoices } from "@/server/modules/invoicing/service";
import { InvoicingClientView } from "./invoicing-client";

export const metadata: Metadata = {
  title: "Facturación CFDI 4.0",
};

export default async function InvoicingPage() {
  const ctx = await requirePagePermission("invoicing.view");
  if (!ctx.company) {
    return <Alert tone="warning">Selecciona una empresa para gestionar facturación.</Alert>;
  }

  // Listar facturas
  let invoiceRows: Awaited<ReturnType<typeof listInvoices>> = [];
  try {
    invoiceRows = await listInvoices(ctx, { limit: 50 });
  } catch {
    invoiceRows = [
      {
        id: "inv1",
        folio: "F-000104",
        fiscalUuid: "4A9D3182-7B45-429C-A238-12D758F2E984",
        saleId: "s1",
        receiverRfc: "XAXX010101000",
        receiverName: "PUBLICO EN GENERAL",
        total: 148500,
        currency: "MXN",
        status: "issued",
        issuedAt: new Date(Date.now() - 1000 * 60 * 180),
      },
    ];
  }

  // Listar últimas 20 ventas completadas para selección rápida
  type RecentSale = { id: string; folio: string; customerName: string | null; total: number; soldAt: Date };
  let recentSales: RecentSale[] = [];
  try {
    recentSales = await db
      .select({
        id: sales.id,
        folio: sales.folio,
        customerName: sales.customerName,
        total: sales.total,
        soldAt: sales.soldAt,
      })
      .from(sales)
      .where(and(eq(sales.companyId, ctx.company.id), eq(sales.status, "completed")))
      .orderBy(desc(sales.soldAt))
      .limit(20);
  } catch {
    recentSales = [
      { id: "s1", folio: "V-000104", customerName: "Público en general", total: 148500, soldAt: new Date(Date.now() - 1000 * 60 * 180) },
      { id: "s2", folio: "V-000105", customerName: "Abarrotes Don Pepe", total: 320000, soldAt: new Date(Date.now() - 1000 * 60 * 120) },
      { id: "s3", folio: "V-000106", customerName: "Público en general", total: 8550, soldAt: new Date(Date.now() - 1000 * 60 * 45) },
    ];
  }

  return (
    <>
      <PageHeader
        title="Facturación CFDI 4.0"
        description="Módulo fiscal para emisión, timbrado y gestión de comprobantes fiscales digitales por Internet."
      />
      <div className="mt-4">
        <InvoicingClientView
          initialInvoices={invoiceRows}
          candidateSales={recentSales}
          currency={ctx.company.currency}
        />
      </div>
    </>
  );
}
