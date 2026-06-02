import "server-only";
import bcrypt from "bcryptjs";
import { queryAll, queryOne, execute } from "@/lib/db";

export type UserRow = {
  id: number;
  email: string;
  display_name: string;
  role: string;
  brand_id: number | null;
  brand_name: string | null;
  department_id: number | null;
  department_name: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

const USER_SELECT = `
  u.id, u.email, u.display_name, u.role,
  u.brand_id, b.name AS brand_name,
  u.department_id, d.name AS department_name,
  u.is_active, u.created_at, u.last_login_at
FROM users u
LEFT JOIN brands       b ON b.id = u.brand_id
LEFT JOIN departments  d ON d.id = u.department_id
`;

export async function listUsers(search?: string): Promise<UserRow[]> {
  if (search && search.trim()) {
    return queryAll<UserRow>(
      `SELECT ${USER_SELECT}
       WHERE u.email ILIKE $1 OR u.display_name ILIKE $1
       ORDER BY u.created_at DESC`,
      [`%${search.trim()}%`]
    );
  }
  return queryAll<UserRow>(`SELECT ${USER_SELECT} ORDER BY u.created_at DESC`);
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  return queryOne<UserRow>(`SELECT ${USER_SELECT} WHERE u.id = $1`, [id]);
}

export type CreateUserInput = {
  email: string;
  password: string;
  display_name: string;
  role: string;
  brand_id?: number | null;
  department_id?: number | null;
};

export async function createUser(input: CreateUserInput): Promise<number> {
  const hash = bcrypt.hashSync(input.password, 10);
  const row = await queryOne<{ id: number }>(
    `INSERT INTO users (email, password_hash, display_name, role, brand_id, department_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     RETURNING id`,
    [
      input.email.toLowerCase(),
      hash,
      input.display_name,
      input.role,
      input.brand_id ?? null,
      input.department_id ?? null,
    ]
  );
  return row!.id;
}

export type UpdateUserInput = {
  id: number;
  display_name?: string;
  role?: string;
  brand_id?: number | null;
  department_id?: number | null;
  is_active?: boolean;
};

export async function updateUser(input: UpdateUserInput): Promise<void> {
  await execute(
    `UPDATE users SET
       display_name  = COALESCE($2, display_name),
       role          = COALESCE($3, role),
       brand_id      = $4,
       department_id = $5,
       is_active     = COALESCE($6, is_active)
     WHERE id = $1`,
    [
      input.id,
      input.display_name ?? null,
      input.role ?? null,
      input.brand_id ?? null,
      input.department_id ?? null,
      input.is_active ?? null,
    ]
  );
}

export async function resetUserPassword(id: number, newPassword: string): Promise<void> {
  const hash = bcrypt.hashSync(newPassword, 10);
  await execute(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, id]);
}

export async function emailExists(email: string): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)) AS exists`,
    [email]
  );
  return !!row?.exists;
}
