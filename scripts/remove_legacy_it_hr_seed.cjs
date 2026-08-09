// One-off cleanup: removes the legacy IT-DOM / HR-DOM / ECS-DOM placeholder
// tree that kept resurrecting on every deploy because sql/027, 031, 033,
// 034, 036, 037 re-seeded it via ON CONFLICT DO NOTHING/UPDATE. Those files
// have been retired to no-ops (see their contents) so this is now a
// one-time cleanup, not a recurring fight against auto-seeding.
//
// Every row is identified by walking the FK graph from the three old
// domains (not by code prefix, since the new CC/COP data also uses a
// TST- prefix for tests) and is copied into a backup schema before delete.
//
// Usage: DATABASE_URL=... node scripts/remove_legacy_it_hr_seed.cjs
const { Client } = require("pg");

const BACKUP_SCHEMA = "backup_legacy_it_hr_seed_20260809";

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const q = (sql, params = []) => client.query(sql, params).then((r) => r.rows);

  try {
    await client.query("BEGIN");

    const oldDomains = await q(
      `SELECT id FROM domains WHERE code IN ('IT-DOM','HR-DOM','ECS-DOM')`
    );
    const domainIds = oldDomains.map((r) => r.id);

    const oldFw = await q(
      `SELECT id FROM frameworks
       WHERE domain_id = ANY($1::int[]) OR code LIKE 'IT-FW-%' OR code LIKE 'HR-FW-%'`,
      [domainIds]
    );
    const fwIds = oldFw.map((r) => r.id);

    const oldCtl = await q(
      `SELECT id FROM controls WHERE framework_id = ANY($1::int[])`,
      [fwIds]
    );
    const ctlIds = oldCtl.map((r) => r.id);

    const oldChk = await q(
      `SELECT id FROM checks WHERE control_id = ANY($1::int[])`,
      [ctlIds]
    );
    const chkIds = oldChk.map((r) => r.id);

    const tplFromLink = await q(
      `SELECT DISTINCT i.template_id FROM check_checklist_items cci
       JOIN checklist_items i ON i.id = cci.checklist_item_id
       WHERE cci.check_id = ANY($1::int[])`,
      [chkIds]
    );
    const tplFromDefault = await q(
      `SELECT DISTINCT checklist_template_id AS template_id FROM checks
       WHERE id = ANY($1::int[]) AND checklist_template_id IS NOT NULL`,
      [chkIds]
    );
    const tplIds = [
      ...new Set([...tplFromLink, ...tplFromDefault].map((r) => r.template_id)),
    ];

    // Safety check: a template must not still be reachable from a check
    // OUTSIDE the old set (e.g. shared with the new CC/COP data). None are,
    // per the dry run, but re-verify live before touching anything.
    const shared = await q(
      `SELECT DISTINCT i.template_id FROM check_checklist_items cci
       JOIN checklist_items i ON i.id = cci.checklist_item_id
       WHERE i.template_id = ANY($1::int[]) AND cci.check_id != ALL($2::int[])`,
      [tplIds, chkIds]
    );
    const sharedIds = new Set(shared.map((r) => r.template_id));
    const safeTplIds = tplIds.filter((id) => !sharedIds.has(id));
    if (safeTplIds.length !== tplIds.length) {
      throw new Error(
        `Refusing to continue: ${tplIds.length - safeTplIds.length} checklist template(s) ` +
          `are also used by a non-legacy check. Investigate before deleting.`
      );
    }

    const oldSop = await q(`SELECT id FROM sops WHERE code = 'HRD-REC-01'`);
    const sopIds = oldSop.map((r) => r.id);

    console.log("Rows identified as legacy:");
    console.log("  domains:            ", domainIds.length);
    console.log("  frameworks:         ", fwIds.length);
    console.log("  controls:           ", ctlIds.length);
    console.log("  checks:             ", chkIds.length);
    console.log("  checklist_templates:", safeTplIds.length);
    console.log("  sops:               ", sopIds.length);

    // ── Backup ──────────────────────────────────────────────────────────
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${BACKUP_SCHEMA}`);

    async function backup(name, sql, params) {
      await client.query(`DROP TABLE IF EXISTS ${BACKUP_SCHEMA}.${name}`);
      await client.query(`CREATE TABLE ${BACKUP_SCHEMA}.${name} AS ${sql}`, params);
      const cnt = await q(`SELECT COUNT(*) FROM ${BACKUP_SCHEMA}.${name}`);
      console.log(`  backed up ${name}: ${cnt[0].count} rows`);
    }

    await backup("domains", `SELECT * FROM domains WHERE id = ANY($1::int[])`, [domainIds]);
    await backup("frameworks", `SELECT * FROM frameworks WHERE id = ANY($1::int[])`, [fwIds]);
    await backup("controls", `SELECT * FROM controls WHERE id = ANY($1::int[])`, [ctlIds]);
    await backup(
      "control_links",
      `SELECT * FROM control_links WHERE control_id = ANY($1::int[])`,
      [ctlIds]
    );
    await backup("checks", `SELECT * FROM checks WHERE id = ANY($1::int[])`, [chkIds]);
    await backup(
      "check_checklist_items",
      `SELECT * FROM check_checklist_items WHERE check_id = ANY($1::int[])`,
      [chkIds]
    );
    await backup(
      "checklist_templates",
      `SELECT * FROM checklist_templates WHERE id = ANY($1::int[])`,
      [safeTplIds]
    );
    await backup(
      "checklist_items",
      `SELECT * FROM checklist_items WHERE template_id = ANY($1::int[])`,
      [safeTplIds]
    );
    await backup("sops", `SELECT * FROM sops WHERE id = ANY($1::int[])`, [sopIds]);

    // ── Delete, children first ─────────────────────────────────────────
    // checklist_items/checks cascade their own junction + answer/response
    // rows automatically; deleting templates/checks/controls/frameworks/
    // domains in that order lets each step's CASCADE do the rest.
    await client.query(`DELETE FROM checklist_items WHERE template_id = ANY($1::int[])`, [
      safeTplIds,
    ]);
    await client.query(`DELETE FROM checklist_templates WHERE id = ANY($1::int[])`, [
      safeTplIds,
    ]);
    await client.query(`DELETE FROM checks WHERE id = ANY($1::int[])`, [chkIds]);
    await client.query(`DELETE FROM controls WHERE id = ANY($1::int[])`, [ctlIds]);
    await client.query(`DELETE FROM frameworks WHERE id = ANY($1::int[])`, [fwIds]);
    await client.query(`DELETE FROM domains WHERE id = ANY($1::int[])`, [domainIds]);
    await client.query(`DELETE FROM sops WHERE id = ANY($1::int[])`, [sopIds]);

    await client.query("COMMIT");
    console.log("DONE — committed.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("FAILED, rolled back:", e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
