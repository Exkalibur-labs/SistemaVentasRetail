import { z } from "zod";
import { withApi } from "@/server/api";
import { cancelInvoice, getInvoiceById, issueInvoiceFromSale, listInvoices } from "@/server/modules/invoicing/service";
import { parseOrThrow } from "@/server/validation";

export const dynamic = "force-dynamic";

const receiverSchema = z.object({
  rfc: z.string().trim().min(12).max(13),
  name: z.string().trim().min(1).max(200),
  regime: z.string().trim().min(3).max(10),
  postalCode: z.string().trim().min(5).max(10),
  cfdiUse: z.string().trim().min(3).max(10),
  paymentMethod: z.enum(["PUE", "PPD"]).optional(),
  paymentForm: z.string().trim().max(10).optional(),
});

const issuerSchema = z.object({
  rfc: z.string().trim().max(13).optional(),
  legalName: z.string().trim().max(200).optional(),
  taxRegime: z.string().trim().max(10).optional(),
  postalCode: z.string().trim().max(10).optional(),
});

const invoicingPostSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("issue"),
    saleId: z.string().min(1, "El saleId de la venta es requerido."),
    receiver: receiverSchema.optional(),
    issuer: issuerSchema.optional(),
  }),
  z.object({
    action: z.literal("cancel"),
    invoiceId: z.string().min(1, "El invoiceId es requerido."),
    reason: z.string().max(240).optional(),
  }),
]);

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
  const input = parseOrThrow(invoicingPostSchema, await req.json());

  if (input.action === "issue") {
    const inv = await issueInvoiceFromSale(ctx, {
      saleId: input.saleId,
      receiver: input.receiver,
      issuer: input.issuer,
    });
    return { ok: true, invoice: inv };
  }

  const inv = await cancelInvoice(ctx, input.invoiceId, input.reason ?? "");
  return { ok: true, invoice: inv };
});
