"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";

import type { ActivityFocusKey } from "@/lib/activity-focus";
import { getActivityFocusCookieConfig } from "@/lib/activity-focus";

type ActivityFocusLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
  href: string;
  focus: ActivityFocusKey;
  children: ReactNode;
};

export function ActivityFocusLink({ href, focus, onClick, children, ...props }: ActivityFocusLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const cookie = getActivityFocusCookieConfig(focus);
    document.cookie = cookie.name + "=" + cookie.value + "; path=" + cookie.options.path + "; max-age=" + cookie.options.maxAge + "; samesite=" + cookie.options.sameSite;
    onClick?.(event);
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
