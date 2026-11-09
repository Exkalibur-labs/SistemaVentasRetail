import { ButtonLink, Card, PageHeader } from "@/components/ui";

export function ComingSoonView({
  title,
  description,
  phase = "Fase 4",
}: {
  title: string;
  description: string;
  phase?: string;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description="Módulo en desarrollo y preparación para el ecosistema retail."
      />
      <Card className="max-w-2xl py-12 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-clock"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight">Próximamente disponible</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          {description}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Planificado para {phase}
          </span>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/pos">Ir al Punto de Venta</ButtonLink>
          <ButtonLink variant="secondary" href="/">
            Volver al Inicio
          </ButtonLink>
        </div>
      </Card>
    </>
  );
}
