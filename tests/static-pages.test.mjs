import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const output = new URL("../dist-pages/", import.meta.url);

test("builds a self-contained GitHub Pages release for a nested game folder", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");
  const manifest = JSON.parse(
    await readFile(new URL("manifest.webmanifest", output), "utf8"),
  );
  const assets = await readdir(new URL("assets/", output));

  assert.match(html, /<title>Glimmer Grotto/);
  assert.match(html, /href="\.\/manifest\.webmanifest"/);
  assert.match(html, /(?:src|href)="\.\/assets\//);
  assert.doesNotMatch(html, /(?:src|href)="\/assets\//);
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.ok(assets.some((name) => /^createGame-.+\.js$/.test(name)));
  assert.ok(assets.some((name) => /^index-.+\.css$/.test(name)));

  await Promise.all([
    access(new URL("sw.js", output)),
    access(new URL("icon-192.png", output)),
    access(new URL("icon-512.png", output)),
    access(new URL("third-party-notices.txt", output)),
    access(new URL("release/clean-profile-certificate.json", output)),
  ]);
});
