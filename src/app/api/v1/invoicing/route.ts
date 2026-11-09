import { withApi } from "@/server/api";
import { cancelInvoice, getInvoiceById, issueInvoiceFromSale, listInvoices } from "@/server/modules/invoicing/service";
import { ValidationError } from "@/server/errors";

export const dynamic = "force-dynamic";

/** Listar facturas o consultar una por id */
export const GET = withApi(async (req, ctx) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const inv = await getInvoiceById(ctx, id);
    return { ok: true, invoice: inv };
  }

  const q = url.searchParams.get("q") || undefined;
  const list = await listInvoices(ctx, { q });
  return { ok: true, invoices: list };
});

/** Emitir o cancelar factura */
export const POST = withApi(async (req, ctx) => {
  const body = await req.json();
  const { action } = body;

  if (action === "issue") {
    if (!body.saleId) {
      throw new ValidationError({ saleId: ["El saleId de la venta es requerido."] });
    }
    const inv = await issueInvoiceFromSale(ctx, {
      saleId: body.saleId,
      receiver: body.receiver,
      issuer: body.issuer,
    });
    return { ok: true, invoice: inv };
  }

  if (action === "cancel") {
    if (!body.invoiceId) {
      throw new ValidationError({ invoiceId: ["El invoiceId es requerido."] });
    }
    const inv = await cancelInvoice(ctx, body.invoiceId, body.reason);
    return { ok: true, invoice: inv };
  }

  throw new ValidationError({ action: ["Acción no válida. Se esperaba 'issue' o 'cancel'."] });
});
