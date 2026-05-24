"use client";

import { useEffect, useState } from "react";

type WritingFeedbackToastItem = {
  tone: "success" | "warning" | "error";
  text: string;
};

type WritingFeedbackToastProps = {
  items: WritingFeedbackToastItem[];
};

const QUERY_KEYS_TO_CLEAR = [
  "archived",
  "confirmDelete",
  "created",
  "deleted",
  "destroyed",
  "error",
  "published",
  "restored",
  "saved"
];

function toastClassName(tone: WritingFeedbackToastItem["tone"]) {
  if (tone === "error") {
    return "bg-rose-700 text-white";
  }

  if (tone === "warning") {
    return "bg-amber-500 text-white";
  }

  return "bg-foreground text-white";
}

export function WritingFeedbackToast({ items }: WritingFeedbackToastProps) {
  const [visible, setVisible] = useState(items.length > 0);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    setVisible(true);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 3000);

    const clearTimer = window.setTimeout(() => {
      const nextUrl = new URL(window.location.href);
      QUERY_KEYS_TO_CLEAR.forEach((key) => {
        nextUrl.searchParams.delete(key);
      });
      window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    }, 3300);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [items]);

  if (!visible || items.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4">
      <div className="flex max-w-3xl flex-col items-center gap-2">
        {items.map((item) => (
          <div
            key={item.text}
            className={`rounded-full px-5 py-3 text-sm font-semibold shadow-ambient transition-opacity ${toastClassName(item.tone)}`}
          >
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}
