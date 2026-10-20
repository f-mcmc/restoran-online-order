import { OrderApp } from "@/components/OrderApp";
import { formatSum, RESTAURANT } from "@/lib/config";
import { getMenu } from "@/lib/menu";

export const dynamic = "force-dynamic";

export default async function Home() {
  const menu = await getMenu(true);
  const categories = menu.map((c) => ({
    id: c.id,
    name: c.name,
    dishes: c.dishes.map((d) => ({ id: d.id, name: d.name, description: d.description, price: d.price })),
  }));
  const phoneHref = `tel:${RESTAURANT.phone.replace(/[^\d+]/g, "")}`;

  return (
    <>
      <header className="pattern text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <span className="text-xl font-bold tracking-tight">{RESTAURANT.name}</span>
          <a href={phoneHref} className="font-medium text-saffron hover:underline">
            {RESTAURANT.phone}
          </a>
        </div>
        <div className="mx-auto max-w-5xl px-4 pt-8 pb-14 sm:pt-14 sm:pb-20">
          <p className="text-white/75">{RESTAURANT.tagline}</p>
          <h1 className="mt-3 max-w-2xl text-4xl leading-[1.05] font-extrabold sm:text-6xl">
            Issiq palov uyingizgacha
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            Taomlarni tanlang, manzilni yozing — buyurtma holatini sahifada kuzatib turasiz.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2 text-sm">
            <li className="rounded-full bg-white/12 px-4 py-2">{RESTAURANT.hours}</li>
            <li className="rounded-full bg-white/12 px-4 py-2">~{RESTAURANT.etaMinutes} daqiqada</li>
            <li className="rounded-full bg-saffron px-4 py-2 font-medium text-ink">
              {formatSum(RESTAURANT.freeDeliveryFrom)}dan yetkazish bepul
            </li>
          </ul>
        </div>
      </header>

      <main>
        <OrderApp categories={categories} />
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 pb-32 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Bizning manzil</h2>
            <dl className="mt-4 grid gap-3">
              <div>
                <dt className="text-sm text-muted">Manzil</dt>
                <dd className="font-medium">{RESTAURANT.address}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Ish vaqti</dt>
                <dd className="font-medium">{RESTAURANT.hours}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Telefon</dt>
                <dd className="font-medium">
                  <a href={phoneHref} className="hover:underline">
                    {RESTAURANT.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
          <iframe
            title="Xaritada manzil"
            loading="lazy"
            className="aspect-[4/3] w-full rounded-2xl border-0 bg-line"
            src={`https://maps.google.com/maps?q=${RESTAURANT.map.lat},${RESTAURANT.map.lng}&z=16&output=embed`}
          />
        </div>
      </footer>
    </>
  );
}
