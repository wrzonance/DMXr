# Changelog

All notable changes to DMXr are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.3] - 2026-09-15

Maintenance release: every open security advisory cleared, the bundled runtime
moved to Node 24 LTS, and the release pipeline fixed so build assets attach
again. No user-facing feature changes.

### Security
- `fastify` 5.8.5 → 5.12.3 ([GHSA-w2qp-rph6-63g4](https://github.com/advisories/GHSA-w2qp-rph6-63g4) schema-validation bypass, [GHSA-3m5p-2c4r-xxw2](https://github.com/advisories/GHSA-3m5p-2c4r-xxw2) `X-Forwarded-*` spoofing under `trustProxy`)
- `@fastify/rate-limit` 10.3.0 → 11.2.0 ([GHSA-grpc-p53c-r64v](https://github.com/advisories/GHSA-grpc-p53c-r64v) — high, rate-limit bypass via IPv6 address rotation)
- `@fastify/static` 9 → 10 ([GHSA-8pvw-jcv7-9cmj](https://github.com/advisories/GHSA-8pvw-jcv7-9cmj) authorization bypass via non-canonical paths, [GHSA-83w8-p2f5-377r](https://github.com/advisories/GHSA-83w8-p2f5-377r) route-guard bypass via path traversal) — this plugin serves the web UI
- `fast-uri` transitive bumps ([GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8), [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc), [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf), [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp) — host confusion / SSRF)
- Fixture flash `durationMs` explicitly clamped (CodeQL CWE-400, defense-in-depth alongside schema validation)
- Dev-only transitives cleared: `js-yaml`, `nanoid`, `postcss`, `brace-expansion`, `find-my-way`, `@vitest/mocker`, `extract-zip` (via puppeteer 25)
- GitHub Actions hardened per `zizmor`: `persist-credentials: false` on every checkout, npm cache disabled in the release-publishing job; all actions pinned to full commit SHAs

### Changed
- **Node 24 LTS is now required and bundled** (was Node 22). `.nvmrc` is the single source of truth, `engine-strict` makes `npm ci` fail on any other major, and CI asserts every Node declaration agrees
- `typescript` 6.0.3 → 7.0.2 (native compiler), `better-sqlite3` 12.9.0 → 13.0.3 (N-API build, SQLite 3.53.4)
- `vitest` / `@vitest/coverage-v8` 4.1.5 → 5.0.0, `puppeteer` 24 → 25, `@playwright/test` → 1.63.0 (dev)
- `@fastify/helmet`, `zod`, `tsx`, `@types/semver` minor/patch updates
- Version updates are owned by Renovate (7-day minimum release age); Dependabot handles security alerts only
- CodeQL code scanning and dependency-review workflows added; CI token scoped to least privilege

### Fixed
- Release build: Node.js checksum verification used the wrong filename, which is why the v1.3.2 release shipped without build assets
- CI Node-version check compares ranges semantically instead of by shape

### Tests
- Property-based tests (`fast-check`) for motor-guard, CIDR and pipeline stages; redundant and tautological tests removed; UI tests run single-worker

## [1.3.2] - 2026-05-01

Note: the GitHub release for this version has no build assets — the release
build failed on Node.js checksum verification (fixed in 1.3.3).

### Security
- Phase 1 of the 2026-04-08 security audit: auth middleware inverted to fail-closed so every route is protected when `API_KEY` is set, plus the other CRITICAL findings (#86)
- `basic-ftp` DoS, `fastify` content-type bypass ([GHSA-247c-9743-5963](https://github.com/advisories/GHSA-247c-9743-5963)) and `postcss` XSS resolved via `npm audit fix`

### Changed
- `fastify` 5.8.4 → 5.8.5, `@fastify/static` 9.1.0 → 9.1.3, `better-sqlite3` 12.8.0 → 12.9.0
- `vitest` / `@vitest/coverage-v8` 4.1.3 → 4.1.5, `puppeteer` 24.40 → 24.42, `typescript` 6.0.2 → 6.0.3, `pixelmatch` 7.1 → 7.2, `@types/node` 25.5.2 → 25.6.0 (dev)
- `actions/setup-node` 6.3 → 6.4, `softprops/action-gh-release` 2.6 → 3.0
- `server/config/` is gitignored in full

## [1.3.1] - 2026-04-08

### Security
- `basic-ftp` bumped via `npm audit fix` ([GHSA-chqc-8p9q-pq6q](https://github.com/advisories/GHSA-chqc-8p9q-pq6q) — high, FTP command injection via CRLF; transitive dev dep from puppeteer)
- `brace-expansion` bumped via `npm audit fix` ([GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v) — moderate, ReDoS)
- `vite` bumped transitively via `vitest` 4.1.3 ([GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9), [GHSA-v2wj-q39q-566r](https://github.com/advisories/GHSA-v2wj-q39q-566r), [GHSA-p9ff-h696-f583](https://github.com/advisories/GHSA-p9ff-h696-f583))

### Changed
- `@fastify/static` 9.0.0 → 9.1.0 (includes upstream `sendFile` option-override fix)
- `vitest` 4.1.1 → 4.1.3
- `@vitest/coverage-v8` 4.1.1 → 4.1.3
- `@playwright/test` 1.58.2 → 1.59.1 (dev)
- `@types/node` 25.5.0 → 25.5.2 (dev)

## [1.3.0] - 2026-03-12

### Added
- Real-time DMX hardware indicator in web UI top bar (connected/disconnected/reconnecting)
- Always-on SSE connection log stream — hardware state updates push to UI instantly
- `control_mode_changed` event type for immediate blackout/whiteout UI feedback on reconnect
- DMX write result propagation and action feedback toasts
- Optimistic concurrency control (version field on fixtures)
- SSE heartbeat and destroyed-guard for connection cleanup
- Puppeteer UI test infrastructure (23 tests across 6 suites)
- Onboarding tour and contextual help system
- Movement control for moving fixtures (pan/tilt interpolation)
- Multi-select fixture management with batch operations
- Marquee drag-select on DMX grid with visual rectangle overlay
- Selection-aware groups with multi-fixture drag-move
- Per-fixture color calibration (gain/offset per RGB channel)
- Connection event log for DMX diagnostics
- Offline OFL cache for disconnected environments
- Fixture grouping and bulk control
- Channel remap UI, presets, and single-channel test
- Fixture card color swatch and overflow menu layout
- Configuration backup and restore (export/import)
- Fixture duplicate and bulk add operations
- One-time plugin update check against GitHub
- Live DMX channel monitor with SSE streaming (grid + fixture views)
- Universe selector and multi-universe awareness
- ControlMode state sync (blackout/whiteout) across all clients
- Custom fixture builder with template store and library provider
- Generic fixture type icons with category derivation
- OFL JSON import/export for fixtures
- Built-in generic fixture templates
- Server naming in web UI with live mDNS republish
- Flash click-to-sustain with channel locking
- DMXr logo across README, web UI, and SignalRGB plugin
- CLAUDE.md and per-module README files
- Prometheus metrics endpoint and structured log format config
- MIT license
- Dependabot, CODEOWNERS, and security audit CI job

### Fixed
- USB disconnect no longer crashes server (serial port error/close events properly handled)
- Null TypeError on Windows serial port close event (`null !== undefined` guard)
- Single-universe `onStateChange` now pushes to ConnectionLog for SSE propagation
- Startup defaults no longer bypass blackout (S100 strobe bug)
- ENTTEC flushed to blackout on connect and reconnect
- Error boundaries added to shutdown sequence
- Request body size limits and input bounds enforcement
- Fixture validation before replace-mode deletion in config import
- Save errors now logged instead of silently swallowed
- saveChain added to remap-preset-store for concurrent write safety
- Group-control timers tracked and cleared on shutdown
- mDNS storm reduction (reuse socket, disable probes, debounce republish)
- Alpine reactive storm from @mousemove on body
- Motor guard slider range and Auto mode
- Server stays in blackout mode on startup until client resumes
- Per-device icons in SignalRGB via setImageFromBase64

### Changed
- Shared ConnectionLog injected from index.ts into both DMX stacks
- Refactored style.css into feature-scoped CSS files
- Split fixture-manager.js into motor-guard, fixture-reset, color-calibration mixins
- Extracted Fastify schemas from fixtures route
- Error logging added to silent catch blocks
- Browse source tabs replaced with dropdown select
- DMX monitor rendering optimized for RDP

## [1.2.0] - 2026-03-03

### Added
- Dependabot for automated dependency updates
- CODEOWNERS file
- Security audit CI job

### Changed
- Bumped dmx-ts from 0.1.1 to 0.4.0
- Bumped vitest from 3.2.4 to 4.0.18
- Updated CI actions (checkout v6, setup-node v6, upload-artifact v7)

### Fixed
- Bonjour mock repaired for vitest 4 ESM constructor handling
- @vitest/coverage-v8 peer dependency alignment

## [1.1.0] - 2026-03-03

### Added
- Multi-server support with server identity and plugin registry
- Multi-server QML settings panel with per-server status cards
- Open DMX USB (FTDI) driver support
- Motor guard UI toggle with atomic blackout/whiteout preserving pan/tilt
- DMX fixture reset button with auto-detection
- Debug endpoints (`/debug/raw`, `/debug/fixture/:id`)
- Verbose pipeline logging for DMX channel debugging
- Manual server probing as mDNS fallback
- UDP port exposed in health response

### Fixed
- Motor guard clamps slider range and Auto mode for motor channels
- Motor-safe blackout/whiteout with per-fixture guard settings
- Pan/tilt restored in color frames (tilt regression fix)
- Rate limit increased from 100 to 600 req/min
- Override values pushed to DMX immediately on PATCH
- SoundSwitch range clamping; positional channels excluded from color frames
- QML-saved server settings now read for multi-server probe

### Changed
- CI triggers build on tag push with draft release artifacts

## [1.0.1] - 2026-03-02

### Added
- Momentary press-and-hold flash that overrides blackout

### Fixed
- UDP color data no longer overrides blackout/whiteout state

## [1.0.0] - 2026-03-02

### Added
- Initial release
- SignalRGB plugin with CompGen + device.color hybrid approach
- Node.js server (Fastify) with REST API and web UI
- DMX output via dmx-ts (ENTTEC DMX USB Pro)
- UDP color transport (DMXRC binary protocol) with HTTP fallback
- Persistent fixture store with atomic file writes
- Fixture channel mapping and color pipeline (RGB/RGBW)
- White-gated strobe support
- Per-channel overrides from web UI
- Blackout/whiteout control
- mDNS server discovery
- Auto COM port detection
- Multi-platform build workflow (Windows, Linux, macOS)
- Linux systemd installer and launcher scripts
- Alpine.js web manager UI

[Unreleased]: https://github.com/wrzonance/DMXr/compare/v1.3.3...HEAD
[1.3.3]: https://github.com/wrzonance/DMXr/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/wrzonance/DMXr/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/wrzonance/DMXr/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/thewrz/DMXr/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/thewrz/DMXr/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/thewrz/DMXr/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/thewrz/DMXr/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/thewrz/DMXr/releases/tag/v1.0.0
