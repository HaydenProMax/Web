import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

type ModuleCardProps = {
  title: string;
  description: string;
  href?: string;
  eyebrow?: string;
  children?: ReactNode;
};

export function ModuleCard({
  title,
  description,
  href,
  eyebrow,
  children
}: ModuleCardProps) {
  const body = (
    <div className="rounded-[2rem] bg-surface-container-low p-6 shadow-ambient transition-transform hover:-translate-y-1">
      {eyebrow ? (
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      ) : null}
      <h2 className="font-headline text-2xl text-foreground">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-foreground/70">{description}</p>
      {children ? <div className="mt-6">{children}</div> : null}
      {href && children ? (
        <div className="mt-6">
          <Link href={href as Route} className="text-sm font-semibold text-primary">
            Open module
          </Link>
        </div>
      ) : null}
    </div>
  );

  if (!href || children) {
    return body;
  }

  return <Link href={href as Route}>{body}</Link>;
}
