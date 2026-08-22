import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const migrationCheck = `
import json
import os
import sqlite3
import sys

root = sys.argv[1]
mode = sys.argv[2]
connection = sqlite3.connect(":memory:")
for migration in ("0001_initial_schema.sql", "0002_d1_image_storage.sql", "0003_workspace_auth.sql"):
    with open(os.path.join(root, "migrations", migration), encoding="utf-8") as source:
        connection.executescript(source.read())

connection.executescript("""
INSERT INTO Upload (id, imageData, imageMimeType, imageHash, imageAccessToken, uploadedAt)
VALUES ('upload-success', X'01', 'image/png', 'hash-success', 'token-success', '2026-08-22 10:00:00');
INSERT INTO OrderRecord (
  id, uploadId, orderNumber, platform, merchantId, merchantName, city, bdName, uploadedAt,
  dishPrice, packagingFee, platformRedPacket, originalDeliveryFee, deliveryFeeReduction,
  paidDeliveryFee, merchantSettlementAmount, userPaidAmount, otherPromotion,
  technicalServiceFee, deliveryServiceFee, merchantRate
) VALUES (
  'order-success', 'upload-success', 'ORDER-001', 'MEITUAN', 'merchant-1', '示例商家', '玉林', '张三', '2026-08-22 10:00:00',
  20, 2, 0, 5, 1, 4, 18, 24, 0, 1, 1, 0.1
);
INSERT INTO Upload (id, imageData, imageMimeType, imageHash, imageAccessToken, uploadedAt)
VALUES ('upload-failed', X'02', 'image/png', 'hash-failed', 'token-failed', '2026-08-22 10:01:00');
INSERT INTO RecognitionFailure (id, uploadId, reason, createdAt)
VALUES ('failure-1', 'upload-failed', '无法识别', '2026-08-22 10:01:00');
""")

# Re-run the collection migration over historical data, as it will run in production.
with open(os.path.join(root, "migrations", "0004_collection_task.sql"), encoding="utf-8") as source:
    migration = source.read()

connection.execute("PRAGMA foreign_keys = ON")
if mode == "transaction":
    connection.executescript("BEGIN;\\n" + migration + "\\nCOMMIT;")
else:
    connection.executescript(migration)

for migration in ("0005_collection_duplicate_uploads.sql", "0006_order_red_packet_merchant_share.sql", "0007_image_hash_reservation.sql"):
    with open(os.path.join(root, "migrations", migration), encoding="utf-8") as source:
        connection.executescript(source.read())

success = connection.execute("""
SELECT c.status, u.collectionId, u.platform, u.recognitionStatus, u.legacyImageData IS NOT NULL
FROM Upload u JOIN CollectionTask c ON c.id = u.collectionId
WHERE u.id = 'upload-success'
""").fetchone()
failed = connection.execute("""
SELECT c.status, u.platform, u.recognitionStatus, u.legacyImageData IS NOT NULL
FROM Upload u JOIN CollectionTask c ON c.id = u.collectionId
WHERE u.id = 'upload-failed'
""").fetchone()
order_number = next(column for column in connection.execute("PRAGMA table_info('OrderRecord')") if column[1] == 'orderNumber')
connection.execute("INSERT INTO ImageHashReservation (imageHash) VALUES ('parallel-hash')")
try:
    connection.execute("INSERT INTO ImageHashReservation (imageHash) VALUES ('parallel-hash')")
    reservation_unique = False
except sqlite3.IntegrityError:
    reservation_unique = True

print(json.dumps({
    "success": success,
    "failed": failed,
    "orderNumberNotNull": order_number[3],
    "orderCount": connection.execute("SELECT COUNT(*) FROM OrderRecord").fetchone()[0],
    "failureCount": connection.execute("SELECT COUNT(*) FROM RecognitionFailure").fetchone()[0],
    "hasMerchantShare": any(column[1] == "platformRedPacketMerchantShare" for column in connection.execute("PRAGMA table_info('OrderRecord')")),
    "reservationTable": connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ImageHashReservation'").fetchone()[0],
    "reservationUnique": reservation_unique,
    "foreignKeyViolations": connection.execute("PRAGMA foreign_key_check").fetchall(),
}))
`;

const expectedBackfill = {
  success: ["CONFIRMED", "legacy-upload-success", "MEITUAN", "SUCCEEDED", 1],
  failed: ["FAILED", null, "FAILED", 1],
  orderNumberNotNull: 0,
  orderCount: 1,
  failureCount: 1,
  hasMerchantShare: true,
  reservationTable: "ImageHashReservation",
  reservationUnique: true,
  foreignKeyViolations: [],
};

function runMigration(mode: "direct" | "transaction") {
  const output = execFileSync("python", ["-c", migrationCheck, process.cwd(), mode], { encoding: "utf8" });
  return JSON.parse(output);
}

describe("D1 collection-task migration", () => {
  it("backfills historical uploads and makes historical order numbers nullable", () => {
    expect(runMigration("direct")).toEqual(expectedBackfill);
  });

  it("preserves child-table data and referential integrity with foreign keys active in a migration transaction", () => {
    expect(runMigration("transaction")).toEqual(expectedBackfill);
  });
});
