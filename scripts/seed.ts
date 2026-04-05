import { getDb } from "@/lib/db";
import { refreshAllData } from "@/lib/services/update-service";

async function main() {
  getDb();
  const result = await refreshAllData({ force: false });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
