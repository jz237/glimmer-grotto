import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("../licenses/shipped-components.json", import.meta.url), "utf8"),
);
const notice = await readFile(
  new URL(`../${manifest.noticePath}`, import.meta.url),
  "utf8",
);

function normalized(source) {
  return source.replaceAll("\r\n", "\n").trim();
}

async function packageMetadata(packageName) {
  return JSON.parse(
    await readFile(
      new URL(`../node_modules/${packageName}/package.json`, import.meta.url),
      "utf8",
    ),
  );
}

test("the shipped-component ledger matches installed packages and notices", async () => {
  const application = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.schemaVersion, 1);
  assert.match(notice, /^GLIMMER GROTTO THIRD-PARTY NOTICES/m);
  assert.ok(notice.includes(`Release ${application.version}`));

  for (const component of manifest.components) {
    const licenseText = await readFile(new URL(component.licenseFile, root), "utf8");
    assert.ok(
      normalized(notice).includes(normalized(licenseText)),
      `${component.name} must include its complete upstream license text`,
    );

    for (const expected of component.packages) {
      const metadata = await packageMetadata(expected.name);
      assert.equal(metadata.version, expected.version, `${expected.name} version drifted`);
      assert.equal(metadata.license, component.license, `${expected.name} license drifted`);
      assert.ok(
        notice.includes(expected.version),
        `${expected.name} ${expected.version} must be identified in the notice`,
      );

      for (const filename of ["LICENSE", "LICENSE.md", "license.md"]) {
        try {
          const packageLicense = await readFile(
            new URL(`../node_modules/${expected.name}/${filename}`, import.meta.url),
            "utf8",
          );
          assert.ok(
            normalized(notice).includes(normalized(packageLicense)),
            `${expected.name} must preserve its installed license file`,
          );
          break;
        } catch (error) {
          if (error?.code !== "ENOENT") throw error;
        }
      }
    }
  }
});

test("every top-level production dependency has an explicit distribution decision", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(
    Object.keys(manifest.topLevelProductionDependencies).sort(),
    Object.keys(packageJson.dependencies).sort(),
  );

  const distributedPackages = new Set(
    manifest.components.flatMap((component) =>
      component.packages.map((dependency) => dependency.name),
    ),
  );
  for (const [packageName, decision] of Object.entries(
    manifest.topLevelProductionDependencies,
  )) {
    if (decision.disposition === "distributed") {
      assert.ok(distributedPackages.has(packageName), `${packageName} needs a notice entry`);
    } else {
      assert.equal(decision.disposition, "not-distributed");
      assert.ok(decision.reason?.length > 40, `${packageName} needs an auditable reason`);
    }
  }
});

test("the production build contains the reviewed runtimes and no silent font payload", async () => {
  const clientManifest = await readFile(
    new URL("../dist/client/.vite/manifest.json", import.meta.url),
    "utf8",
  );
  const server = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
  const frameworkName = (await readdir(new URL("../dist/client/assets/", import.meta.url)))
    .find((name) => /^framework-.+\.js$/.test(name));
  const engineName = (await readdir(new URL("../dist/server/ssr/assets/", import.meta.url)))
    .find((name) => /^createGame-.+\.js$/.test(name));
  assert.ok(frameworkName);
  assert.ok(engineName);
  const framework = await readFile(
    new URL(`../dist/client/assets/${frameworkName}`, import.meta.url),
    "utf8",
  );
  const engine = await readFile(
    new URL(`../dist/server/ssr/assets/${engineName}`, import.meta.url),
    "utf8",
  );

  assert.match(clientManifest, /"name": "rolldown-runtime"/);
  assert.match(clientManifest, /node_modules\/vinext\/dist\/shims/);
  assert.match(framework, /react\.transitional\.element/);
  assert.match(framework, /unstable_scheduleCallback/);
  assert.match(server, /node_modules\/react\/cjs/);
  assert.match(server, /node_modules\/react-dom\/cjs/);
  assert.match(server, /node_modules\/react-server-dom-webpack\/cjs/);
  assert.match(server, /node_modules\/@vitejs\/plugin-rsc/);
  assert.match(server, /node_modules\/vinext\/dist/);
  assert.doesNotMatch(server, /node_modules\/next\//);
  assert.match(engine, /node_modules\/phaser\/dist/);
  assert.match(engine, /Representation of a single event listener/);

  await assert.rejects(
    access(new URL("../dist/client/assets/_vinext_fonts/", import.meta.url)),
    "unreferenced generated fonts must not enter the deployment",
  );
});

test("the verified notice is copied into the deployable client output", async () => {
  const deployedNotice = await readFile(
    new URL("../dist/client/third-party-notices.txt", import.meta.url),
    "utf8",
  );
  assert.equal(deployedNotice, notice);
});
