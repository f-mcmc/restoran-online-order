"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { deliveryFeeFor, formatSum, RESTAURANT } from "@/lib/config";
import { normalizeUzPhone } from "@/lib/phone";

export interface MenuDish {
  id: number;
  name: string;
  description: string;
  price: number;
}

export interface MenuCategory {
  id: number;
  name: string;
  dishes: MenuDish[];
}

type Cart = Record<number, number>;

const CART_KEY = "bahor-cart-v1";
const MAX_QTY = 50;

function readCart(): Cart {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const cart: Cart = {};
    for (const [k, v] of Object.entries(parsed)) {
      const id = Number(k);
      if (Number.isInteger(id) && typeof v === "number" && v > 0) cart[id] = Math.min(Math.floor(v), MAX_QTY);
    }
    return cart;
  } catch {
    return {};
  }
}

function writeCart(cart: Cart): void {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // Brauzer xotirasi yopiq bo'lsa (yashirin rejim) — savat faqat sahifa ochiq turganda saqlanadi
  }
}

export function OrderApp({ categories }: { categories: MenuCategory[] }) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>({});
  const [loaded, setLoaded] = useState(false);
  const [activeCat, setActiveCat] = useState<number | null>(categories[0]?.id ?? null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const dishById = useMemo(() => {
    const map = new Map<number, MenuDish>();
    for (const c of categories) for (const d of c.dishes) map.set(d.id, d);
    return map;
  }, [categories]);

  // Savatni tiklash; menyudan olib tashlangan taomlar savatdan ham chiqadi
  useEffect(() => {
    const saved = readCart();
    const clean: Cart = {};
    for (const [id, qty] of Object.entries(saved)) if (dishById.has(Number(id))) clean[Number(id)] = qty;
    setCart(clean);
    setLoaded(true);
  }, [dishById]);

  useEffect(() => {
    if (loaded) writeCart(cart);
  }, [cart, loaded]);

  // Qaysi bo'lim ko'rinib turganini kuzatish (yuqoridagi tugmalar uchun)
  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(`cat-${c.id}`))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first) setActiveCat(Number(first.target.id.slice(4)));
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    for (const s of sections) observer.observe(s);
    return () => observer.disconnect();
  }, [categories]);

  const lines = Object.entries(cart)
    .map(([id, qty]) => {
      const dish = dishById.get(Number(id));
      return dish ? { dish, qty } : null;
    })
    .filter((l): l is { dish: MenuDish; qty: number } => l !== null);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.dish.price, 0);

  function change(id: number, delta: number) {
    setCart((prev) => {
      const next = { ...prev };
      const qty = Math.min((next[id] ?? 0) + delta, MAX_QTY);
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  function openCheckout() {
    dialogRef.current?.showModal();
  }

  return (
    <>
      <nav
        aria-label="Menyu bo'limlari"
        className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
          {categories.map((c) => (
            <a
              key={c.id}
              href={`#cat-${c.id}`}
              aria-current={activeCat === c.id ? "true" : undefined}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                activeCat === c.id
                  ? "border-green bg-green text-white"
                  : "border-line bg-white text-muted hover:text-ink"
              }`}
            >
              {c.name}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 pb-32">
        {categories.length === 0 ? (
          <p className="py-16 text-center text-muted">Hozircha menyu bo&apos;sh.</p>
        ) : null}
        {categories.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`cat-title-${c.id}`} className="pt-10">
            <h2 id={`cat-title-${c.id}`} className="text-2xl font-bold sm:text-3xl">
              {c.name}
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {c.dishes.map((d) => {
                const qty = cart[d.id] ?? 0;
                return (
                  <li key={d.id} className="flex flex-col rounded-2xl border border-line bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold leading-snug">{d.name}</h3>
                      <span className="shrink-0 font-semibold text-green">{formatSum(d.price)}</span>
                    </div>
                    {d.description ? <p className="mt-1 text-sm text-muted">{d.description}</p> : null}
                    <div className="mt-auto pt-4">
                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => change(d.id, 1)}
                          className="rounded-xl bg-green-soft px-4 py-2.5 font-medium text-green-deep hover:bg-green hover:text-white"
                        >
                          Savatga qo&apos;shish
                        </button>
                      ) : (
                        <QtyControl name={d.name} qty={qty} onChange={(delta) => change(d.id, delta)} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3 sm:p-4">
          <button
            type="button"
            onClick={openCheckout}
            className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 rounded-2xl bg-green px-5 py-4 text-white shadow-lg shadow-green-deep/30 hover:bg-green-deep"
          >
            <span className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-saffron text-sm font-bold text-ink">
                {count}
              </span>
              <span className="font-semibold">Buyurtma berish</span>
            </span>
            <span className="font-semibold">{formatSum(subtotal)}</span>
          </button>
        </div>
      ) : null}

      <CheckoutDialog
        dialogRef={dialogRef}
        lines={lines}
        subtotal={subtotal}
        onChange={change}
        onUnavailable={() => router.refresh()}
        onSuccess={(code) => {
          setCart({});
          writeCart({});
          dialogRef.current?.close();
          router.push(`/order/${code}`);
        }}
      />
    </>
  );
}

function QtyControl({ name, qty, onChange }: { name: string; qty: number; onChange: (delta: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-line" role="group" aria-label={`${name} soni`}>
      <button
        type="button"
        onClick={() => onChange(-1)}
        aria-label="Bittaga kamaytirish"
        className="grid size-10 place-items-center rounded-l-xl text-xl hover:bg-green-soft"
      >
        −
      </button>
      <span className="min-w-8 text-center font-semibold tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(1)}
        disabled={qty >= MAX_QTY}
        aria-label="Bittaga ko'paytirish"
        className="grid size-10 place-items-center rounded-r-xl text-xl hover:bg-green-soft disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

interface CheckoutProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  lines: { dish: MenuDish; qty: number }[];
  subtotal: number;
  onChange: (id: number, delta: number) => void;
  onUnavailable: () => void;
  onSuccess: (code: string) => void;
}

function CheckoutDialog({ dialogRef, lines, subtotal, onChange, onUnavailable, onSuccess }: CheckoutProps) {
  const [delivery, setDelivery] = useState(true);
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fee = deliveryFeeFor(subtotal, delivery);
  const total = subtotal + fee;
  const short = Math.max(RESTAURANT.minOrder - subtotal, 0);

  // Savat bo'shab qolsa oyna yopiladi
  useEffect(() => {
    if (lines.length === 0) dialogRef.current?.close();
  }, [lines.length, dialogRef]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "");
    const address = String(form.get("address") ?? "").trim();

    if (short > 0) return setError(`Minimal buyurtma — ${formatSum(RESTAURANT.minOrder)}.`);
    if (name.length < 2) return setError("Ismingizni yozing.");
    if (!normalizeUzPhone(phone)) return setError("Telefon raqamini to'liq yozing: +998 90 123 45 67.");
    if (delivery && address.length < 5) return setError("Yetkazib berish manzilini yozing.");

    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ dishId: l.dish.id, qty: l.qty })),
          name,
          phone,
          delivery,
          address,
          comment: String(form.get("comment") ?? ""),
          payment,
          website: String(form.get("website") ?? ""),
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (res.ok && typeof data === "object" && data !== null && "code" in data && typeof data.code === "string") {
        onSuccess(data.code);
        return;
      }
      const message =
        typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
          ? data.error
          : "Xatolik yuz berdi, qayta urinib ko'ring.";
      setError(message);
      if (typeof data === "object" && data !== null && "code" in data && data.code === "unavailable") onUnavailable();
    } catch {
      setError("Internet bilan aloqa yo'q. Qayta urinib ko'ring.");
    } finally {
      setSending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="checkout-title"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-3xl bg-paper p-0 text-ink sm:m-auto sm:max-w-lg sm:rounded-3xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <form onSubmit={submit} noValidate className="flex max-h-[92dvh] flex-col">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="checkout-title" className="text-xl font-bold">
            Buyurtma
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Yopish"
            className="grid size-9 place-items-center rounded-full text-2xl leading-none text-muted hover:bg-line"
          >
            ×
          </button>
        </header>

        <div className="grid gap-5 overflow-y-auto px-5 py-5">
          <ul className="grid gap-3">
            {lines.map(({ dish, qty }) => (
              <li key={dish.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{dish.name}</p>
                  <p className="text-sm text-muted">{formatSum(dish.price * qty)}</p>
                </div>
                <QtyControl name={dish.name} qty={qty} onChange={(d) => onChange(dish.id, d)} />
              </li>
            ))}
          </ul>

          <fieldset className="grid grid-cols-2 gap-2 rounded-2xl bg-line/60 p-1">
            <legend className="sr-only">Qanday olasiz</legend>
            {(
              [
                [true, "Yetkazib berish"],
                [false, "Olib ketaman"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={label}
                className={`cursor-pointer rounded-xl py-2.5 text-center font-medium ${
                  delivery === value ? "bg-white shadow-sm" : "text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="delivery"
                  className="sr-only"
                  checked={delivery === value}
                  onChange={() => setDelivery(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="grid gap-3">
            <Field label="Ismingiz">
              <input name="name" autoComplete="name" required maxLength={60} className={inputClass} />
            </Field>
            <Field label="Telefon">
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                defaultValue="+998 "
                required
                maxLength={20}
                className={inputClass}
              />
            </Field>
            {delivery ? (
              <Field label="Manzil">
                <textarea
                  name="address"
                  rows={2}
                  required
                  maxLength={200}
                  placeholder="Ko'cha, uy, xonadon, mo'ljal"
                  className={inputClass}
                />
              </Field>
            ) : (
              <p className="rounded-xl bg-green-soft px-4 py-3 text-sm text-green-deep">
                Olib ketish manzili: {RESTAURANT.address}
              </p>
            )}
            <Field label="Izoh (ixtiyoriy)">
              <input name="comment" maxLength={300} placeholder="Masalan: piyozsiz" className={inputClass} />
            </Field>
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">To&apos;lov</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["cash", "Naqd"],
                  ["card", "Karta (kuryerga / kassada)"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-medium ${
                    payment === value ? "border-green bg-green-soft text-green-deep" : "border-line bg-white text-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={value}
                    className="sr-only"
                    checked={payment === value}
                    onChange={() => setPayment(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <dl className="grid gap-1.5 rounded-2xl bg-white p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Taomlar</dt>
              <dd>{formatSum(subtotal)}</dd>
            </div>
            {delivery ? (
              <div className="flex justify-between">
                <dt className="text-muted">Yetkazib berish</dt>
                <dd>{fee === 0 ? "Bepul" : formatSum(fee)}</dd>
              </div>
            ) : null}
            <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-bold">
              <dt>Jami</dt>
              <dd>{formatSum(total)}</dd>
            </div>
            {delivery && fee > 0 ? (
              <p className="pt-1 text-xs text-muted">
                {formatSum(RESTAURANT.freeDeliveryFrom)}dan oshsa yetkazib berish bepul.
              </p>
            ) : null}
          </dl>

          {short > 0 ? (
            <p className="text-sm font-medium text-danger">
              Minimal buyurtma — {formatSum(RESTAURANT.minOrder)}. Yana {formatSum(short)} qo&apos;shing.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="border-t border-line p-4">
          <button
            type="submit"
            disabled={sending || short > 0}
            className="w-full rounded-2xl bg-saffron py-4 font-bold text-ink hover:bg-saffron-deep disabled:opacity-50"
          >
            {sending ? "Yuborilmoqda…" : `Buyurtma berish · ${formatSum(total)}`}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-base font-normal focus:border-green focus:outline-2 focus:outline-green/20";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}
