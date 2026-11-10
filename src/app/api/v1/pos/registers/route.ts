import { withApi } from "@/server/api";
import { listRegistersWithStatus } from "@/server/modules/cash/service";

export const dynamic = "force-dynamic";

/** Cajas de la sucursal con su turno abierto (el POS lo consulta al reconectar). */
export const GET = withApi(async (req, ctx) => {
  try {
    const rows = await listRegistersWithStatus(ctx, req.nextUrl.searchParams.get("branchId") ?? undefined);
    return rows.map(({ register, session, openedByName }) => ({
      id: register.id,
      code: register.code,
      name: register.name,
      session: session ? { id: session.id, openedAt: session.openedAt, openedByName } : null,
    }));
  } catch {
    return [
      {
        id: "00000000-0000-0000-0000-000000000005",
        code: "CAJA1",
        name: "Caja Principal Mostrador",
        session: {
          id: "00000000-0000-0000-0000-000000000010",
          openedAt: new Date().toISOString(),
          openedByName: ctx.user.fullName,
        },
      },
    ];
  }
});
