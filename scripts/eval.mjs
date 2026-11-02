// Usage: node scripts/eval.mjs
// Needs: the dev server running (npm run dev), photos in eval/images, and eval/labels.json like:
// [{ "file": "lsd-01.jpg", "expected": "isolate_and_report" }, { "file": "udder-03.jpg", "expected": "vet_visit" }]
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const URL = process.env.EVAL_URL ?? "http://localhost:3000/api/triage";
const RANK = { monitor: 0, vet_visit: 1, isolate_and_report: 2 };
const labels = JSON.parse(readFileSync("eval/labels.json", "utf8"));

// Check the labels file before spending any API calls
let problems = 0;
labels.forEach((item, i) => {
  if (!item.file || !(item.expected in RANK)) {
    console.error(`Entry ${i + 1} in eval/labels.json is wrong: ${JSON.stringify(item)}`);
    console.error(`  It needs "file" and "expected", where expected is one of: ${Object.keys(RANK).join(", ")}`);
    problems++;
  } else if (!existsSync(`eval/images/${item.file}`)) {
    console.error(`Entry ${i + 1}: the photo eval/images/${item.file} was not found. Check the spelling and the extension.`);
    problems++;
  }
});
if (problems > 0) {
  console.error(`\nFix the ${problems} problem(s) above and run the script again.`);
  process.exit(1);
}

const rows = [];
for (const item of labels) {
  const bytes = readFileSync(`eval/images/${item.file}`);
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: "image/jpeg" }), item.file);
  form.append("description", "");
  let predicted = "error";
  let regions = "SAM not run";
  try {
    const res = await fetch(URL, { method: "POST", body: form });
    const data = await res.json();
    if (!data.urgency) console.error(`  ${item.file}: ${data.error ?? "no result"}`);
    predicted = data.urgency ?? "error";
    if (!res.ok) {
      regions = /SAM|segment/i.test(data.error ?? "") ? "SAM failed" : "request failed";
    } else if (typeof data.segmented_lesion_regions === "number") {
      const count = data.segmented_lesion_regions;
      regions = `${count} SAM ${count === 1 ? "region" : "regions"}`;
      if (typeof data.affected_percent === "number") {
        regions += `, model estimate ${data.affected_percent}% affected`;
      }
    }
  } catch (err) {
    regions = "request failed";
    console.error(`${item.file}: ${err instanceof Error ? err.message : String(err)}`);
  }
  rows.push({ file: item.file, expected: item.expected, predicted, regions });
  console.log(`${item.file.padEnd(24)} expected ${item.expected.padEnd(20)} got ${predicted.padEnd(20)} SAM: ${regions}`);
}

const scored = rows.filter((r) => r.predicted !== "error");
if (scored.length === 0) {
  console.error("\nNo photo was checked. Is the app running (npm run dev) in another terminal tab, and is your key in .env.local?");
  process.exit(1);
}
const exact = scored.filter((r) => r.predicted === r.expected).length;
const safe = scored.filter((r) => RANK[r.predicted] >= RANK[r.expected]).length;
const emergencies = scored.filter((r) => r.expected === "isolate_and_report");
const missed = emergencies.filter((r) => r.predicted !== "isolate_and_report").length;
const falseAlarms = scored.filter(
  (r) => r.expected !== "isolate_and_report" && r.predicted === "isolate_and_report"
).length;

const summary = [
  `Photos checked: ${scored.length} of ${rows.length}`,
  `Exact match with vet label: ${exact} (${Math.round((exact / scored.length) * 100)}%)`,
  `Same or safer than vet label: ${safe} (${Math.round((safe / scored.length) * 100)}%)`,
  `Emergencies missed: ${missed} of ${emergencies.length}`,
  `False alarms: ${falseAlarms}`,
].join("\n");

console.log("\n" + summary);
const table = rows.map((r) => `| ${r.file} | ${r.expected} | ${r.predicted} | ${r.regions} |`).join("\n");
writeFileSync(
  "eval-results.md",
  `# Daktari evaluation\n\n${summary.split("\n").map((line) => `- ${line}`).join("\n")}\n\n| Photo | Vet label | Daktari | SAM / model measurement |\n|---|---|---|---|\n${table}\n\nAffected-percent values are model estimates, not SAM measurements.\n`
);
console.log("Saved eval-results.md");
