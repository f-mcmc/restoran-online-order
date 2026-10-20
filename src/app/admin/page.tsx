import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { AutoRefresh } from "@/components/AutoRefresh";
import { isAdmin } from "@/lib/auth";
import { formatSum } from "@/lib/config";
import { canCancel, nextActionLabel, statusLabel, type OrderStatus } from "@/lib/order-status";
import { listOrdersForAdmin, todayStats, topDishes, type Order } from "@/lib/orders";
import { formatUzPhone } from "@/lib/phone";
import { advanceOrderAction, cancelOrderAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Buyurtmalar — admin", robots: { index: false } };

const timeFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit" });

const badge: Record<OrderStatus, string> = {
  new: "bg-saffron text-ink",
  cooking: "bg-orange-100 text-orange-900",
  on_way: "bg-sky-100 text-sky-900",
  done: "bg-green-soft text-green-deep",
  cancelled: "bg-danger/10 text-danger",
};

function minutesAgo(date: Date, now: number): string {
  const min = Math.max(0, Math.round((now - date.getTime()) / 60000));
  if (min < 1) return "hozirgina";
  if (min < 60) return `${min} daq. oldin`;
  return `${Math.floor(min / 60)} soat ${min % 60} daq. oldin`;
}

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [{ active, closedToday }, stats, top] = await Promise.all([listOrdersForAdmin(), todayStats(), topDishes()]);
  const now = Date.now();

  return (
    <>
      <AdminHeader current="orders" />
      <AutoRefresh seconds={15} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section aria-label="Bugungi ko'rsatkichlar" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Bugun buyurtmalar" value={String(stats.orders)} />
          <Stat label="Bugungi tushum" value={formatSum(stats.revenue)} />
          <Stat label="O'rtacha chek" value={formatSum(stats.averageCheck)} />
          <Stat label="Bekor qilingan" value={String(stats.cancelled)} />
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_280px]">
          <section aria-labelledby="active-title">
            <div className="flex items-baseline justify-between gap-4">
              <h1 id="active-title" className="text-2xl font-bold">
                Faol buyurtmalar <span className="text-muted">({active.length})</span>
              </h1>
              <p className="text-xs text-muted">Sahifa o&apos;zi yangilanadi</p>
            </div>
            {active.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-line px-5 py-10 text-center text-muted">
                Hozircha yangi buyurtma yo&apos;q.
              </p>
            ) : (
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {active.map((o) => (
                  <OrderCard key={o.id} order={o} now={now} />
                ))}
              </ul>
            )}

            <h2 className="mt-12 text-xl font-bold">Bugun yopilganlar</h2>
            {closedToday.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Hali yo&apos;q.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-line text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Vaqt</th>
                      <th className="px-4 py-3 font-medium">Mijoz</th>
                      <th className="px-4 py-3 font-medium">Summa</th>
                      <th className="px-4 py-3 font-medium">Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedToday.map((o) => (
                      <tr key={o.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-semibold">{o.id}</td>
                        <td className="px-4 py-3 tabular-nums">{timeFmt.format(o.createdAt)}</td>
                        <td className="px-4 py-3">{o.customerName}</td>
                        <td className="px-4 py-3 tabular-nums">{formatSum(o.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge[o.status]}`}>
                            {statusLabel(o.status, o.delivery)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside aria-labelledby="top-title">
            <h2 id="top-title" className="text-xl font-bold">
              7 kunda eng ko&apos;p sotilgan
            </h2>
            {top.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Ma&apos;lumot yo&apos;q.</p>
            ) : (
              <ol className="mt-3 grid gap-2">
                {top.map((d, i) => (
                  <li key={d.name} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted">{i + 1}</span>
                      {d.name}
                    </span>
                    <span className="font-semibold tabular-nums">{d.qty} ta</span>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
    </div>
  );
}

function OrderCard({ order: o, now }: { order: Order; now: number }) {
  const action = nextActionLabel(o.status, o.delivery);
  const phone = formatUzPhone(o.phone);
  return (
    <li className={`flex flex-col rounded-2xl border bg-white p-5 ${o.status === "new" ? "border-saffron ring-2 ring-saffron/40" : "border-line"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">
            #{o.id} · {formatSum(o.total)}
          </p>
          <p className="text-sm text-muted">
            {timeFmt.format(o.createdAt)} · {minutesAgo(o.createdAt, now)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge[o.status]}`}>
          {statusLabel(o.status, o.delivery)}
        </span>
      </div>

      <ul className="mt-4 grid gap-1 text-sm">
        {o.items.map((it) => (
          <li key={it.dishId} className="flex justify-between gap-3">
            <span>{it.name}</span>
            <span className="font-semibold tabular-nums">× {it.qty}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid gap-1 border-t border-line pt-3 text-sm">
        <div>
          <dt className="sr-only">Mijoz</dt>
          <dd>
            {o.customerName},{" "}
            <a href={`tel:${o.phone}`} className="font-medium text-green hover:underline">
              {phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="sr-only">Olish usuli</dt>
          <dd>{o.delivery ? `🛵 ${o.address}` : "🏃 Olib ketadi"}</dd>
        </div>
        <div>
          <dt className="sr-only">To&apos;lov</dt>
          <dd className="text-muted">To&apos;lov: {o.payment === "card" ? "karta" : "naqd"}</dd>
        </div>
        {o.comment ? (
          <div>
            <dt className="sr-only">Izoh</dt>
            <dd className="rounded-lg bg-saffron/20 px-3 py-2">💬 {o.comment}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {action ? (
          <form action={advanceOrderAction} className="flex-1">
            <input type="hidden" name="id" value={o.id} />
            <input type="hidden" name="from" value={o.status} />
            <button type="submit" className="w-full rounded-xl bg-green px-4 py-2.5 font-semibold text-white hover:bg-green-deep">
              {action}
            </button>
          </form>
        ) : null}
        {canCancel(o.status) ? (
          <form action={cancelOrderAction}>
            <input type="hidden" name="id" value={o.id} />
            <button type="submit" className="rounded-xl border border-line px-4 py-2.5 font-medium text-danger hover:bg-danger/10">
              Bekor qilish
            </button>
          </form>
        ) : null}
      </div>
    </li>
  );
}
