import { and, desc, eq, ilike, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { customers, invoices, saleLines, sales } from "@/server/db/schema";
import type { ServiceContext } from "@/server/service-context";
import { requirePermission } from "@/server/authz/guard";
import { ConflictError, NotFoundError } from "@/server/errors";
import { nextFolio } from "../sequences";
import { recordAudit } from "@/server/audit";

export interface FiscalReceiverInput {
  rfc: string;
  name: string;
  regime: string;
  postalCode: string;
  cfdiUse: string;
  paymentMethod?: "PUE" | "PPD";
  paymentForm?: string;
}

export interface IssueInvoiceInput {
  saleId: string;
  receiver?: FiscalReceiverInput;
  issuer?: {
    rfc?: string;
    legalName?: string;
    taxRegime?: string;
    postalCode?: string;
  };
}

export async function issueInvoiceFromSale(
  ctx: ServiceContext,
  input: IssueInvoiceInput,
) {
  requirePermission(ctx, "invoicing.issue");
  if (!ctx.company) throw new NotFoundError("La empresa");
  const company = ctx.company;

  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, input.saleId), eq(sales.companyId, company.id)))
    .limit(1);
  if (!sale) throw new NotFoundError("Venta no encontrada.");
  if (sale.status === "cancelled") throw new ConflictError("No se puede facturar una venta cancelada.");
  const lines = await db.select().from(saleLines).where(eq(saleLines.saleId, sale.id)).orderBy(saleLines.lineNo);

  // Datos del emisor
  const issuerRfc = (input.issuer?.rfc || company.taxId || "XAXX010101000").toUpperCase();
  const issuerName = (input.issuer?.legalName || company.legalName || company.tradeName).toUpperCase();
  const issuerRegime = input.issuer?.taxRegime || company.taxRegime || "626";
  const issuerPostalCode = input.issuer?.postalCode || (company.address as Record<string, string>)?.postalCode || "91000";

  // Datos del receptor
  let receiver: FiscalReceiverInput;

  if (input.receiver && input.receiver.rfc) {
    receiver = input.receiver;
  } else if (sale.customerId) {
    const [c] = await db.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1);
    receiver =
      c?.taxId && c?.legalName && c?.taxPostalCode
        ? {
            rfc: c.taxId,
            name: c.legalName,
            regime: c.taxRegime || "616",
            postalCode: c.taxPostalCode,
            cfdiUse: c.cfdiUse || "G03",
            paymentMethod: "PUE",
            paymentForm: "01",
          }
        : {
            rfc: "XAXX010101000",
            name: "PÚBLICO EN GENERAL",
            regime: "616",
            postalCode: issuerPostalCode,
            cfdiUse: "S01",
            paymentMethod: "PUE",
            paymentForm: "01",
          };
  } else {
    receiver = {
      rfc: "XAXX010101000",
      name: "PÚBLICO EN GENERAL",
      regime: "616",
      postalCode: issuerPostalCode,
      cfdiUse: "S01",
      paymentMethod: "PUE",
      paymentForm: "01",
    };
  }

  // Generar UUID fiscal SAT v4
  const fiscalUuid = randomUUID();
  const totalFormatted = (sale.total / 100).toFixed(2);
  const digitalStamp = "SIMULADO:" + Buffer.from(`${fiscalUuid}|${issuerRfc}|${receiver.rfc}|${totalFormatted}`).toString("base64");
  const satSeal = "SIMULADO:" + Buffer.from(`SAT-${fiscalUuid}-${Date.now()}`).toString("base64");
  const satCertificateNumber = "SIMULADO";

  // Sin PAC no hay timbre válido: el QR no apunta al SAT para que nadie lo tome por verificable.
  const qrData = `SIMULACION-SIN-VALIDEZ-FISCAL|UUID=${fiscalUuid}|RE=${issuerRfc}|RR=${receiver.rfc}|TT=${totalFormatted}`;

  // Estructura XML CFDI 4.0
  const buildXml = (seqSeries: string, seqNumber: number) => `<?xml version="1.0" encoding="utf-8"?>
<!-- SIMULACIÓN: documento sin validez fiscal. No fue timbrado por un PAC autorizado por el SAT. -->
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="${seqSeries}" Folio="${seqNumber}" Fecha="${new Date().toISOString()}" Sello="${digitalStamp}" FormaPago="${receiver.paymentForm || "01"}" NoCertificado="${satCertificateNumber}" SubTotal="${(sale.subtotal / 100).toFixed(2)}" Descuento="${(sale.discountTotal / 100).toFixed(2)}" Moneda="${sale.currency}" Total="${totalFormatted}" TipoDeComprobante="I" Exportacion="01" MetodoPago="${receiver.paymentMethod || "PUE"}" LugarExpedicion="${issuerPostalCode}">
  <cfdi:Emisor Rfc="${issuerRfc}" Nombre="${issuerName}" RegimenFiscal="${issuerRegime}"/>
  <cfdi:Receptor Rfc="${receiver.rfc}" Nombre="${receiver.name}" DomicilioFiscalReceptor="${receiver.postalCode}" RegimenFiscalReceptor="${receiver.regime}" UsoCFDI="${receiver.cfdiUse}"/>
  <cfdi:Conceptos>
${lines
  .map(
    (l) => `    <cfdi:Concepto ClaveProdServ="50202301" NoIdentificacion="${l.sku}" Cantidad="${l.quantity}" ClaveUnidad="H87" Unidad="Pieza" Descripcion="${l.description}" ValorUnitario="${(l.unitPrice / 100).toFixed(2)}" Importe="${(l.lineTotal / 100).toFixed(2)}" Descuento="${(l.discountAmount / 100).toFixed(2)}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${(l.netAmount / 100).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${(l.taxAmount / 100).toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`,
  )
  .join("\n")}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${(sale.taxTotal / 100).toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${(sale.subtotal / 100).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${(sale.taxTotal / 100).toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${fiscalUuid}" FechaTimbrado="${new Date().toISOString()}" RfcProvCertif="SIMULADO" SelloCFD="${digitalStamp}" NoCertificadoSAT="${satCertificateNumber}" SelloSAT="${satSeal}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

  // Folio, factura y bitácora en una sola transacción: si algo falla, no queda nada a medias.
  return db.transaction(async (tx) => {
    const seq = await nextFolio(tx, {
      tenantId: ctx.tenantId,
      companyId: company.id,
      branchId: sale.branchId,
      documentType: "invoice",
    });
    const [createdInvoice] = await tx
      .insert(invoices)
      .values({
        tenantId: ctx.tenantId,
        companyId: company.id,
        branchId: sale.branchId,
        saleId: sale.id,
        folio: seq.folio,
        fiscalUuid,
        issuerRfc,
        issuerName,
        issuerRegime,
        receiverRfc: receiver.rfc.toUpperCase(),
        receiverName: receiver.name.toUpperCase(),
        receiverRegime: receiver.regime,
        receiverPostalCode: receiver.postalCode,
        cfdiUse: receiver.cfdiUse,
        subtotal: sale.subtotal,
        discountTotal: sale.discountTotal,
        taxTotal: sale.taxTotal,
        total: sale.total,
        currency: sale.currency,
        paymentMethod: receiver.paymentMethod || "PUE",
        paymentForm: receiver.paymentForm || "01",
        status: "issued",
        xmlContent: buildXml(seq.series, seq.number),
        qrData,
        digitalStamp,
        satSeal,
        satCertificateNumber,
        createdBy: ctx.userId,
      })
      .returning();
    await recordAudit(tx, ctx.actor, {
      action: "invoicing.issue",
      entity: "invoice",
      entityId: createdInvoice.id,
      companyId: company.id,
      after: {
        folio: seq.folio,
        fiscalUuid,
        simulated: true,
        saleFolio: sale.folio,
        total: sale.total,
        receiverRfc: receiver.rfc,
      },
    });
    return createdInvoice;
  });
}

export async function listInvoices(
  ctx: ServiceContext,
  params?: {
    q?: string;
    limit?: number;
  },
) {
  requirePermission(ctx, "invoicing.view");
  if (!ctx.company) throw new NotFoundError("La empresa");
  const company = ctx.company;
  const limit = Math.min(params?.limit ?? 50, 100);

  const conditions = [eq(invoices.companyId, company.id)];

  if (params?.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    conditions.push(
      or(
        ilike(invoices.folio, term),
        ilike(invoices.fiscalUuid, term),
        ilike(invoices.receiverRfc, term),
        ilike(invoices.receiverName, term),
      )!,
    );
  }

  const rows = await db
    .select({
      id: invoices.id,
      folio: invoices.folio,
      fiscalUuid: invoices.fiscalUuid,
      saleId: invoices.saleId,
      receiverRfc: invoices.receiverRfc,
      receiverName: invoices.receiverName,
      total: invoices.total,
      currency: invoices.currency,
      status: invoices.status,
      issuedAt: invoices.issuedAt,
    })
    .from(invoices)
    .where(and(...conditions))
    .orderBy(desc(invoices.issuedAt))
    .limit(limit);

  return rows;
}

export async function getInvoiceById(ctx: ServiceContext, id: string) {
  requirePermission(ctx, "invoicing.view");
  if (!ctx.company) throw new NotFoundError("La empresa");
  const company = ctx.company;

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.companyId, company.id)))
    .limit(1);

  if (!invoice) {
    throw new NotFoundError("Factura no encontrada.");
  }

  return invoice;
}

export async function cancelInvoice(ctx: ServiceContext, id: string, reason: string) {
  requirePermission(ctx, "invoicing.cancel");
  if (!ctx.company) throw new NotFoundError("La empresa");
  const company = ctx.company;

  const invoice = await getInvoiceById(ctx, id);
  if (invoice.status === "cancelled") {
    throw new ConflictError("Esta factura ya se encuentra cancelada.");
  }

  const [cancelled] = await db
    .update(invoices)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: reason || "Cancelación a solicitud del cliente",
    })
    .where(and(eq(invoices.id, id), eq(invoices.companyId, company.id)))
    .returning();

  await recordAudit(db, ctx.actor, {
    action: "invoicing.cancel",
    entity: "invoice",
    entityId: id,
    companyId: company.id,
    after: {
      status: "cancelled",
      reason,
    },
  });

  return cancelled;
}
