import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { refreshAllLeaderboardCaches } from "../services/leaderboardCache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

async function main() {
  await connectDB();
  const summary = await refreshAllLeaderboardCaches();
  console.log(
    `[leaderboard-cache] refreshed ok=${summary.okCount} failed=${summary.failCount}`,
  );
  if (!summary.ok) {
    const failed = summary.results.filter((item) => !item.ok);
    failed.forEach((item) => {
      console.error(
        `[leaderboard-cache] ${item.pool}/${item.includeProvisional ? "prov" : "std"}: ${item.error}`,
      );
    });
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("[leaderboard-cache] refresh failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
