"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guard";
import {
  markRead,
  markAllRead,
  deleteOne,
  deleteAllRead,
} from "./repository";

export async function markReadAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  await markRead(id, user.id);
  revalidatePath("/notifications");
}

export async function markAllReadAction() {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/notifications");
}

export async function deleteNotificationAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  await deleteOne(id, user.id);
  revalidatePath("/notifications");
}

export async function clearReadAction() {
  const user = await requireUser();
  await deleteAllRead(user.id);
  revalidatePath("/notifications");
}
