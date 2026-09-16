import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import "dotenv/config";

const { Client } = pg;

const outDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("deploy", "sip-demo-tariffs-export");
const pageSize = Number(process.env.SIP_DEMO_EXPORT_PAGE_SIZE || 5000);

function writeRow(stream, row) {
  stream.write(`${JSON.stringify(row)}\n`);
}

async function exportPaged(client, stream, query, countQuery) {
  const countResult = await client.query(countQuery);
  const total = Number(countResult.rows[0]?.total || 0);
  let exported = 0;

  while (exported < total) {
    const result = await client.query(`${query} LIMIT $1 OFFSET $2`, [pageSize, exported]);
    for (const row of result.rows) writeRow(stream, row);
    exported += result.rows.length;
    if (exported % 25000 === 0 || exported === total) {
      console.log(`exported ${exported}/${total}`);
    }
  }

  return total;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  fs.mkdirSync(outDir, { recursive: true });

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const rateGroupsPath = path.join(outDir, "sip-rate-groups.ndjson");
    const tariffsPath = path.join(outDir, "sip-tariffs.ndjson");

    const rateGroups = await client.query(`
      SELECT id, name, description, status, metadata, created_at, updated_at
      FROM sip_rate_groups
      ORDER BY created_at, id
    `);
    const rateGroupStream = fs.createWriteStream(rateGroupsPath, "utf8");
    for (const row of rateGroups.rows) writeRow(rateGroupStream, row);
    await new Promise((resolve) => rateGroupStream.end(resolve));
    console.log(`rate groups exported: ${rateGroups.rows.length}`);

    const tariffFilter = `
      FROM sip_tariffs
      WHERE NOT (
        COALESCE(metadata->>'kind', '') LIKE '%_destination'
        AND COALESCE(metadata->>'prefix', '') = ''
        AND COALESCE(metadata->>'destination', '') = ''
      )
    `;
    const tariffQuery = `
      SELECT
        id,
        name,
        tariff_type,
        description,
        currency,
        connection_fee::text,
        rate_per_minute::text,
        billing_increment_seconds,
        status,
        metadata,
        created_at,
        updated_at
      ${tariffFilter}
      ORDER BY created_at, id
    `;
    const tariffCountQuery = `SELECT count(*)::int AS total ${tariffFilter}`;

    const tariffStream = fs.createWriteStream(tariffsPath, "utf8");
    const tariffCount = await exportPaged(client, tariffStream, tariffQuery, tariffCountQuery);
    await new Promise((resolve) => tariffStream.end(resolve));
    console.log(`tariffs exported: ${tariffCount}`);

    fs.writeFileSync(
      path.join(outDir, "EXPORT_SUMMARY.txt"),
      [
        `Exported at: ${new Date().toISOString()}`,
        `Rate groups: ${rateGroups.rows.length}`,
        `Tariffs: ${tariffCount}`,
        "Skipped blank destination rows where both prefix and destination are empty.",
        "",
      ].join("\n"),
      "utf8",
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
