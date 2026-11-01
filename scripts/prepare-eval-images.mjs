import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const evalDirectory = path.resolve("eval");
const incomingDirectory = path.join(evalDirectory, "incoming");
const imagesDirectory = path.join(evalDirectory, "images");
const labelsPath = path.join(evalDirectory, "labels.json");
const creditsPath = path.join(evalDirectory, "CREDITS.md");
const datasetUrl = "https://data.mendeley.com/datasets/w36hpf86j2";
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

const categories = [
  { directory: "lumpy", prefix: "lsd", target: 15, label: "isolate_and_report" },
  { directory: "udder", prefix: "udder", target: 10, label: "vet_visit" },
  { directory: "normal", prefix: "healthy", target: 5, label: "monitor" },
];

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function randomGenerator(seed) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(items, count, seed) {
  const shuffled = [...items];
  const random = randomGenerator(seed);
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, count).sort((left, right) => collator.compare(left.name, right.name));
}

function attribution(originalName, directory) {
  if (originalName.includes("Pavanaja")) {
    return { creator: "Pavanaja", licence: "CC BY-SA 4.0" };
  }
  if (originalName.includes("Kosh, Eileen")) {
    return {
      creator: "Kosh, Eileen Y, Adrian K. S. Tan, Yin Cheong Aden Ip, Clara Lau, Jasmine Ong, Ol Wing Ng, Jing Chen, Christine Lee, Suria Fabbri, Juline Chua, and et al.",
      licence: "CC BY 4.0",
    };
  }
  if (originalName.includes("Alan R Walker")) {
    return { creator: "Alan R Walker", licence: "CC BY-SA 3.0" };
  }
  if (originalName.includes("CSIRO")) {
    return { creator: "CSIRO", licence: "CC BY 3.0" };
  }
  if (originalName.includes("Kumar, Sachin Shastri, Sourabh")) {
    return { creator: "Kumar, Sachin Shastri, Sourabh (2022)", licence: "TODO" };
  }
  if (originalName.includes("Gulhem Vellut")) {
    return { creator: "Gulhem Vellut from Annecy, France", licence: "CC BY 2.0" };
  }
  if (originalName.includes("Roee Shpernick")) {
    return { creator: "Roee Shpernick", licence: "CC BY-SA 4.0" };
  }
  if (originalName.includes("L. Mahin")) {
    return { creator: "L. Mahin", licence: "CC BY-SA 3.0" };
  }
  if (originalName.includes("Veterinary Parasitology Archive")) {
    return {
      creator: "Wikimedia Commons Veterinary Parasitology Archive",
      licence: "CC BY-SA 3.0",
    };
  }
  if (directory === "own") {
    return { creator: "TODO", licence: "TODO" };
  }
  return { creator: "TODO", licence: "TODO" };
}

function sourceFor(directory, originalName) {
  if (directory === "lumpy") {
    const dataset = `[Mendeley Data, Lumpy Skin Images Dataset](${datasetUrl})`;
    return originalName.includes("Wikimedia Commons")
      ? `${dataset}; Wikimedia Commons (per original filename)`
      : dataset;
  }
  if (directory === "normal") {
    const dataset = `[Mendeley Data, Lumpy Skin Images Dataset (NORMAL SKIN)](${datasetUrl})`;
    return originalName.includes("Wikimedia Commons")
      ? `${dataset}; Wikimedia Commons (per original filename)`
      : dataset;
  }
  if (directory === "udder") {
    return "Wikimedia Commons (source details provided in original filename)";
  }
  return "Owner-provided photo";
}

function suggestedLabel(originalName, directory, fallback) {
  if (directory === "normal") return "monitor";
  if (/monitor/i.test(originalName)) return "monitor";
  if (/vet visit/i.test(originalName)) return "vet_visit";
  if (/isolate/i.test(originalName)) return "isolate_and_report";
  return fallback;
}

function creditRow(file, originalName, directory, note = "resized copy") {
  const details = attribution(originalName, directory);
  return `| ${file} | ${originalName.replaceAll("|", "\\|")} | ${sourceFor(directory, originalName)} | ${details.creator} | ${details.licence} | ${note} |`;
}

const validExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const incomingFiles = new Map();
for (const directory of ["lumpy", "normal", "udder", "own"]) {
  const sourceDirectory = path.join(incomingDirectory, directory);
  const entries = (await readdir(sourceDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && validExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({ name: entry.name, path: path.join(sourceDirectory, entry.name) }))
    .sort((left, right) => collator.compare(left.name, right.name));
  incomingFiles.set(directory, entries);
}

const labels = JSON.parse(await readFile(labelsPath, "utf8"));
const existingCreditText = (await readdir(evalDirectory)).includes("CREDITS.md")
  ? await readFile(creditsPath, "utf8")
  : "";
const existingCreditRows = new Map(
  existingCreditText
    .split(/\r?\n/)
    .filter((line) => /^\| [^|]+ \|/.test(line) && !line.startsWith("| Evaluation file |"))
    .map((line) => [line.split("|")[1].trim(), line]),
);
const usedOriginalNames = new Set(
  [...existingCreditRows.values()].map((line) => line.split("|")[2].trim()),
);
const existingImages = new Map();
for (const entry of await readdir(imagesDirectory, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  existingImages.set(entry.name, hash(await readFile(path.join(imagesDirectory, entry.name))));
}

const sourceHashes = new Set(existingImages.values());
const sourcesByHash = new Map();
const sourcesByName = new Map();
for (const [directory, sources] of incomingFiles) {
  for (const source of sources) {
    source.sourceHash = hash(await readFile(source.path));
    sourcesByHash.set(source.sourceHash, { directory, source });
    sourcesByName.set(source.name, { directory, source });
    if (usedOriginalNames.has(source.name)) sourceHashes.add(source.sourceHash);
  }
}

const newLabelEntries = [];
const creditRowsByFile = new Map();
for (const category of categories) {
  const candidates = [];
  for (const source of incomingFiles.get(category.directory)) {
    if (sourceHashes.has(source.sourceHash)) continue;
    candidates.push(source);
  }

  const existingCount = labels.filter((entry) => entry.file.startsWith(`${category.prefix}-`)).length;
  const requested = Math.max(0, category.target - existingCount);
  const selected = sample(candidates, Math.min(requested, candidates.length), 42);
  let nextNumber = existingCount + 1;
  for (const source of selected) {
    const file = `${category.prefix}-${String(nextNumber++).padStart(2, "0")}.jpg`;
    const outputPath = path.join(imagesDirectory, file);
    await sharp(source.path)
      .rotate()
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(outputPath);

    const label = suggestedLabel(source.name, category.directory, category.label);
    newLabelEntries.push({ file, expected: label, reviewed: false });
    labels.push({ file, expected: label, reviewed: false });
    creditRowsByFile.set(file, creditRow(file, source.name, category.directory));
    sourceHashes.add(source.sourceHash);
  }
}

for (const source of incomingFiles.get("own")) {
  if (sourceHashes.has(source.sourceHash)) continue;
  const file = `own-${String(labels.filter((entry) => entry.file.startsWith("own-")).length + 1).padStart(2, "0")}.jpg`;
  await sharp(source.path)
    .rotate()
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(path.join(imagesDirectory, file));
  labels.push({ file, expected: "vet_visit", reviewed: false });
  newLabelEntries.push({ file, expected: "vet_visit", reviewed: false });
  creditRowsByFile.set(file, creditRow(file, source.name, "own"));
  sourceHashes.add(source.sourceHash);
}

await writeFile(labelsPath, `${JSON.stringify(labels, null, 2)}\n`);

const allCreditRows = [];
for (const entry of labels) {
  const savedRow = existingCreditRows.get(entry.file);
  const generatedRow = creditRowsByFile.get(entry.file);
  if (generatedRow) {
    allCreditRows.push(generatedRow);
    continue;
  }
  const savedOriginalName = savedRow?.split("|")[2].trim();
  const original = sourcesByName.get(savedOriginalName) ?? sourcesByHash.get(existingImages.get(entry.file));
  if (!original) {
    if (savedRow) {
      allCreditRows.push(savedRow);
      continue;
    }
    throw new Error(`Missing original source/credit mapping for ${entry.file}`);
  }
  const savedNote = savedRow?.split("|")[6].trim();
  const originalUnchanged = existingImages.get(entry.file) === original.source.sourceHash;
  const note = originalUnchanged ? "existing photo (kept unchanged)" : savedNote ?? "resized copy";
  allCreditRows.push(creditRow(entry.file, original.source.name, original.directory, note));
}
const credits = [
  "# Evaluation photo credits",
  "",
  "Dataset page contributor and licence fields were not listed on the linked Mendeley Data page; missing details are marked TODO.",
  "",
  "| Evaluation file | Original file | Source | Creator | Licence | Note |",
  "|---|---|---|---|---|---|",
  ...allCreditRows,
  "",
].join("\n");
await writeFile(creditsPath, credits);
console.log(`Created ${newLabelEntries.length} resized image(s); ${labels.length} total evaluation labels.`);
console.log(newLabelEntries.map((entry) => `${entry.file}: ${entry.expected} (reviewed: false)`).join("\n"));
