import { sql } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { branches, companies, tenants } from "./organization";
import { sales } from "./sales";
import { users } from "./identity";

const money = (name: string) => bigint(name, { mode: "number" });

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
    saleId: uuid("sale_id").references(() => sales.id, { onDelete: "set null" }),

    folio: text("folio").notNull(),
    fiscalUuid: text("fiscal_uuid").notNull(),

    // Emisor
    issuerRfc: text("issuer_rfc").notNull(),
    issuerName: text("issuer_name").notNull(),
    issuerRegime: text("issuer_regime").notNull(),

    // Receptor
    receiverRfc: text("receiver_rfc").notNull(),
    receiverName: text("receiver_name").notNull(),
    receiverRegime: text("receiver_regime").notNull(),
    receiverPostalCode: text("receiver_postal_code").notNull(),
    cfdiUse: text("cfdi_use").notNull(),

    // Montos
    subtotal: money("subtotal").notNull(),
    discountTotal: money("discount_total").notNull().default(0),
    taxTotal: money("tax_total").notNull().default(0),
    total: money("total").notNull(),
    currency: text("currency").notNull().default("MXN"),

    // Pago SAT
    paymentMethod: text("payment_method").notNull().default("PUE"), // PUE | PPD
    paymentForm: text("payment_form").notNull().default("01"), // 01 Efectivo, 03 Transferencia, 04 Tarjeta Crédito, 28 Tarjeta Débito

    // Estado fiscal
    status: text("status").$type<"issued" | "cancelled">().notNull().default("issued"),
    xmlContent: text("xml_content"),
    qrData: text("qr_data"),
    digitalStamp: text("digital_stamp"),
    satSeal: text("sat_seal"),
    satCertificateNumber: text("sat_certificate_number"),

    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().default(sql`now()`),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("invoices_fiscal_uuid_idx").on(t.fiscalUuid),
    index("invoices_company_idx").on(t.companyId, t.issuedAt),
    index("invoices_sale_idx").on(t.saleId),
  ],
);
