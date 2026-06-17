/** Fail CI if common secret patterns appear in the frontend bundle. */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist", "assets");
const patterns = [/sk_live_/i, /sk_test_[a-zA-Z0-9]{20,}/, /whsec_[a-zA-Z0-9]+/, /service_role/i];

let failed = false;
for (const file of readdirSync(dist).filter((f) => f.endsWith(".js"))) {
  const content = readFileSync(join(dist, file), "utf8");
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      console.log(`FAIL secret pattern ${pattern} found in ${file}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("PASS no secret patterns in frontend bundle");
