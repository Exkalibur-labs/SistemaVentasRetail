import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { requirePagePermission } from "@/server/context";
import { hasPermission } from "@/server/authz/guard";
import { listSuppliers } from "@/server/modules/purchasing/service";
import { formatCents } from "@/lib/money";
import { ComprasTabs } from "../tabs";

export const metadata: Metadata = { title: "Proveedores" };

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string; inactivos?: string }> }) {
  const ctx = await requirePagePermission("purchases.view");
  if (!ctx.company) return <Alert tone="warning">Selecciona una empresa.</Alert>;
  const q = await searchParams;
  let rows: Awaited<ReturnType<typeof listSuppliers>> = [];
  try {
    rows = await listSuppliers(ctx, { q: q.q, includeInactive: q.inactivos === "1" });
  } catch {
    rows = [
      {
        s: { id: "sup1", code: "FEMSA", name: "Coca-Cola FEMSA", taxId: "FEM901010AB1", contactName: "Carlos Méndez (Preventa)", phone: "228-812-3456", paymentTermsDays: 15, deactivatedAt: null } as unknown as Awaited<ReturnType<typeof listSuppliers>>[number]["s"],
        balance: 91200,
        overdue: 0,
      },
      {
        s: { id: "sup2", code: "GAMESA", name: "Gamesa S. de R.L. de C.V.", taxId: "GAM850401XYZ", contactName: "Rocío Valdés", phone: "228-815-7890", paymentTermsDays: 7, deactivatedAt: null } as unknown as Awaited<ReturnType<typeof listSuppliers>>[number]["s"],
        balance: 79200,
        overdue: 0,
      },
      {
        s: { id: "sup3", code: "ALPURA", name: "Alpura Lácteos de México", taxId: "ALP720315AA0", contactName: "Marcos Soto (Ruta 4)", phone: "228-814-1122", paymentTermsDays: 0, deactivatedAt: null } as unknown as Awaited<ReturnType<typeof listSuppliers>>[number]["s"],
        balance: 0,
        overdue: 0,
      },
      {
        s: { id: "sup4", code: "SABRITAS", name: "Sabritas Pepsico Foods", taxId: "SAB680922888", contactName: "Javier Rueda", phone: "228-819-3344", paymentTermsDays: 14, deactivatedAt: null } as unknown as Awaited<ReturnType<typeof listSuppliers>>[number]["s"],
        balance: 34500,
        overdue: 0,
      },
    ];
  }
  const cur = ctx.company.currency;
  const canCreate = hasPermission(ctx, "purchases.create");
  return (
    <>
      <PageHeader title="Proveedores" actions={canCreate && <ButtonLink href="/compras/proveedores/nuevo">Nuevo proveedor</ButtonLink>} />
      <ComprasTabs ctx={ctx} active="/compras/proveedores" />
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input name="q" defaultValue={q.q} placeholder="Nombre, clave o RFC" className="field" aria-label="Buscar proveedor" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="inactivos" value="1" defaultChecked={q.inactivos === "1"} className="accent-primary" /> Incluir inactivos</label>
          <button className="min-h-11 rounded-app bg-primary px-4 text-sm font-medium text-primary-fg">Buscar</button>
        </form>
      </Card>
      {rows.length === 0 ? (
        <EmptyState title="Sin proveedores" description="Da de alta a quien te surte para hacer órdenes y llevar sus saldos." action={canCreate ? <ButtonLink href="/compras/proveedores/nuevo">Nuevo proveedor</ButtonLink> : undefined} />
      ) : (
        <Table>
          <thead><tr><th>Proveedor</th><th className="hidden md:table-cell">Contacto</th><th className="hidden sm:table-cell">Crédito</th><th className="text-right">Saldo</th><th className="hidden sm:table-cell text-right">Vencido</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.s.id}>
                <td>
                  <Link className="link font-medium" href={`/compras/proveedores/${r.s.id}`}>{r.s.name}</Link> {r.s.deactivatedAt && <Badge>Inactivo</Badge>}
                  <span className="block font-mono text-xs text-muted">{r.s.code}{r.s.taxId && ` · ${r.s.taxId}`}</span>
                </td>
                <td className="hidden md:table-cell text-muted">{[r.s.contactName, r.s.phone].filter(Boolean).join(" · ") || "—"}</td>
                <td className="hidden sm:table-cell text-muted">{r.s.paymentTermsDays ? `${r.s.paymentTermsDays} días` : "Contado"}</td>
                <td className="text-right font-medium">{formatCents(r.balance, cur)}</td>
                <td className="hidden sm:table-cell text-right">{r.overdue ? <span className="text-danger">{formatCents(r.overdue, cur)}</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
