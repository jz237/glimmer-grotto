import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../public/release/clean-profile-certificate.json", import.meta.url),
  "utf8",
);
const deployed = await readFile(
  new URL("../dist/client/release/clean-profile-certificate.json", import.meta.url),
  "utf8",
);
const certificate = JSON.parse(source);
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

test("the clean-profile certificate matches the release and deployable artifact", () => {
  assert.equal(certificate.schemaVersion, 1);
  assert.equal(certificate.release, packageJson.version);
  assert.equal(certificate.certificate, "clean-profile-completion");
  assert.equal(deployed, source);
});

test("the certificate accounts for the complete campaign evidence", () => {
  assert.deepEqual(
    {
      rooms: certificate.campaign.roomsRestored,
      memories: certificate.campaign.memoriesRecovered,
      thresholds: certificate.campaign.biomeThresholdsAcknowledged,
      ending: certificate.campaign.endingReached,
    },
    { rooms: 20, memories: 15, thresholds: 4, ending: true },
  );
  assert.equal(certificate.routes.rooms.length, 20);
  assert.equal(certificate.campaign.roomOrder.length, 20);
  assert.equal(certificate.campaign.memoryOrder.length, 15);
  assert.equal(
    certificate.routes.totalCommands,
    certificate.routes.moveCommands + certificate.routes.interactionCommands,
  );
  assert.equal(
    certificate.routes.totalCommands,
    certificate.routes.byBiome.reduce((sum, biome) => sum + biome.commands, 0),
  );
  assert.equal(certificate.persistence.autosaveRoundTrips, 27);
  assert.equal(certificate.persistence.cleanLoads, 27);
  assert.equal(certificate.persistence.recoveryEvents, 0);
  assert.equal(certificate.persistence.exportImportRoundTrips, 1);
  assert.deepEqual(
    {
      mode: certificate.afterglow.visitMode,
      solved: certificate.afterglow.replaySolved,
      frontier: certificate.afterglow.frontierRoom,
      restored: certificate.afterglow.restoredRooms,
      memories: certificate.afterglow.foundMemories,
    },
    { mode: "revisit", solved: true, frontier: 19, restored: 20, memories: 15 },
  );
});
