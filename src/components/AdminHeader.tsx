import Link from "next/link";
import { RESTAURANT } from "@/lib/config";

export function AdminHeader({ current }: { current: "orders" | "menu" }) {
  const tab = (key: "orders" | "menu", href: string, label: string) => (
    <Link
      href={href}
      aria-current={current === key ? "page" : undefined}
      className={`rounded-full px-4 py-2 text-sm font-medium ${
        current === key ? "bg-white text-green-deep" : "text-white/80 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="bg-green-deep text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <span className="font-bold">{RESTAURANT.name} · Admin</span>
        <nav className="flex gap-1" aria-label="Admin bo'limlari">
          {tab("orders", "/admin", "Buyurtmalar")}
          {tab("menu", "/admin/menu", "Menyu")}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/" className="text-white/80 hover:text-white">
            Saytga
          </Link>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="text-white/80 hover:text-white">
              Chiqish
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
