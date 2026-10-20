/** Buyurtma holatlari — server va brauzerda birga ishlatiladi. */
export const ORDER_STATUSES = ["new", "cooking", "on_way", "done", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function statusLabel(status: OrderStatus, delivery: boolean): string {
  switch (status) {
    case "new":
      return "Qabul qilindi";
    case "cooking":
      return "Tayyorlanmoqda";
    case "on_way":
      return delivery ? "Yo'lda" : "Tayyor, olib ketishingiz mumkin";
    case "done":
      return delivery ? "Yetkazildi" : "Olib ketildi";
    case "cancelled":
      return "Bekor qilindi";
  }
}

/** Keyingi qadam (admin tugmasi uchun). Oxirgi holatlarda yo'q. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case "new":
      return "cooking";
    case "cooking":
      return "on_way";
    case "on_way":
      return "done";
    default:
      return null;
  }
}

export function nextActionLabel(status: OrderStatus, delivery: boolean): string | null {
  switch (status) {
    case "new":
      return "Tayyorlashni boshlash";
    case "cooking":
      return delivery ? "Kuryerga berildi" : "Tayyor";
    case "on_way":
      return delivery ? "Yetkazildi" : "Olib ketildi";
    default:
      return null;
  }
}

export function canCancel(status: OrderStatus): boolean {
  return status === "new" || status === "cooking";
}

/** Mijozga ko'rsatiladigan bosqichlar ketma-ketligi */
export const TIMELINE: readonly OrderStatus[] = ["new", "cooking", "on_way", "done"];
