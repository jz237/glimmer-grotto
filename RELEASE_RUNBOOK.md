# Release runbook

Glimmer Grotto releases stay owner-only until a separate, explicit public
launch decision. A release is complete only when source provenance, the
deployable archive, production status, edge bytes, and access policy all agree.

## Public arcade release

Use this path only after an explicit public-launch request.

1. Run `npm run lint` and `npm test` from a cleanly understood worktree.
2. Build the nested-path-safe artifact with `npm run build:pages`.
3. Replace only `games/2026-06-10/glimmer-grotto/` in `jz237/jez237-site`
   with the exact contents of `dist-pages`.
4. Keep the existing `/games/` catalog entry and update its description when
   the shipped game has materially changed.
5. Review the scoped diff, merge through GitHub, and wait for the Pages mirror
   workflow to succeed.
6. Verify the arcade card, game shell, hashed assets, manifest, notices, and
   release certificate at their public `jez237.com` URLs.

## Private Sites release

1. Run `npm run lint` and `npm test` from a clean worktree.
2. Commit the reviewed state and push that exact commit to the Sites source
   repository.
3. Package the clean `dist` output with `.openai/hosting.json`; reject missing
   server entrypoints, missing release evidence, or retained unreferenced fonts.
4. Save a Sites version using the pushed commit SHA and its exact archive.
5. Verify custom access still allows exactly the owner and no groups, then use
   the owner-only deployment path.
6. Poll the deployment to a terminal success state.
7. Probe uncached production responses until they identify the new release:
   the root is the game shell, the interface asset matches the local SHA-256,
   the worker names the expected cache generation, notices name the package
   version, and release evidence is byte-identical to the local artifact.

Deployment success can precede full edge convergence. Never close a release or
rollback solely because the control plane reports `succeeded`; mutable files
and new hashed assets must agree at the production URL.

## Rollback rehearsal

1. Record the current and immediately prior saved version numbers, IDs, commit
   SHAs, and archive hashes.
2. Confirm both versions use a compatible save schema before republishing the
   prior version.
3. Deploy the prior version through the owner-only path and poll to success.
4. Probe production until the prior worker generation and notices are present
   and the current release evidence is absent or replaced as expected.
5. Redeploy the current version immediately, poll to success, and wait for the
   current interface hash, worker, notices, and release evidence to converge.
6. Recheck that access remains custom with one allowed owner and no groups.
7. Record both halves of the drill in `PLAYTESTS.md`, including any difference
   between control-plane completion and edge convergence.

If the prior artifact cannot be identified at the edge, the rollback has not
been proven. Restore the current version and keep the release gate open.
