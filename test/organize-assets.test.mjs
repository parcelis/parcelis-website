import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { mappingFromMetadata, organizeAssets } from "../scripts/organize-assets.mjs";

test("asset metadata preserves nested folders and groups unfiled images", () => {
  const mapping = mappingFromMetadata({ assetFolders: [{ id: "parent", name: "parcy" }, { id: "child", name: "backgrounds", parentId: "parent" }], assets: [{ name: "hero.svg", folderId: "child" }, { name: "photo.png", type: "image" }] });
  assert.equal(mapping.files["hero.svg"], "parcy/backgrounds/hero.svg");
  assert.equal(mapping.files["photo.png"], "images/photo.png");
});

test("organizing preserves asset bytes, updates browser references and is repeatable", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "parcelis-assets-"));
  try {
    await mkdir(path.join(root, "assets/static"), { recursive: true });
    await writeFile(path.join(root, "assets/hero.svg"), "<svg></svg>");
    await writeFile(path.join(root, "index.html"), '<img src="/assets/hero.svg?width=100">');
    await writeFile(path.join(root, "assets/app.js"), 'const name="hero.svg"; const remote="https://cdn.example/assets/hero.svg";');
    await writeFile(path.join(root, "assets/static/style.css"), '.hero{background:url(../hero.svg)}');
    const mapping = { folders: ["backgrounds", "parcy/backgrounds"], files: { "hero.svg": "backgrounds/hero.svg" } };
    assert.deepEqual(await organizeAssets(root, mapping), { moved: 1, rewritten: 3 });
    assert.equal(await readFile(path.join(root, "assets/backgrounds/hero.svg"), "utf8"), "<svg></svg>");
    assert.match(await readFile(path.join(root, "index.html"), "utf8"), /\/assets\/backgrounds\/hero\.svg\?width=100/);
    assert.equal(await readFile(path.join(root, "assets/app.js"), "utf8"), 'const name="backgrounds/hero.svg"; const remote="https://cdn.example/assets/hero.svg";');
    assert.match(await readFile(path.join(root, "assets/static/style.css"), "utf8"), /\.\.\/backgrounds\/hero\.svg/);
    assert.equal(await readFile(path.join(root, "assets/parcy/backgrounds/.gitkeep"), "utf8"), "");
    assert.deepEqual(await organizeAssets(root, mapping), { moved: 0, rewritten: 0 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("unsafe paths are rejected before assets are moved", async () => {
  await assert.rejects(organizeAssets("unused", { folders: [], files: { "hero.svg": "../outside.svg" } }), /Invalid asset path/);
});
