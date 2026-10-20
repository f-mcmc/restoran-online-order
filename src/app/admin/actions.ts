"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { addCategory, addDish, setDishAvailable, updateDish } from "@/lib/menu";
import { isOrderStatus } from "@/lib/order-status";
import { advanceOrder, cancelOrder } from "@/lib/orders";

async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

const Id = z.coerce.number().int().positive();
const Price = z.coerce.number().int().min(500).max(10_000_000);

export async function advanceOrderAction(form: FormData): Promise<void> {
  await requireAdmin();
  const from = String(form.get("from") ?? "");
  if (!isOrderStatus(from)) return;
  await advanceOrder(Id.parse(form.get("id")), from);
  revalidatePath("/admin");
}

export async function cancelOrderAction(form: FormData): Promise<void> {
  await requireAdmin();
  await cancelOrder(Id.parse(form.get("id")));
  revalidatePath("/admin");
}

export async function updateDishAction(form: FormData): Promise<void> {
  await requireAdmin();
  const data = z
    .object({
      id: Id,
      name: z.string().trim().min(2).max(60),
      description: z.string().trim().max(160),
      price: Price,
    })
    .parse({
      id: form.get("id"),
      name: form.get("name"),
      description: form.get("description") ?? "",
      price: form.get("price"),
    });
  await updateDish(data.id, data);
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function toggleDishAction(form: FormData): Promise<void> {
  await requireAdmin();
  await setDishAvailable(Id.parse(form.get("id")), form.get("available") === "true");
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function addDishAction(form: FormData): Promise<void> {
  await requireAdmin();
  const data = z
    .object({
      categoryId: Id,
      name: z.string().trim().min(2).max(60),
      description: z.string().trim().max(160),
      price: Price,
    })
    .parse({
      categoryId: form.get("categoryId"),
      name: form.get("name"),
      description: form.get("description") ?? "",
      price: form.get("price"),
    });
  await addDish(data);
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function addCategoryAction(form: FormData): Promise<void> {
  await requireAdmin();
  const name = z.string().trim().min(2).max(40).parse(form.get("name"));
  await addCategory(name);
  revalidatePath("/admin/menu");
}
