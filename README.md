# Bahor Choyxona — restoran uchun onlayn buyurtma

Mijoz menyudan taom tanlaydi, yetkazib berish yoki olib ketishni belgilaydi va buyurtma holatini sahifada kuzatadi. Restoran egasi admin panelda buyurtmalarni bosqichma-bosqich yuritadi, menyu va narxlarni o'zi o'zgartiradi, yangi buyurtma Telegram'ga keladi.

Next.js 16 · TypeScript (strict) · PostgreSQL · Tailwind CSS v4

**Demo:** https://murodulloh-restoran.vercel.app · admin panel: `/admin` (demo: `admin` / `admin123`)

## Imkoniyatlar

**Mijoz uchun**
- Bo'limlar bo'yicha menyu, savat (sahifa yangilansa ham saqlanadi)
- Yetkazib berish yoki olib ketish, naqd yoki karta
- Minimal buyurtma summasi va ma'lum summadan bepul yetkazish
- Buyurtma sahifasi: holat (qabul qilindi → tayyorlanmoqda → yo'lda → yetkazildi) o'zi yangilanadi

**Restoran uchun**
- Faol buyurtmalar kartochkalarda: tarkib, mijoz, manzil, izoh; bir tugma bilan keyingi bosqich
- Bugungi buyurtmalar soni, tushum, o'rtacha chek, 7 kunlik eng ko'p sotilgan taomlar
- Menyu boshqaruvi: narx va nomni tahrirlash, yangi taom va bo'lim, tugagan taomni «Stop» qilish
- Yangi buyurtma haqida Telegram xabari

**Xavfsizlik va ishonchlilik**
- Narx brauzerdan emas, bazadan olinadi — mijoz narxni soxtalashtira olmaydi
- Stop-listdagi taomga buyurtma berib bo'lmaydi
- Buyurtma va uning tarkibi bitta tranzaksiyada saqlanadi
- Holat faqat kutilgan bosqichdan o'tadi (ikki admin bir vaqtda bossa ham sakrab ketmaydi)
- Admin sessiyasi HMAC bilan imzolangan httpOnly cookie; barcha kirishlar zod bilan tekshiriladi
- Botlarga qarshi yashirin maydon

## Ishga tushirish

```bash
npm install
npm run dev
```

`DATABASE_URL` bo'sh bo'lsa, ilova xotiradagi Postgres (PGlite) bilan ishlaydi — hech narsa o'rnatish shart emas. Jadvallar va namunaviy menyu birinchi so'rovda o'zi yaratiladi.

## Sozlamalar

| O'zgaruvchi | Vazifasi |
| --- | --- |
| `DATABASE_URL` | Postgres manzili (Neon, Supabase va h.k.) |
| `ADMIN_LOGIN`, `ADMIN_PASSWORD` | Admin panelga kirish. `ADMIN_PASSWORD` bo'lmasa — demo rejim (`admin` / `admin123`, login sahifasida ko'rsatiladi) |
| `SESSION_SECRET` | Kamida 16 belgili tasodifiy satr. Bo'lmasa `DATABASE_URL`dan hosil qilinadi |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Yangi buyurtma xabari (ixtiyoriy) |

Restoran nomi, manzil, telefon, minimal summa va yetkazish narxi — `src/lib/config.ts`.

## Tuzilishi

```
src/lib/db.ts          Postgres / PGlite ulanish, jadvallar, boshlang'ich menyu
src/lib/orders.ts      Buyurtma yaratish, holatlar, statistika
src/lib/menu.ts        Menyu o'qish va tahrirlash
src/lib/order-status.ts  Holatlar va ularning nomlari (server + brauzer)
src/app/api/orders     Buyurtma API
src/app/admin          Admin panel (buyurtmalar, menyu)
src/components/OrderApp.tsx  Menyu, savat, buyurtma oynasi
```

Muallif: Murodulloh — Telegram [@kadirjanovvm](https://t.me/kadirjanovvm)
