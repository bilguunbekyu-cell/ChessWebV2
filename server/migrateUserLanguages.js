import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { User } from "./models/index.js";

const VALID_LANGUAGES = new Set(["en", "mn"]);

function normalizeLanguage(value) {
  const normalized = String(value || "en")
    .trim()
    .toLowerCase();
  return VALID_LANGUAGES.has(normalized) ? normalized : "en";
}

async function migrateUserLanguages() {
  const dryRun = process.argv.includes("--dry-run");
  const startedAt = Date.now();

  console.log("Starting user language backfill...");
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "WRITE"}`);

  await connectDB();

  let scanned = 0;
  let changed = 0;

  const cursor = User.find({}).select("_id language").cursor();

  try {
    for await (const user of cursor) {
      scanned += 1;

      const current = String(user.language || "").trim().toLowerCase();
      const normalized = normalizeLanguage(user.language);
      if (current === normalized) continue;

      changed += 1;
      if (!dryRun) {
        await User.updateOne({ _id: user._id }, { $set: { language: normalized } });
      }
    }
  } finally {
    await cursor.close();
    await mongoose.disconnect();
  }

  const elapsedMs = Date.now() - startedAt;
  console.log(`Scanned users: ${scanned}`);
  console.log(`${dryRun ? "Would update" : "Updated"} users: ${changed}`);
  console.log(`Done in ${elapsedMs}ms`);
}

migrateUserLanguages().catch(async (error) => {
  console.error("User language backfill failed:", error);
  try {
    await mongoose.disconnect();
  } catch {

  }
  process.exit(1);
});
