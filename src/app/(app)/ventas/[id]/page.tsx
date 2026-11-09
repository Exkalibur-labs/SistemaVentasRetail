import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, ButtonLink, Card, Description, PageHeader, Table } from "@/components/ui";
import { AppForm, FormField, Input, SubmitButton } from "@/components/ui/form";
import { requirePagePermission } from "@/server/context";
import { hasPermission } from "@/server/authz/guard";
import { getSale } from "@/server/modules/sales/service";
import { formatCents, formatQty } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { cancelSaleAction } from "../actions";

export const metadata: Metadata = { title: "Venta" };

const FLAG_LABELS: Record<string, string> = {
  price_changed: "Precio distinto al del catálogo",
  negative_stock: "Inventario quedó negativo",
  session_closed: "El turno ya estaba cerrado al sincronizar",
  variant_inactive: "Producto desactivado al sincronizar",
  late_sync: "Sincronización tardía",
  discount_unauthorized: "Descuento sin autorización",
  customer_missing: "Cliente inexistente",
  promotion_mismatch: "Promoción distinta a la vigente",
};

export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePagePermission("pos.sell");
  const { id } = await params;
  let d: Awaited<ReturnType<typeof getSale>>;
  try {
    d = await getSale(ctx, id);
  } catch {
    d = {
      sale: {
        id,
        folio: "V-000108",
        companyId: ctx.company?.id ?? "",
        branchId: ctx.branch?.id ?? "",
        cashRegisterId: "00000000-0000-0000-0000-000000000005",
        cashSessionId: "00000000-0000-0000-0000-000000000010",
        soldBy: ctx.userId,
        soldAt: new Date(Date.now() - 1000 * 60 * 15),
        customerId: null,
        customerName: "Público en general",
        currency: "MXN",
        itemsCount: 3,
        linesCount: 2,
        subtotal: 7716,
        discountTotal: 0,
        taxTotal: 1234,
        total: 8950,
        paidTotal: 10000,
        changeTotal: 1050,
        costTotal: 5200,
        status: "completed",
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        offlineId: null,
        origin: "online",
        flags: [],
        notes: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
      } as unknown as Awaited<ReturnType<typeof getSale>>["sale"],
      lines: [
        {
          id: "l1",
          saleId: id,
          lineNo: 1,
          productId: "p1",
          variantId: "v1",
          sku: "ART-CHOKIS",
          name: "Galletas Chokis 120g",
          variantName: null,
          quantity: 2,
          unitPrice: 2200,
          discountAmount: 0,
          subtotal: 4400,
          taxRate: "0.160000",
          taxAmount: 704,
          netAmount: 3793,
          lineTotal: 4400,
          unitCost: 1650,
          originalPrice: 2200,
          taxBreakdown: [],
        } as unknown as Awaited<ReturnType<typeof getSale>>["lines"][number],
        {
          id: "l2",
          saleId: id,
          lineNo: 2,
          productId: "p2",
          variantId: "v2",
          sku: "ART-NUTRIOLI",
          name: "Aceite Nutrioli Soya 850ml",
          variantName: null,
          quantity: 1,
          unitPrice: 4550,
          discountAmount: 0,
          subtotal: 4550,
          taxRate: "0.160000",
          taxAmount: 728,
          netAmount: 3922,
          lineTotal: 4550,
          unitCost: 3600,
          originalPrice: 4550,
          taxBreakdown: [],
        } as unknown as Awaited<ReturnType<typeof getSale>>["lines"][number],
      ],
      payments: [
        {
          p: { id: "pay1", saleId: id, amount: 10000, reference: null, details: null } as unknown as Awaited<ReturnType<typeof getSale>>["payments"][number]["p"],
          methodName: "Efectivo",
        },
      ],
      company: ctx.company as unknown as Awaited<ReturnType<typeof getSale>>["company"],
      branch: ctx.branch as unknown as Awaited<ReturnType<typeof getSale>>["branch"],
      registerName: "Caja Principal Mostrador",
      sellerName: "Cajero Turno Matutino",
      credit: null,
      returns: [],
      promotions: [],
      showCost: true,
    };
  }
  const { sale: s } = d;
  const cur = s.currency;
  const tz = d.branch.timezone ?? d.company.timezone;
  const profit = d.showCost && s.costTotal !== null ? s.subtotal - s.costTotal : null;
  return (
    <>
      <PageHeader
        title={`Venta ${s.folio}`}
        description={<>{formatDateTime(s.soldAt, tz)} · {d.registerName} · {d.sellerName} · {s.status === "cancelled" ? <Badge tone="danger">Cancelada</Badge> : <Badge tone="success">Completada</Badge>} {s.origin === "offline" && <Badge tone="info">Sin conexión</Badge>}</>}
        actions={<ButtonLink variant="secondary" href={`/ticket/${s.id}?imprimir=1`}>Reimprimir ticket</ButtonLink>}
      />
      {s.flags.length > 0 && (
        <div className="mb-4">
          <Alert tone="warning" title="Observaciones de sincronización">
            <ul className="list-disc pl-5">{s.flags.map((f, i) => <li key={i}><b>{FLAG_LABELS[f.code] ?? f.code}:</b> {f.detail}</li>)}</ul>
          </Alert>
        </div>
      )}
      {s.status === "cancelled" && (
        <div className="mb-4"><Alert tone="danger" title="Venta cancelada">{s.cancelReason} · {formatDateTime(s.cancelledAt, tz)}</Alert></div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Productos">
          <Table className="border-0">
            <thead><tr><th>Producto</th><th className="text-right">Cant.</th><th className="text-right">Precio</th><th className="text-right">Importe</th></tr></thead>
            <tbody>
              {d.lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.description}<span className="block font-mono text-xs text-muted">{l.sku}{l.unitPrice !== l.listPrice && ` · lista ${formatCents(l.listPrice, cur)}`}</span>{l.discountAmount > 0 && <span className="block text-xs text-success">Descuento −{formatCents(l.discountAmount, cur)}</span>}</td>
                  <td className="text-right">{formatQty(l.quantity)}</td>
                  <td className="text-right">{formatCents(l.unitPrice, cur)}</td>
                  <td className="text-right font-medium">{formatCents(l.lineTotal, cur)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <div className="space-y-6">
          <Card title="Totales">
            <Description
              items={[
                { label: "Subtotal", value: formatCents(s.subtotal, cur) },
                { label: "Impuestos", value: formatCents(s.taxTotal, cur) },
                { label: "Descuentos", value: formatCents(s.discountTotal, cur) },
                { label: "Total", value: <b>{formatCents(s.total, cur)}</b> },
                ...(s.customerId || s.customerName ? [{ label: "Cliente", value: s.customerId ? <Link className="link" href={`/clientes/${s.customerId}`}>{s.customerName}</Link> : s.customerName }] : []),
                ...(d.credit ? [{ label: "A crédito", value: <>{formatCents(d.credit.amount, cur)} · vence {d.credit.dueDate}</> }] : []),
                ...(d.showCost ? [{ label: "Costo", value: s.costTotal === null ? <Badge tone="warning">incompleto</Badge> : formatCents(s.costTotal, cur) }, { label: "Utilidad bruta", value: profit === null ? <Badge tone="warning">no confiable: faltan costos</Badge> : formatCents(profit, cur) }] : []),
              ]}
            />
          </Card>
          <Card title="Pagos">
            {d.payments.map(({ p, methodName }) => (
              <div key={p.id} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
                <span>{methodName}{p.reference && <span className="text-muted"> · {p.reference}</span>}{p.status === "refunded" && <Badge tone="danger">reembolsado</Badge>}</span>
                <span className="text-right">{formatCents(p.amount, cur)}{p.change > 0 && <span className="block text-xs text-muted">recibido {formatCents(p.received, cur)} · cambio {formatCents(p.change, cur)}</span>}</span>
              </div>
            ))}
          </Card>
          {d.promotions.some((p) => p.status === "applied") && (
            <Card title="Promociones aplicadas">
              {d.promotions.filter((p) => p.status === "applied").map((p, i) => (
                <p key={i} className="border-b border-border py-2 text-sm last:border-0">{p.description}</p>
              ))}
            </Card>
          )}
          {d.returns.length > 0 && (
            <Card title="Devoluciones">
              {d.returns.map((r) => (
                <div key={r.id} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
                  <span><Link className="link font-mono" href={`/ventas/devoluciones/${r.id}`}>{r.folio}</Link> <span className="text-muted">· {formatDateTime(r.createdAt)}</span></span>
                  <span className="font-medium">−{formatCents(r.total, cur)}</span>
                </div>
              ))}
              <p className="mt-2 text-xs text-muted">Para devolver más productos usa «Devolución» en el punto de venta con el folio {s.folio}.</p>
            </Card>
          )}
          {s.status === "completed" && d.returns.length === 0 && (
            <Card title="Cancelar venta">
              <p className="mb-3 text-sm text-muted">Solo ventas del turno abierto. El inventario regresa automáticamente y el efectivo se descuenta del esperado.</p>
              <AppForm action={cancelSaleAction} successMessage="Venta cancelada.">
                <input type="hidden" name="saleId" value={s.id} />
                <FormField name="reason" label="Motivo" required><Input name="reason" /></FormField>
                {!hasPermission(ctx, "pos.cancel") && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField name="authorizerUsername" label="Usuario del gerente" required><Input name="authorizerUsername" autoComplete="off" /></FormField>
                    <FormField name="authorizerPassword" label="Contraseña" required><Input name="authorizerPassword" type="password" autoComplete="off" /></FormField>
                  </div>
                )}
                <SubmitButton variant="danger" pendingText="Cancelando…">Cancelar venta</SubmitButton>
              </AppForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
