import "server-only";
import { randomBytes } from "node:crypto";
import { RESTAURANT, deliveryFeeFor } from "./config";
import { getDb } from "./db";
import { ORDER_STATUSES, canCancel, isOrderStatus, nextStatus, type OrderStatus } from "./order-status";

export class OrderError extends Error {
  constructor(
    public readonly code: "empty" | "unavailable" | "min_order" | "address_required",
    message: string,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export interface OrderInput {
  items: ReadonlyArray<{ dishId: number; qty: number }>;
  name: string;
  phone: string;
  delivery: boolean;
  address: string;
  comment: string;
  payment: "cash" | "card";
}

export interface OrderItem {
  dishId: number;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  delivery: boolean;
  address: string;
  comment: string;
  payment: "cash" | "card";
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  items: OrderItem[];
}

interface OrderRow {
  id: number;
  code: string;
  customer_name: string;
  phone: string;
  delivery: boolean;
  address: string;
  comment: string;
  payment: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: Date | string;
}

interface ItemRow {
  order_id: number;
  dish_id: number;
  name: string;
  price: number;
  qty: number;
}

const ORDER_COLUMNS =
  "id, code, customer_name, phone, delivery, address, comment, payment, subtotal, delivery_fee, total, status, created_at";

/** Mijoz buyurtmasini kuzatadigan qisqa kod (taxmin qilib bo'lmaydi). */
function newCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function toOrder(row: OrderRow, items: OrderItem[]): Order {
  const status = isOrderStatus(row.status) ? row.status : "new";
  return {
    id: row.id,
    code: row.code,
    customerName: row.customer_name,
    phone: row.phone,
    delivery: row.delivery,
    address: row.address,
    comment: row.comment,
    payment: row.payment === "card" ? "card" : "cash",
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    total: row.total,
    status,
    createdAt: new Date(row.created_at),
    items,
  };
}

/**
 * Buyurtma yaratadi. Narxlar brauzerdan emas, bazadan olinadi — mijoz narxni o'zgartira olmaydi.
 * Stop-listdagi taom bo'lsa yoki minimal summaga yetmasa — xato.
 */
export async function createOrder(input: OrderInput): Promise<{ id: number; code: string; total: number }> {
  const qtyByDish = new Map<number, number>();
  for (const { dishId, qty } of input.items) qtyByDish.set(dishId, (qtyByDish.get(dishId) ?? 0) + qty);
  if (qtyByDish.size === 0) throw new OrderError("empty", "Savat bo'sh.");
  if (input.delivery && input.address.trim().length < 5) {
    throw new OrderError("address_required", "Yetkazib berish manzilini yozing.");
  }

  const db = await getDb();
  return db.transaction(async (tx) => {
    const ids = [...qtyByDish.keys()];
    const dishes = await tx.query<{ id: number; name: string; price: number; available: boolean }>(
      "SELECT id, name, price, available FROM dishes WHERE id = ANY($1::int[])",
      [ids],
    );
    const byId = new Map(dishes.map((d) => [d.id, d]));

    const items: OrderItem[] = [];
    for (const [dishId, qty] of qtyByDish) {
      const dish = byId.get(dishId);
      if (!dish || !dish.available) {
        throw new OrderError("unavailable", `${dish?.name ?? "Bir taom"} hozir mavjud emas. Savatni yangilang.`);
      }
      items.push({ dishId, name: dish.name, price: dish.price, qty: Math.min(qty, 50) });
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    if (subtotal < RESTAURANT.minOrder) {
      throw new OrderError("min_order", "Buyurtma minimal summadan kam.");
    }
    const deliveryFee = deliveryFeeFor(subtotal, input.delivery);
    const total = subtotal + deliveryFee;

    const [order] = await tx.query<{ id: number; code: string }>(
      `INSERT INTO orders (code, customer_name, phone, delivery, address, comment, payment, subtotal, delivery_fee, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, code`,
      [
        newCode(),
        input.name,
        input.phone,
        input.delivery,
        input.delivery ? input.address.trim() : "",
        input.comment.trim(),
        input.payment,
        subtotal,
        deliveryFee,
        total,
      ],
    );
    if (!order) throw new Error("Buyurtma saqlanmadi");

    for (const item of items) {
      await tx.query("INSERT INTO order_items (order_id, dish_id, name, price, qty) VALUES ($1, $2, $3, $4, $5)", [
        order.id,
        item.dishId,
        item.name,
        item.price,
        item.qty,
      ]);
    }
    return { id: order.id, code: order.code, total };
  });
}

async function attachItems(rows: OrderRow[]): Promise<Order[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const items = await db.query<ItemRow>(
    "SELECT order_id, dish_id, name, price, qty FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY name",
    [rows.map((r) => r.id)],
  );
  const byOrder = new Map<number, OrderItem[]>();
  for (const it of items) {
    const list = byOrder.get(it.order_id) ?? [];
    list.push({ dishId: it.dish_id, name: it.name, price: it.price, qty: it.qty });
    byOrder.set(it.order_id, list);
  }
  return rows.map((r) => toOrder(r, byOrder.get(r.id) ?? []));
}

export async function getOrderByCode(code: string): Promise<Order | null> {
  const db = await getDb();
  const rows = await db.query<OrderRow>(`SELECT ${ORDER_COLUMNS} FROM orders WHERE code = $1`, [code]);
  const [order] = await attachItems(rows);
  return order ?? null;
}

/** Toshkent vaqti bilan bugungi kun boshlanishi (UTC+5, yozgi vaqt yo'q). */
function startOfTodayTashkent(now = new Date()): Date {
  const offsetMs = 5 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offsetMs);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs);
}

/** Admin uchun: hali yopilmagan barcha buyurtmalar + bugun yopilganlari. */
export async function listOrdersForAdmin(): Promise<{ active: Order[]; closedToday: Order[] }> {
  const db = await getDb();
  const since = startOfTodayTashkent();
  const rows = await db.query<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders
     WHERE status IN ('new', 'cooking', 'on_way') OR created_at >= $1
     ORDER BY created_at DESC
     LIMIT 200`,
    [since],
  );
  const orders = await attachItems(rows);
  const isActive = (o: Order) => o.status === "new" || o.status === "cooking" || o.status === "on_way";
  return {
    active: orders.filter(isActive).reverse(),
    closedToday: orders.filter((o) => !isActive(o)),
  };
}

export interface DayStats {
  orders: number;
  revenue: number;
  averageCheck: number;
  cancelled: number;
}

export async function todayStats(): Promise<DayStats> {
  const db = await getDb();
  const [row] = await db.query<{ orders: number; revenue: number; cancelled: number }>(
    `SELECT
       count(*) FILTER (WHERE status <> 'cancelled')::int AS orders,
       COALESCE(sum(total) FILTER (WHERE status <> 'cancelled'), 0)::int AS revenue,
       count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
     FROM orders WHERE created_at >= $1`,
    [startOfTodayTashkent()],
  );
  const orders = row?.orders ?? 0;
  const revenue = row?.revenue ?? 0;
  return { orders, revenue, cancelled: row?.cancelled ?? 0, averageCheck: orders > 0 ? Math.round(revenue / orders) : 0 };
}

export interface TopDish {
  name: string;
  qty: number;
}

/** Oxirgi 7 kunda eng ko'p buyurtma qilingan taomlar */
export async function topDishes(limit = 5): Promise<TopDish[]> {
  const db = await getDb();
  const since = new Date(startOfTodayTashkent().getTime() - 6 * 24 * 60 * 60 * 1000);
  return db.query<TopDish>(
    `SELECT oi.name, sum(oi.qty)::int AS qty
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.created_at >= $1 AND o.status <> 'cancelled'
     GROUP BY oi.name ORDER BY qty DESC, oi.name LIMIT $2`,
    [since, limit],
  );
}

/**
 * Holatni keyingi bosqichga o'tkazadi. Faqat kutilgan holatdan o'tadi —
 * ikki admin bir vaqtda bossa ham bosqich ikki marta sakramaydi.
 */
export async function advanceOrder(id: number, from: OrderStatus): Promise<boolean> {
  const to = nextStatus(from);
  if (!to) return false;
  const db = await getDb();
  const rows = await db.query<{ id: number }>(
    "UPDATE orders SET status = $3, updated_at = now() WHERE id = $1 AND status = $2 RETURNING id",
    [id, from, to],
  );
  return rows.length > 0;
}

export async function cancelOrder(id: number): Promise<boolean> {
  const db = await getDb();
  const cancellable = ORDER_STATUSES.filter(canCancel);
  const rows = await db.query<{ id: number }>(
    "UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1 AND status = ANY($2::text[]) RETURNING id",
    [id, cancellable],
  );
  return rows.length > 0;
}
