import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/context";
import { NotFoundError } from "@/server/errors";
import { getSale } from "@/server/modules/sales/service";
import { toTicketData } from "@/server/modules/sales/ticket";
import { AutoPrint } from "./auto-print";
import { TicketClientView } from "./ticket-client-view";

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ imprimir?: string; ancho?: string }>;
}) {
  const ctx = await requirePagePermission("pos.sell");
  const { id } = await params;
  const { imprimir, ancho } = await searchParams;
  let d;
  try {
    d = await getSale(ctx, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const ticketData = toTicketData(d);
  const initialWidth = (ancho === "58" || ancho === "58mm") ? "58mm" : (ticketData.format ?? "80mm");

  return (
    <>
      <TicketClientView ticket={ticketData} initialWidth={initialWidth} />
      <AutoPrint enabled={imprimir === "1"} />
    </>
  );
}
