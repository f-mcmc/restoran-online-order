import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { isAdmin } from "@/lib/auth";
import { getMenu } from "@/lib/menu";
import { addCategoryAction, addDishAction, toggleDishAction, updateDishAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Menyu — admin", robots: { index: false } };

const input = "min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-sm";

export default async function AdminMenuPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const menu = await getMenu(false);
  const stopped = menu.reduce((n, c) => n + c.dishes.filter((d) => !d.available).length, 0);

  return (
    <>
      <AdminHeader current="menu" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Menyu</h1>
            <p className="mt-1 text-sm text-muted">
              Narx va nomni o&apos;zgartirsangiz, saytda darhol yangilanadi. Tugagan taomni «Stop» qiling — mijozlar
              uni ko&apos;rmaydi. {stopped > 0 ? `Hozir stopda: ${stopped} ta.` : null}
            </p>
          </div>
          <form action={addCategoryAction} className="flex gap-2">
            <label className="sr-only" htmlFor="new-cat">
              Yangi bo&apos;lim nomi
            </label>
            <input id="new-cat" name="name" required minLength={2} maxLength={40} placeholder="Yangi bo'lim" className={input} />
            <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-deep">
              Qo&apos;shish
            </button>
          </form>
        </div>

        {menu.map((cat) => (
          <section key={cat.id} aria-labelledby={`c-${cat.id}`} className="mt-10">
            <h2 id={`c-${cat.id}`} className="text-xl font-bold">
              {cat.name}
            </h2>
            <ul className="mt-3 grid gap-2">
              {cat.dishes.map((d) => (
                <li
                  key={d.id}
                  className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${
                    d.available ? "border-line bg-white" : "border-dashed border-line bg-line/40"
                  }`}
                >
                  <form action={updateDishAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={d.id} />
                    <input
                      name="name"
                      defaultValue={d.name}
                      required
                      minLength={2}
                      maxLength={60}
                      aria-label="Nomi"
                      className={`${input} flex-1 basis-40 font-medium`}
                    />
                    <input
                      name="description"
                      defaultValue={d.description}
                      maxLength={160}
                      aria-label="Tavsif"
                      className={`${input} flex-[2] basis-56`}
                    />
                    <input
                      name="price"
                      type="number"
                      inputMode="numeric"
                      min={500}
                      step={500}
                      defaultValue={d.price}
                      required
                      aria-label="Narx, so'm"
                      className={`${input} w-28 tabular-nums`}
                    />
                    <button type="submit" className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-green-soft">
                      Saqlash
                    </button>
                  </form>
                  <form action={toggleDishAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="available" value={String(!d.available)} />
                    <button
                      type="submit"
                      className={`w-24 rounded-lg px-3 py-2 text-sm font-semibold ${
                        d.available ? "bg-danger/10 text-danger hover:bg-danger/20" : "bg-green text-white hover:bg-green-deep"
                      }`}
                    >
                      {d.available ? "Stop" : "Qaytarish"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>

            <form action={addDishAction} className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line p-3">
              <input type="hidden" name="categoryId" value={cat.id} />
              <input name="name" required minLength={2} maxLength={60} placeholder="Yangi taom" aria-label="Yangi taom nomi" className={`${input} flex-1 basis-40`} />
              <input name="description" maxLength={160} placeholder="Tavsif" aria-label="Tavsif" className={`${input} flex-[2] basis-56`} />
              <input
                name="price"
                type="number"
                inputMode="numeric"
                min={500}
                step={500}
                required
                placeholder="Narx"
                aria-label="Narx, so'm"
                className={`${input} w-28`}
              />
              <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-deep">
                + Qo&apos;shish
              </button>
            </form>
          </section>
        ))}
      </main>
    </>
  );
}
