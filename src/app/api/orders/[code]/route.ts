import { NextResponse, type NextRequest } from "next/server";
import { getOrderByCode } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Buyurtma holatini kuzatish uchun (mijoz sahifasi har necha soniyada so'raydi). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Z0-9]{10}$/.test(code)) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  const order = await getOrderByCode(code);
  if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  return NextResponse.json({ status: order.status }, { headers: { "cache-control": "no-store" } });
}
