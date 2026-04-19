"use client";

import { useEffect, useState } from "react";

type CheckInFeedbackToastProps = {
  tone: "success" | "error";
  message: string;
};

export function CheckInFeedbackToast({ tone, message }: CheckInFeedbackToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 2200);

    const clearTimer = window.setTimeout(() => {
      const nextUrl = new URL(window.location.href);
      ["created", "updated", "archived", "error"].forEach((key) => {
        nextUrl.searchParams.delete(key);
      });
      window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    }, 2500);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4">
      <div className={tone === "success"
        ? "rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white shadow-ambient"
        : "rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-ambient"}>
        {message}
      </div>
    </div>
  );
}
