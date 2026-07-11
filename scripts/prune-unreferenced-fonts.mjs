import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const distributionDirectory = fileURLToPath(new URL("../dist/", import.meta.url));
const fontDirectory = path.join(
  distributionDirectory,
  "client",
  "assets",
  "_vinext_fonts",
);
const searchableExtensions = new Set([".css", ".html", ".js", ".json"]);

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(location));
    else files.push(location);
  }
  return files;
}

let fontFiles;
try {
  fontFiles = await filesBelow(fontDirectory);
} catch (error) {
  if (error?.code === "ENOENT") process.exit(0);
  throw error;
}

const fontNames = fontFiles.map((file) => path.basename(file));
const distributionFiles = await filesBelow(distributionDirectory);
const searchableFiles = distributionFiles.filter(
  (file) =>
    !file.startsWith(`${fontDirectory}${path.sep}`) &&
    searchableExtensions.has(path.extname(file)),
);

for (const file of searchableFiles) {
  const source = await readFile(file, "utf8");
  if (fontNames.some((fontName) => source.includes(fontName))) {
    console.log("Referenced Vinext font assets retained.");
    process.exit(0);
  }
}

await rm(fontDirectory, { force: true, recursive: true });
console.log(`Removed ${fontFiles.length} unreferenced Vinext font assets.`);
