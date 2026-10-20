import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPoller } from "@/components/StatusPoller";
import { formatSum, RESTAURANT } from "@/lib/config";
import { TIMELINE, statusLabel } from "@/lib/order-status";
import { getOrderByCode } from "@/lib/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: `Buyurtma holati — ${RESTAURANT.name}`, robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Z0-9]{10}$/.test(code)) notFound();
  const order = await getOrderByCode(code);
  if (!order) notFound();

  const cancelled = order.status === "cancelled";
  const reached = TIMELINE.indexOf(order.status);
  const phoneHref = `tel:${RESTAURANT.phone.replace(/[^\d+]/g, "")}`;

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-14">
      <StatusPoller code={order.code} status={order.status} />
      <Link href="/" className="text-sm font-medium text-green hover:underline">
        ← {RESTAURANT.name}
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">Buyurtma #{order.id}</h1>
      <p className="mt-2 text-muted">
        {cancelled
          ? "Buyurtma bekor qilindi. Savollar bo'lsa, qo'ng'iroq qiling."
          : order.status === "done"
            ? "Yoqimli ishtaha!"
            : `Taxminan ${RESTAURANT.etaMinutes} daqiqada ${order.delivery ? "yetkazamiz" : "tayyor bo'ladi"}. Bu sahifa o'zi yangilanadi.`}
      </p>

      {cancelled ? (
        <p className="mt-8 rounded-2xl bg-danger/10 px-5 py-4 font-semibold text-danger">
          {statusLabel("cancelled", order.delivery)}
        </p>
      ) : (
        <ol className="mt-8 grid gap-0" aria-label="Buyurtma bosqichlari">
          {TIMELINE.map((s, i) => {
            const done = i <= reached;
            const current = i === reached;
            return (
              <li key={s} className="flex gap-4" aria-current={current ? "step" : undefined}>
                <div className="flex flex-col items-center">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                      done ? "bg-green text-white" : "border-2 border-line bg-white text-muted"
                    } ${current ? "ring-4 ring-saffron/60" : ""}`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {i < TIMELINE.length - 1 ? (
                    <span className={`w-0.5 flex-1 ${i < reached ? "bg-green" : "bg-line"}`} aria-hidden="true" />
                  ) : null}
                </div>
                <p className={`pt-1 pb-6 ${current ? "font-bold" : done ? "font-medium" : "text-muted"}`}>
                  {statusLabel(s, order.delivery)}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <section aria-labelledby="items-title" className="mt-4 rounded-2xl border border-line bg-white p-5">
        <h2 id="items-title" className="font-bold">
          Tarkibi
        </h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {order.items.map((it) => (
            <li key={it.dishId} className="flex justify-between gap-4">
              <span>
                {it.name} × {it.qty}
              </span>
              <span className="tabular-nums">{formatSum(it.price * it.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-1 border-t border-line pt-3 text-sm">
          {order.delivery ? (
            <div className="flex justify-between">
              <dt className="text-muted">Yetkazib berish</dt>
              <dd>{order.deliveryFee === 0 ? "Bepul" : formatSum(order.deliveryFee)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-bold">
            <dt>Jami</dt>
            <dd>{formatSum(order.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">To&apos;lov</dt>
            <dd>{order.payment === "card" ? "Karta" : "Naqd"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted">
          {order.delivery ? `Manzil: ${order.address}` : `Olib ketish: ${RESTAURANT.address}`}
        </p>
      </section>

      <p className="mt-6 text-sm text-muted">
        Savol bo&apos;lsa:{" "}
        <a href={phoneHref} className="font-semibold text-green hover:underline">
          {RESTAURANT.phone}
        </a>
      </p>
    </main>
  );
}
