import { describe, expect, it } from "vitest";
import releaseCertificate from "../../public/release/clean-profile-certificate.json";
import { certifyCleanProfile } from "./campaignCertification";

describe("clean-profile release certification", () => {
  it("completes one fresh campaign and reopens a playable afterglow", () => {
    const certificate = certifyCleanProfile(releaseCertificate.release);
    expect(certificate.campaign).toMatchObject({
      start: "fresh-save",
      roomsRestored: 20,
      memoriesRecovered: 15,
      biomeThresholdsAcknowledged: 4,
      endingReached: true,
    });
    expect(certificate.afterglow).toMatchObject({
      visitMode: "revisit",
      replaySolved: true,
      restoredRooms: 20,
      foundMemories: 15,
    });
    expect(certificate).toEqual(releaseCertificate);
  });
});
