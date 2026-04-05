import { refreshAllData } from "@/lib/services/update-service";

async function main() {
  const result = await refreshAllData({ force: true });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
