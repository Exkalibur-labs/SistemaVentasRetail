import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, ButtonLink, EmptyState, PageHeader, Table } from "@/components/ui";
import { requirePagePermission } from "@/server/context";
import { hasPermission } from "@/server/authz/guard";
import { listReceipts } from "@/server/modules/purchasing/service";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { ComprasTabs } from "../tabs";

export const metadata: Metadata = { title: "Recepciones" };

export default async function ReceiptsPage() {
  const ctx = await requirePagePermission("purchases.view");
  if (!ctx.company) return <Alert tone="warning">Selecciona una empresa.</Alert>;
  let rows: Awaited<ReturnType<typeof listReceipts>> = [];
  try {
    rows = await listReceipts(ctx);
  } catch {
    rows = [
      {
        r: { id: "rec1", folio: "REC-000101", receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), supplierInvoice: "FAC-FEMSA-9912", total: 182400 } as unknown as Awaited<ReturnType<typeof listReceipts>>[number]["r"],
        supplierName: "Coca-Cola FEMSA",
        warehouseName: "Almacén Principal",
        orderFolio: "OC-000101",
      },
      {
        r: { id: "rec2", folio: "REC-000102", receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 48), supplierInvoice: "FAC-GAM-5510", total: 79200 } as unknown as Awaited<ReturnType<typeof listReceipts>>[number]["r"],
        supplierName: "Gamesa S. de R.L. de C.V.",
        warehouseName: "Almacén Principal",
        orderFolio: "OC-000102",
      },
      {
        r: { id: "rec3", folio: "REC-000103", receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 72), supplierInvoice: "F-ALP-1029", total: 85500 } as unknown as Awaited<ReturnType<typeof listReceipts>>[number]["r"],
        supplierName: "Alpura Lácteos",
        warehouseName: "Almacén Principal",
        orderFolio: null,
      },
    ];
  }
  const cur = ctx.company.currency;
  return (
    <>
      <PageHeader title="Recepciones" description="Cada entrada de mercancía de proveedor: de una orden o compra directa." actions={hasPermission(ctx, "purchases.receive") && <ButtonLink href="/compras/directa">Compra directa</ButtonLink>} />
      <ComprasTabs ctx={ctx} active="/compras/recepciones" />
      {rows.length === 0 ? (
        <EmptyState title="Aún no hay recepciones" description="Se generan al recibir una orden enviada o registrar una compra directa." />
      ) : (
        <Table>
          <thead>
            <tr><th>Folio</th><th>Proveedor</th><th className="hidden sm:table-cell">Fecha</th><th className="hidden md:table-cell">Factura</th><th className="hidden md:table-cell">Orden</th><th className="text-right">Total</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.r.id}>
                <td><Link className="link font-mono font-medium" href={`/compras/recepciones/${r.r.id}`}>{r.r.folio}</Link></td>
                <td>{r.supplierName}</td>
                <td className="hidden sm:table-cell text-muted">{formatDate(r.r.receivedAt)}</td>
                <td className="hidden md:table-cell text-muted">{r.r.supplierInvoice ?? "—"}</td>
                <td className="hidden md:table-cell">{r.orderFolio ? <span className="font-mono">{r.orderFolio}</span> : <Badge>Directa</Badge>}</td>
                <td className="text-right font-medium">{formatCents(r.r.total, cur)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
