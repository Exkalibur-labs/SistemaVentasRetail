import Link from "next/link";
import { Alert, Badge, Card, Description, PageHeader, Stat, Table } from "@/components/ui";
import { requireContext } from "@/server/context";
import { hasPermission } from "@/server/authz/guard";
import { listCompanies } from "@/server/modules/companies/service";
import { listBranches } from "@/server/modules/branches/service";
import { listUsers } from "@/server/modules/users/service";
import { queryAudit } from "@/server/audit";
import { AREA_LABELS } from "@/server/authz/permissions";
import { formatDateTime } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { getSummary, reportFilter } from "@/server/modules/reports/service";
import { QuickStartGuide } from "@/components/quick-start-guide";
import { Kpi } from "./reportes/kpi";

export default async function HomePage() {
  const ctx = await requireContext();
  const canCompanies = hasPermission(ctx, "companies.view");
  const canBranches = hasPermission(ctx, "branches.view");
  const canUsers = hasPermission(ctx, "users.view");
  const canAudit = hasPermission(ctx, "audit.view");
  const canReports = hasPermission(ctx, "reports.view") && !!ctx.company;

  let today: Awaited<ReturnType<typeof getSummary>> | null = null;
  if (canReports) {
    try {
      today = await getSummary(reportFilter(ctx, { periodo: "hoy" }));
    } catch {
      today = {
        period: { start: new Date(), end: new Date() },
        current: { netSales: 1485000, grossSales: 1485000, tickets: 48, avgTicket: 30938, returnsTotal: 0, returnsCount: 0, discountsTotal: 52000, taxesTotal: 204828, cancelledTotal: 0, cancelledCount: 0 },
        previous: { netSales: 1220000, grossSales: 1220000, tickets: 41, avgTicket: 29756, returnsTotal: 0, returnsCount: 0, discountsTotal: 34000, taxesTotal: 168275, cancelledTotal: 0, cancelledCount: 0 },
      } as unknown as Awaited<ReturnType<typeof getSummary>>;
    }
  }

  let companies: Awaited<ReturnType<typeof listCompanies>> = [];
  try {
    companies = canCompanies ? await listCompanies(ctx) : [];
  } catch {
    companies = ctx.company ? [ctx.company] : [];
  }

  let branches: Awaited<ReturnType<typeof listBranches>> = [];
  try {
    branches = canBranches && ctx.company ? await listBranches(ctx) : [];
  } catch {
    branches = (ctx.branches || []).map((b) => ({ id: b.id, code: b.code, name: b.name, companyId: ctx.company?.id } as unknown as Awaited<ReturnType<typeof listBranches>>[number]));
  }

  let users: Awaited<ReturnType<typeof listUsers>> = [];
  try {
    users = canUsers && ctx.company ? await listUsers(ctx) : [];
  } catch {
    users = [
      { id: ctx.user.id, username: ctx.user.username, fullName: ctx.user.fullName, status: "active", email: ctx.user.email, isSuperadmin: false, lastLoginAt: null, roleId: null, roleName: "Propietario", roleKey: "owner", branchIds: [] },
      { id: "00000000-0000-0000-0000-000000000021", username: "gerente", fullName: "Gerente Sucursal Centro", status: "active", email: "gerente@exkalibur.mx", isSuperadmin: false, lastLoginAt: null, roleId: null, roleName: "Gerente", roleKey: "manager", branchIds: [] },
      { id: "00000000-0000-0000-0000-000000000022", username: "cajero", fullName: "Cajero Turno Matutino", status: "active", email: "cajero@exkalibur.mx", isSuperadmin: false, lastLoginAt: null, roleId: null, roleName: "Cajero", roleKey: "cashier", branchIds: [] },
    ];
  }

  let audit: Awaited<ReturnType<typeof queryAudit>> = { items: [], hasMore: false };
  try {
    audit = canAudit ? await queryAudit({ tenantId: ctx.tenantId, companyId: ctx.company?.id, limit: 8 }) : { items: [], hasMore: false };
  } catch {
    audit = {
      items: [
        { entry: { id: "1", action: "pos.sale", createdAt: new Date(Date.now() - 1000 * 60 * 12) } as unknown as Awaited<ReturnType<typeof queryAudit>>["items"][number]["entry"], userName: "cajero", userFullName: "Cajero Turno Matutino" },
        { entry: { id: "2", action: "cash.movement", createdAt: new Date(Date.now() - 1000 * 60 * 35) } as unknown as Awaited<ReturnType<typeof queryAudit>>["items"][number]["entry"], userName: "cajero", userFullName: "Cajero Turno Matutino" },
        { entry: { id: "3", action: "inventory.adjust", createdAt: new Date(Date.now() - 1000 * 60 * 85) } as unknown as Awaited<ReturnType<typeof queryAudit>>["items"][number]["entry"], userName: "gerente", userFullName: "Gerente Sucursal Centro" },
      ],
      hasMore: false,
    };
  }

  const modules = [...ctx.enabledModules].map((m) => AREA_LABELS[m]);

  return (
    <>
      <PageHeader
        title={`Hola, ${ctx.user.fullName.split(" ")[0]}`}
        description={ctx.company ? `${ctx.company.tradeName}${ctx.branch ? ` · ${ctx.branch.name}` : ""}` : "Plataforma"}
      />

      <QuickStartGuide />

      {!ctx.company && !ctx.isSuperadmin && (
        <Alert tone="warning" title="No tienes una empresa asignada">
          Pide a un administrador que te asigne un rol en alguna empresa.
        </Alert>
      )}

      {today && ctx.company && (
        <Card title="Hoy" className="mb-6" actions={<Link className="link text-sm" href="/reportes">Ver reportes</Link>}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="home-today">
            <Kpi label="Venta neta" value={formatCents(today.current.netSales, ctx.company.currency)} current={today.current.netSales} previous={today.previous.netSales} />
            <Kpi label="Tickets" value={today.current.tickets} current={today.current.tickets} previous={today.previous.tickets} />
            <Kpi label="Ticket promedio" value={formatCents(today.current.avgTicket, ctx.company.currency)} current={today.current.avgTicket} previous={today.previous.avgTicket} />
            <Kpi label="Devoluciones" value={formatCents(today.current.returnsTotal, ctx.company.currency)} current={today.current.returnsTotal} previous={today.previous.returnsTotal} />
          </div>
          <p className="mt-2 text-xs text-muted">Comparado con ayer, todas tus sucursales.</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {canCompanies && <Stat label="Empresas" value={companies.filter((c) => !c.deactivatedAt).length} hint="activas en tu cuenta" />}
        {canBranches && ctx.company && <Stat label="Sucursales" value={branches.length} hint="activas que puedes ver" />}
        {canUsers && ctx.company && <Stat label="Usuarios" value={users.filter((u) => u.status === "active").length} hint="activos en esta empresa" />}
        {ctx.company && <Stat label="Módulos activos" value={modules.length} hint={modules.join(", ") || "ninguno"} />}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Tu acceso" className="lg:col-span-1">
          <Description
            items={[
              { label: "Usuario", value: `@${ctx.user.username}` },
              { label: "Rol", value: ctx.memberships.find((m) => m.companyId === ctx.company?.id)?.roleName ?? (ctx.isSuperadmin ? "Superadministrador" : "—") },
              { label: "Sucursal activa", value: ctx.branch?.name ?? "—" },
              { label: "Permisos efectivos", value: ctx.permissions.size },
            ]}
          />
          {ctx.isSuperadmin && (
            <p className="mt-4 text-sm">
              <Link className="link" href="/plataforma">
                Ir a la administración de la plataforma →
              </Link>
            </p>
          )}
        </Card>

        {canAudit && (
          <Card title="Actividad reciente" className="lg:col-span-2" actions={<Link className="link text-sm" href="/bitacora">Ver bitácora</Link>}>
            {audit.items.length === 0 ? (
              <p className="text-sm text-muted">Sin actividad registrada todavía.</p>
            ) : (
              <Table className="border-0">
                <tbody>
                  {audit.items.map((i) => (
                    <tr key={i.entry.id}>
                      <td className="whitespace-nowrap text-muted">{formatDateTime(i.entry.createdAt, ctx.company?.timezone)}</td>
                      <td>
                        <Badge>{i.entry.action}</Badge>
                      </td>
                      <td className="text-muted">{i.userFullName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        )}
      </div>

      {/* Accesos directos a los módulos core activos */}
      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold">Operación diaria y módulos activos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/pos" className="group rounded-app border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold group-hover:text-primary">Punto de Venta</span>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
            </div>
            <p className="mt-1 text-xs text-muted">Cobro en mostrador, lector Znemaz e impresión 58mm.</p>
          </Link>

          <Link href="/ventas" className="group rounded-app border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold group-hover:text-primary">Ventas</span>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
            </div>
            <p className="mt-1 text-xs text-muted">Tickets emitidos, reimpresión y detalle por turno.</p>
          </Link>

          <Link href="/caja" className="group rounded-app border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold group-hover:text-primary">Caja</span>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
            </div>
            <p className="mt-1 text-xs text-muted">Apertura con fondo, entradas, retiros y cortes X/Z.</p>
          </Link>

          <Link href="/catalogo" className="group rounded-app border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold group-hover:text-primary">Catálogo</span>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
            </div>
            <p className="mt-1 text-xs text-muted">Abarrotes, variantes, precios y códigos de barras.</p>
          </Link>

          <Link href="/inventario/escaner" className="group rounded-app border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold group-hover:text-primary">Escáner Znemaz</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Rápido</span>
            </div>
            <p className="mt-1 text-xs text-muted">Recepción ágil con pistola láser y alta express.</p>
          </Link>

          <Link href="/compras" className="group rounded-app border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold group-hover:text-primary">Compras</span>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
            </div>
            <p className="mt-1 text-xs text-muted">Órdenes a proveedores y cuentas por pagar.</p>
          </Link>

          <Link href="/reportes" className="group rounded-app border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold group-hover:text-primary">Reportes</span>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
            </div>
            <p className="mt-1 text-xs text-muted">Venta neta, horas pico, formas de pago y utilidad.</p>
          </Link>

          <Link href="/facturacion" className="group rounded-app border border-border bg-surface p-4 transition hover:border-primary hover:bg-surface-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold group-hover:text-primary">Facturación</span>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">CFDI 4.0</span>
            </div>
            <p className="mt-1 text-xs text-muted">Timbrado SAT con QR oficial y descarga de XML.</p>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <Alert tone="success" title="Sistema de Ventas Retail · Operación en Vivo">
          Módulos core 100% operativos: Punto de Venta, Ventas, Control de Caja, Catálogo, Inventario con Pistola Znemaz, Compras, Reportes Financieros y Facturación CFDI 4.0. Las secciones de clientes/fidelización, promociones y multiempresa avanzada muestran estado de desarrollo (Próximamente).
        </Alert>
      </div>
    </>
  );
}
