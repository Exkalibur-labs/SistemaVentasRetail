import Link from "next/link";
import { cx } from "@/components/ui";

export type SectionTabItem = {
  href: string;
  label: string;
  show?: boolean;
  disabled?: boolean;
  tooltip?: string;
};

/** Pestañas de sección (server). `active` es el href de la pestaña actual. */
export function SectionTabs({ tabs, active }: { tabs: Array<SectionTabItem>; active: string }) {
  const visible = tabs.filter((t) => t.show !== false);
  if (visible.length < 2) return null;
  return (
    <nav aria-label="Secciones" className="-mt-2 mb-5 flex items-center gap-1 overflow-x-auto border-b border-border">
      {visible.map((t) => {
        if (t.disabled) {
          return (
            <span
              key={t.href}
              title={t.tooltip ?? "Próximamente · Módulo en desarrollo"}
              className="group flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted/50 cursor-not-allowed select-none transition hover:bg-surface-2/30"
              aria-disabled="true"
            >
              <span className="opacity-70">{t.label}</span>
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted border border-border/60 group-hover:border-primary/40 group-hover:text-primary transition">
                Próx.
              </span>
            </span>
          );
        }
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === active ? "page" : undefined}
            className={cx(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition",
              t.href === active ? "border-primary text-primary" : "border-transparent text-muted hover:text-text",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
