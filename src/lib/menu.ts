import "server-only";
import { getDb } from "./db";

export interface Dish {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
}

export interface Category {
  id: number;
  name: string;
  dishes: Dish[];
}

interface DishRow {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
}

/** Menyu bo'limlari bilan. `onlyAvailable` bo'lsa stop-listdagi taomlar va bo'sh bo'limlar chiqmaydi. */
export async function getMenu(onlyAvailable: boolean): Promise<Category[]> {
  const db = await getDb();
  const cats = await db.query<{ id: number; name: string }>("SELECT id, name FROM categories ORDER BY sort, id");
  const dishes = await db.query<DishRow>(
    `SELECT id, category_id, name, description, price, available FROM dishes
     ${onlyAvailable ? "WHERE available" : ""} ORDER BY sort, id`,
  );
  const byCat = new Map<number, Dish[]>();
  for (const d of dishes) {
    const list = byCat.get(d.category_id) ?? [];
    list.push({
      id: d.id,
      categoryId: d.category_id,
      name: d.name,
      description: d.description,
      price: d.price,
      available: d.available,
    });
    byCat.set(d.category_id, list);
  }
  const result = cats.map((c) => ({ id: c.id, name: c.name, dishes: byCat.get(c.id) ?? [] }));
  return onlyAvailable ? result.filter((c) => c.dishes.length > 0) : result;
}

export async function addCategory(name: string): Promise<void> {
  const db = await getDb();
  await db.query(
    "INSERT INTO categories (name, sort) VALUES ($1, (SELECT COALESCE(MAX(sort), 0) + 1 FROM categories)) ON CONFLICT (name) DO NOTHING",
    [name],
  );
}

export async function addDish(input: { categoryId: number; name: string; description: string; price: number }): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO dishes (category_id, name, description, price, sort)
     VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort), 0) + 1 FROM dishes WHERE category_id = $1))`,
    [input.categoryId, input.name, input.description, input.price],
  );
}

export async function updateDish(id: number, input: { name: string; description: string; price: number }): Promise<void> {
  const db = await getDb();
  await db.query("UPDATE dishes SET name = $2, description = $3, price = $4 WHERE id = $1", [
    id,
    input.name,
    input.description,
    input.price,
  ]);
}

export async function setDishAvailable(id: number, available: boolean): Promise<void> {
  const db = await getDb();
  await db.query("UPDATE dishes SET available = $2 WHERE id = $1", [id, available]);
}
