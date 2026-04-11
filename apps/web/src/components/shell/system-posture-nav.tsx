import Link from "next/link";

type SystemPostureNavItem = {
  label: string;
  href: string;
  description: string;
};

export function SystemPostureNav({
  title,
  items
}: {
  title: string;
  items: SystemPostureNavItem[];
}) {
  return (
    <section className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">System Posture</p>
      <h2 className="mt-3 font-headline text-3xl text-foreground">{title}</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {items.map((item, index) => (
          <Link key={`${item.href}-${item.label}-${index}`} href={item.href} className="rounded-[1.5rem] bg-white/80 p-5 shadow-ambient transition hover:translate-y-[-1px]">
            <p className="text-sm font-semibold text-primary">{item.label}</p>
            <p className="mt-3 text-sm leading-6 text-foreground/70">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

