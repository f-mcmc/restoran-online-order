/** Restoran ma'lumotlari — boshqa mijoz uchun shu faylni o'zgartirasiz. */
export const RESTAURANT = {
  name: "Bahor Choyxona",
  tagline: "Toshkent, Chilonzor · 1998-yildan beri",
  address: "Toshkent, Chilonzor tumani, Bunyodkor ko'chasi 12",
  phone: "+998 90 123 45 67",
  hours: "Har kuni 09:00 – 23:00",
  /** Minimal buyurtma summasi (so'm) */
  minOrder: 60_000,
  /** Yetkazib berish narxi (so'm) */
  deliveryFee: 15_000,
  /** Shu summadan oshsa yetkazib berish bepul */
  freeDeliveryFrom: 200_000,
  /** Taxminiy tayyorlanish vaqti, daqiqa */
  etaMinutes: 45,
  map: { lat: 41.2856, lng: 69.2034 },
} as const;

export function formatSum(n: number): string {
  return `${n.toLocaleString("ru-RU").replace(/\s/g, "\u00a0")} so'm`;
}

export function deliveryFeeFor(subtotal: number, delivery: boolean): number {
  if (!delivery) return 0;
  return subtotal >= RESTAURANT.freeDeliveryFrom ? 0 : RESTAURANT.deliveryFee;
}
