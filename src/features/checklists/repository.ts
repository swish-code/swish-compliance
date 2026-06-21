import "server-only";
import { queryAll, queryOne, execute } from "@/lib/db";
import type {
  ChecklistTemplate,
  ChecklistItem,
  ChecklistItemAnswer,
  ChecklistItemLatestAnswer,
} from "./types";

const TPL_SELECT = `
  t.id, t.code, t.name, t.description, t.category, t.is_active,
  t.created_by, u.display_name AS created_by_name,
  t.created_at, t.updated_at,
  (SELECT COUNT(*)::int FROM checklist_items i WHERE i.template_id = t.id) AS item_count
FROM checklist_templates t
LEFT JOIN users u ON u.id = t.created_by
`;

export async function listTemplates(search?: string): Promise<ChecklistTemplate[]> {
  if (search && search.trim()) {
    return queryAll<ChecklistTemplate>(
      `SELECT ${TPL_SELECT}
       WHERE t.name ILIKE $1 OR t.code ILIKE $1 OR t.category ILIKE $1
       ORDER BY t.updated_at DESC`,
      [`%${search.trim()}%`]
    );
  }
  return queryAll<ChecklistTemplate>(
    `SELECT ${TPL_SELECT} ORDER BY t.updated_at DESC`
  );
}

export async function getTemplate(id: number): Promise<ChecklistTemplate | undefined> {
  return queryOne<ChecklistTemplate>(`SELECT ${TPL_SELECT} WHERE t.id = $1`, [id]);
}

export async function listTemplateItems(templateId: number): Promise<ChecklistItem[]> {
  return queryAll<ChecklistItem>(
    `SELECT id, template_id, sort_order, question, guidance, weight, is_critical
     FROM checklist_items
     WHERE template_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [templateId]
  );
}

export async function createTemplate(input: {
  code?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  created_by: number;
}): Promise<number> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO checklist_templates (code, name, description, category, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [input.code ?? null, input.name, input.description ?? null, input.category ?? null, input.created_by]
  );
  return row!.id;
}

export async function updateTemplate(id: number, input: {
  name?: string;
  description?: string | null;
  category?: string | null;
  is_active?: boolean;
}): Promise<void> {
  await execute(
    `UPDATE checklist_templates SET
       name        = COALESCE($2, name),
       description = $3,
       category    = $4,
       is_active   = COALESCE($5, is_active)
     WHERE id = $1`,
    [id, input.name ?? null, input.description ?? null, input.category ?? null, input.is_active ?? null]
  );
}

export async function addItem(input: {
  template_id: number;
  question: string;
  guidance?: string | null;
  weight?: number;
  is_critical?: boolean;
}): Promise<number> {
  const row = await queryOne<{ next_order: number }>(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
     FROM checklist_items WHERE template_id = $1`,
    [input.template_id]
  );
  const sortOrder = row?.next_order ?? 1;
  const inserted = await queryOne<{ id: number }>(
    `INSERT INTO checklist_items (template_id, sort_order, question, guidance, weight, is_critical)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [input.template_id, sortOrder, input.question, input.guidance ?? null, input.weight ?? 1, input.is_critical ?? false]
  );
  return inserted!.id;
}

export async function deleteItem(id: number): Promise<void> {
  await execute(`DELETE FROM checklist_items WHERE id = $1`, [id]);
}

/**
 * One row per item in the template — the most recent answer, or no row
 * at all if the item has never been answered. DISTINCT ON keeps the
 * query simple and lets a partial index on (item_id, answered_at DESC)
 * serve it directly.
 */
export async function listLatestAnswersForTemplate(
  templateId: number
): Promise<ChecklistItemLatestAnswer[]> {
  return queryAll<ChecklistItemLatestAnswer>(
    `SELECT DISTINCT ON (a.item_id)
       a.item_id,
       a.answer,
       a.note,
       a.answered_by,
       u.display_name AS answered_by_name,
       a.answered_at
     FROM checklist_item_answers a
     JOIN checklist_items i ON i.id = a.item_id
     LEFT JOIN users u      ON u.id = a.answered_by
     WHERE i.template_id = $1
     ORDER BY a.item_id, a.answered_at DESC, a.id DESC`,
    [templateId]
  );
}

export async function recordItemAnswer(input: {
  item_id: number;
  answer: ChecklistItemAnswer;
  note?: string | null;
  answered_by: number;
}): Promise<void> {
  await execute(
    `INSERT INTO checklist_item_answers (item_id, answer, note, answered_by)
     VALUES ($1, $2, $3, $4)`,
    [input.item_id, input.answer, input.note ?? null, input.answered_by]
  );
}
