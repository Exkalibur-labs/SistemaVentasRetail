import { withApi } from "@/server/api";
import { addCashMovement } from "@/server/modules/cash/service";

export const dynamic = "force-dynamic";

/** Registra una entrada (depósito) o salida (retiro) de efectivo desde el punto de venta. */
export const POST = withApi(async (req, ctx) => {
  const body = await req.json();
  const movement = await addCashMovement(ctx, body);
  return {
    ok: true,
    movement: {
      id: movement.id,
      kind: movement.kind,
      amount: movement.amount,
      reason: movement.reason,
      createdAt: movement.createdAt,
    },
  };
});
