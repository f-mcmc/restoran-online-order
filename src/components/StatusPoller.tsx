"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Buyurtma holati o'zgarsa sahifani yangilaydi. Yakuniy holatda to'xtaydi. */
export function StatusPoller({ code, status }: { code: string; status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status === "done" || status === "cancelled") return;
    let stopped = false;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/orders/${code}`, { cache: "no-store" });
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (!stopped && typeof data === "object" && data !== null && "status" in data && data.status !== status) {
          router.refresh();
        }
      } catch {
        // Internet uzilsa keyingi urinishda davom etadi
      }
    }, 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [code, status, router]);

  return null;
}
