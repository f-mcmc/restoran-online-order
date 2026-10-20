import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { formatSum, RESTAURANT } from "@/lib/config";
import { createOrder, OrderError } from "@/lib/orders";
import { formatUzPhone, normalizeUzPhone } from "@/lib/phone";
import { notifyOwner } from "@/lib/telegram";

const Body = z.object({
  items: z
    .array(z.object({ dishId: z.number().int().positive(), qty: z.number().int().min(1).max(50) }))
    .min(1, "Savat bo'sh")
    .max(60),
  name: z.string().trim().min(2, "Ismingizni yozing").max(60),
  phone: z.string().trim().max(30),
  delivery: z.boolean(),
  address: z.string().trim().max(200).default(""),
  comment: z.string().trim().max(300).default(""),
  payment: z.enum(["cash", "card"]),
  /** Botlarga tuzoq: odam bu maydonni ko'rmaydi */
  website: z.string().max(0).optional(),
});

export async function POST(req: NextRequest) {
  const json: unknown = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // Faqat o'zimiz yozgan tushunarli xabarlarni ko'rsatamiz
    const message = issue && (issue.path[0] === "name" || issue.path[0] === "items") ? issue.message : "Ma'lumotlar noto'g'ri";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const phone = normalizeUzPhone(parsed.data.phone);
  if (!phone) return NextResponse.json({ error: "Telefon raqamini to'liq yozing" }, { status: 400 });

  try {
    const order = await createOrder({ ...parsed.data, phone });
    const { name, delivery, address, comment, payment } = parsed.data;
    const origin = req.nextUrl.origin;
    await notifyOwner(
      [
        `🆕 Yangi buyurtma #${order.id} — ${formatSum(order.total)}`,
        `${name}, ${formatUzPhone(phone)}`,
        delivery ? `Yetkazish: ${address}` : "Olib ketadi",
        `To'lov: ${payment === "card" ? "karta" : "naqd"}`,
        comment ? `Izoh: ${comment}` : "",
        `${origin}/admin`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return NextResponse.json({ code: order.code }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) {
      const message =
        err.code === "min_order" ? `Minimal buyurtma — ${formatSum(RESTAURANT.minOrder)}` : err.message;
      return NextResponse.json({ error: message, code: err.code }, { status: 409 });
    }
    console.error("Order failed", err);
    return NextResponse.json({ error: "Xatolik yuz berdi, qayta urinib ko'ring" }, { status: 500 });
  }
}
