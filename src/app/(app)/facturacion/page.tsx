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
  const invoiceRows = await listInvoices(ctx, { limit: 50 });

  // Listar últimas 20 ventas completadas para selección rápida
  const recentSales = await db
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
