CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"sale_id" uuid,
	"folio" text NOT NULL,
	"fiscal_uuid" text NOT NULL,
	"issuer_rfc" text NOT NULL,
	"issuer_name" text NOT NULL,
	"issuer_regime" text NOT NULL,
	"receiver_rfc" text NOT NULL,
	"receiver_name" text NOT NULL,
	"receiver_regime" text NOT NULL,
	"receiver_postal_code" text NOT NULL,
	"cfdi_use" text NOT NULL,
	"subtotal" bigint NOT NULL,
	"discount_total" bigint DEFAULT 0 NOT NULL,
	"tax_total" bigint DEFAULT 0 NOT NULL,
	"total" bigint NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"payment_method" text DEFAULT 'PUE' NOT NULL,
	"payment_form" text DEFAULT '01' NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"xml_content" text,
	"qr_data" text,
	"digital_stamp" text,
	"sat_seal" text,
	"sat_certificate_number" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_fiscal_uuid_idx" ON "invoices" USING btree ("fiscal_uuid");--> statement-breakpoint
CREATE INDEX "invoices_company_idx" ON "invoices" USING btree ("company_id","issued_at");--> statement-breakpoint
CREATE INDEX "invoices_sale_idx" ON "invoices" USING btree ("sale_id");