"use client";

import { useState } from "react";
import { Ticket, type TicketData } from "@/components/pos/ticket";
import { PrintToolbar } from "./print-toolbar";

export function TicketClientView({
  ticket,
  initialWidth = "80mm",
}: {
  ticket: TicketData;
  initialWidth?: "58mm" | "80mm";
}) {
  const [width, setWidth] = useState<"58mm" | "80mm">(initialWidth);

  return (
    <div className="py-4">
      <PrintToolbar ticket={ticket} initialWidth={width} onWidthChange={setWidth} />
      <Ticket t={ticket} width={width} />
    </div>
  );
}
