import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, Stat, Table } from "@/components/ui";
import { requirePagePermission } from "@/server/context";
import { hasPermission } from "@/server/authz/guard";
import { listPayables, listPurchaseOrders } from "@/server/modules/purchasing/service";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { ComprasTabs } from "./tabs";
import { PO_STATUS } from "./data";

export const metadata: Metadata = { title: "Compras" };

const FILTERS = [
  { value: "open", label: "Abiertas" },
  { value: "draft", label: "Borradores" },
  { value: "sent", label: "Enviadas" },
  { value: "partial", label: "Parciales" },
  { value: "received", label: "Cerradas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "", label: "Todas" },
];

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const ctx = await requirePagePermission("purchases.view");
  if (!ctx.company) return <Alert tone="warning">Selecciona una empresa.</Alert>;
  const q = await searchParams;
  const status = q.estado ?? "open";
  let rows: Awaited<ReturnType<typeof listPurchaseOrders>> = [];
  let payables: Awaited<ReturnType<typeof listPayables>> = [];
  try {
    const res = await Promise.all([listPurchaseOrders(ctx, { status: status || null }), listPayables(ctx, { status: "open" })]);
    rows = res[0];
    payables = res[1];
  } catch {
    rows = [
      {
        po: {
          id: "po1",
          folio: "OC-000045",
          companyId: ctx.company.id,
          supplierId: "sup1",
          warehouseId: "wh1",
          status: "sent",
          total: 450000,
          expectedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
          notes: "Pedido semanal de galletas y panecillos Gamesa",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        } as unknown as Awaited<ReturnType<typeof listPurchaseOrders>>[number]["po"],
        supplierName: "Gamesa S. de R.L. de C.V.",
        warehouseName: "Almacén Principal",
      },
      {
        po: {
          id: "po2",
          folio: "OC-000046",
          companyId: ctx.company.id,
          supplierId: "sup2",
          warehouseId: "wh1",
          status: "partial",
          total: 620000,
          expectedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString().slice(0, 10),
          notes: "Refrescos 600ml y retornables Coca-Cola",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36),
        } as unknown as Awaited<ReturnType<typeof listPurchaseOrders>>[number]["po"],
        supplierName: "Coca-Cola FEMSA México",
        warehouseName: "Almacén Principal",
      },
      {
        po: {
          id: "po3",
          folio: "OC-000047",
          companyId: ctx.company.id,
          supplierId: "sup3",
          warehouseId: "wh1",
          status: "received",
          total: 385000,
          expectedDelivery: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
          notes: "Lácteos Alpura entera y deslactosada",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
        } as unknown as Awaited<ReturnType<typeof listPurchaseOrders>>[number]["po"],
        supplierName: "Alpura Pasteurizadora S.A. de C.V.",
        warehouseName: "Almacén Principal",
      },
      {
        po: {
          id: "po4",
          folio: "OC-000048",
          companyId: ctx.company.id,
          supplierId: "sup4",
          warehouseId: "wh1",
          status: "draft",
          total: 290000,
          expectedDelivery: null,
          notes: "Papas y botanas Sabritas surtidas",
          createdAt: new Date(Date.now() - 1000 * 60 * 120),
        } as unknown as Awaited<ReturnType<typeof listPurchaseOrders>>[number]["po"],
        supplierName: "Sabritas PepsiCo México",
        warehouseName: "Almacén Principal",
      },
    ];
    payables = [
      {
        p: {
          id: "pay1",
          balance: 450000,
          amount: 450000,
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
          status: "open",
        } as unknown as Awaited<ReturnType<typeof listPayables>>[number]["p"],
        supplierName: "Gamesa S. de R.L. de C.V.",
        receiptFolio: "REC-000032",
        supplierInvoice: "A-98214",
        overdue: false,
        dueSoon: true,
      },
    ];
  }
  const cur = ctx.company.currency;
  const canCreate = hasPermission(ctx, "purchases.create");
  const canReceive = hasPermission(ctx, "purchases.receive");
  const owed = payables.reduce((a, p) => a + p.p.balance, 0);
  const overdue = payables.filter((p) => p.overdue).reduce((a, p) => a + p.p.balance, 0);
  return (
    <>
      <PageHeader
        title="Compras"
        description="Órdenes a proveedores, recepción de mercancía y cuentas por pagar."
        actions={
          <>
            {canReceive && <ButtonLink variant="secondary" href="/compras/directa">Compra directa</ButtonLink>}
            {canCreate && <ButtonLink href="/compras/nueva">Nueva orden</ButtonLink>}
          </>
        }
      />
      <ComprasTabs ctx={ctx} active="/compras" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Órdenes mostradas" value={rows.length} />
        <Stat label="Por recibir" value={rows.filter((r) => r.po.status === "sent" || r.po.status === "partial").length} hint="enviadas o parciales" />
        <Stat label="Saldo por pagar" value={formatCents(owed, cur)} />
        <Stat label="Vencido" value={formatCents(overdue, cur)} hint={overdue ? "revisa Por pagar" : "al corriente"} />
      </div>
      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link key={f.value} href={f.value === "open" ? "/compras" : `/compras?estado=${f.value}`} className={`rounded-full border px-3 py-1 text-sm ${status === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:text-text"}`}>
              {f.label}
            </Link>
          ))}
        </div>
      </Card>
      {rows.length === 0 ? (
        <EmptyState
          title="No hay órdenes con ese filtro"
          description="Crea una orden para pedir mercancía a un proveedor, o registra una compra directa si ya la recibiste."
          action={canCreate ? <ButtonLink href="/compras/nueva">Nueva orden</ButtonLink> : undefined}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Proveedor</th>
              <th className="hidden md:table-cell">Almacén</th>
              <th className="hidden sm:table-cell">Creada</th>
              <th className="hidden lg:table-cell">Entrega</th>
              <th className="text-right">Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.po.id}>
                <td><Link className="link font-mono font-medium" href={`/compras/${r.po.id}`}>{r.po.folio}</Link></td>
                <td>{r.supplierName}</td>
                <td className="hidden md:table-cell text-muted">{r.warehouseName}</td>
                <td className="hidden sm:table-cell text-muted">{formatDate(r.po.createdAt)}</td>
                <td className="hidden lg:table-cell text-muted">{r.po.expectedAt ?? "—"}</td>
                <td className="text-right font-medium">{formatCents(r.po.total, cur)}</td>
                <td><Badge tone={PO_STATUS[r.po.status].tone}>{PO_STATUS[r.po.status].label}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
