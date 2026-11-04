import { mkdir, readFile, readdir, rename, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exists = (file) => access(file).then(() => true, () => false);
const textExtensions = new Set([".html", ".js", ".css", ".json", ".svg", ".md", ".txt"]);

async function walk(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) files.push(...await walk(file));
    else if (item.isFile()) files.push(file);
  }
  return files;
}

function relative(value) {
  if (!value || value.includes("\\") || path.posix.isAbsolute(value) || value.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Invalid asset path: ${value}`);
  }
  return value;
}

export function mappingFromMetadata(metadata) {
  const data = metadata.data ?? metadata;
  const folders = new Map(data.assetFolders.map((folder) => [folder.id, folder]));
  function folderPath(id, seen = new Set()) {
    if (seen.has(id)) throw new Error("Asset folder cycle detected");
    const folder = folders.get(id);
    if (!folder) throw new Error(`Unknown asset folder: ${id}`);
    seen.add(id);
    return relative(folder.parentId ? `${folderPath(folder.parentId, seen)}/${folder.name}` : folder.name);
  }
  return {
    folders: [...new Set([...folders.keys()].map((id) => folderPath(id)))].sort(),
    files: Object.fromEntries(data.assets.map((asset) => {
      const folder = asset.folderId ? folderPath(asset.folderId) : asset.type === "font" ? "fonts" : asset.type === "image" ? "images" : "documents";
      return [relative(asset.name), relative(`${folder}/${asset.name}`)];
    }).sort(([a], [b]) => a.localeCompare(b))),
  };
}

export async function organizeAssets(publicDirectory, mapping) {
  const assets = path.join(publicDirectory, "assets");
  const entries = Object.entries(mapping.files).map(([from, to]) => [relative(from), relative(to)]);
  for (const folder of mapping.folders) await mkdir(path.join(assets, relative(folder)), { recursive: true });
  let moved = 0;
  for (const [from, to] of entries) {
    const source = path.join(assets, from);
    const destination = path.join(assets, to);
    if (source !== destination && await exists(source)) {
      await mkdir(path.dirname(destination), { recursive: true });
      await rename(source, destination);
      moved++;
    }
  }
  let rewritten = 0;
  for (const file of await walk(publicDirectory)) {
    if (!textExtensions.has(path.extname(file))) continue;
    const original = await readFile(file, "utf8");
    let text = original;
    for (const [from, to] of entries) {
      text = text.replace(new RegExp(`(?<![\\w/.:\\-])/assets/${escape(from)}(?=[?#\\s"'\x60<>\\\\)]|$)`, "g"), `/assets/${to}`);
      text = text.replace(new RegExp(`(["'\x60])${escape(from)}\\1`, "g"), (_, quote) => `${quote}${to}${quote}`);
      text = text.replace(new RegExp(`(url\\(\\s*["']?\\.\\./)${escape(from)}(?=[?#"'\\s)]|$)`, "g"), `$1${to}`);
    }
    if (text !== original) {
      await writeFile(file, text);
      rewritten++;
    }
  }
  for (const folder of mapping.folders) {
    const directory = path.join(assets, folder);
    if ((await readdir(directory)).length === 0) await writeFile(path.join(directory, ".gitkeep"), "");
  }
  return { moved, rewritten };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const mappingFile = path.join(root, "asset-folders.json");
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--metadata")) throw new Error("Usage: npm run organize:assets -- [--metadata path/to/.webstudio/data.json]");
  const mapping = args.length ? mappingFromMetadata(JSON.parse(await readFile(path.resolve(args[1]), "utf8"))) : JSON.parse(await readFile(mappingFile, "utf8"));
  const result = await organizeAssets(path.join(root, "public"), mapping);
  if (args.length) await writeFile(mappingFile, JSON.stringify(mapping, null, 2) + "\n");
  console.log(`Organized assets: ${result.moved} moved, ${result.rewritten} reference files updated.`);
}
