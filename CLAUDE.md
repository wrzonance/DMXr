# DMXr for SignalRGB

> Follows the global `~/.claude/rules` (code · workflow · security · agents). This file holds only DMXr-specific facts and overrides.

DMXr bridges DMX lighting fixtures into SignalRGB as first-class canvas devices. Two-component architecture: a SignalRGB JS plugin and a Node.js server using Fastify + dmx-ts for ENTTEC DMX USB Pro output.

## Repo Structure

```
DMXr/
├── DMXr.js                      # SignalRGB plugin (UDP/HTTP color transport)
├── DMXr.qml                     # SignalRGB settings panel UI
├── docs/images/                 # SVG logos, fixture icons
└── server/
    ├── src/                     # All server TypeScript
    │   ├── bootstrap/           # Startup orchestration (DMX, library, shutdown)
    │   ├── config/              # Settings, remap-preset, server-config stores
    │   ├── dmx/                 # Universe manager, dispatcher, connection pool, monitor, driver factory
    │   ├── fixtures/            # Fixture/group/user-fixture stores, color pipeline, channel mapper
    │   ├── libraries/           # Library registry (OFL + user fixtures)
    │   ├── logging/             # Log buffer, pipeline logger
    │   ├── mdns/                # mDNS service advertisement
    │   ├── metrics/             # Latency tracker
    │   ├── middleware/           # API key auth, CORS, rate limiting, CSP (Helmet)
    │   ├── ofl/                 # Open Fixture Library client + disk cache
    │   ├── routes/              # Fastify route handlers (~27 route modules)
    │   ├── signalrgb/           # Component writer (syncs fixture layout to SignalRGB)
    │   ├── soundswitch/         # SoundSwitch client, fixture classifier, DB finder
    │   ├── types/               # Shared TypeScript types and protocol definitions
    │   ├── udp/                 # UDP color server (DMXRC binary protocol)
    │   ├── ui/                  # Frontend helpers (channel labels, CSS theming, OFL conversion)
    │   ├── ui-tests/            # Playwright E2E tests (grid, CRUD, settings, multi-select)
    │   └── utils/               # Formatting, validation helpers
    ├── public/                  # Alpine.js web UI (no build step)
    │   ├── js/                  # app.js + 31 mixin files
    │   └── css/                 # Feature-scoped CSS files
    └── config/                  # fixtures.json, settings.json (gitignored)
```

## Architecture

```
Browser (http://localhost:8080)       SignalRGB Plugin (DMXr.js)
  |  Fixture CRUD, library browse       |  UDP: DMXRC binary protocol (colors)
  |  Channel overrides, monitor         |  HTTP: GET /fixtures (fallback)
  v                                     v
+-----------------------------------------------------------+
|               DMXr Node.js Server (Fastify)               |
|                                                           |
|  Middleware: API key auth, CORS, rate limiting, CSP       |
|  Web UI <-> REST API <-> Fixture Store (JSON)             |
|  OFL Client (disk-cached) -> Library Registry             |
|  SoundSwitch DB Finder -> Fixture Classifier              |
|  UDP Color Server -> Color Pipeline -> DMX Dispatcher     |
|  Universe Manager -> Multi-Universe Coordinator -> dmx-ts |
|  SignalRGB Component Writer (fixture layout sync)         |
|  Movement Engine (pan/tilt interpolation)                 |
|  Latency Tracker -> GET /metrics                          |
|  Pipeline Logger -> Log Buffer -> GET /logs               |
+-----------------------------------------------------------+
                  |                  |
    ENTTEC DMX USB Pro       ArtNet / sACN (E1.31)
          |                  (network UDP output)
     DMX Universe
```

## Development

```bash
cd server
npm test          # vitest run (tests co-located: *.test.ts next to source)
npx tsc --noEmit  # type check (strict mode) -- the clean-check; no separate ESLint
npm run build     # tsc -> dist/
```

## Key Conventions

### Server (TypeScript)

- **Immutable state objects** in all stores -- never mutate, always spread-copy
- **saveChain promise serialization** for concurrent write safety (fixture-store, group-store, settings-store, remap-preset-store, universe-registry)
- **Atomic file writes** -- write to temp file, then rename
- **DmxWriteResult propagation** -- hardware errors bubble up through dispatcher/coordinator/universe-manager for feedback to callers
- **TypeScript strict mode** throughout
- **Test files co-located** with source (`foo.ts` / `foo.test.ts`)
- **Mock patterns**: stores and dispatcher are injected as dependencies, easily mocked in tests

### Frontend (Alpine.js Web UI)

- **Mixin pattern**: 22 mixins merged via `Object.defineProperties` in `app.js`
- **No build step** -- vanilla JS, served as static files by Fastify
- **Each mixin** is a standalone JS file in `public/js/` (e.g., `drag-drop.js`, `settings.js`, `dmx-monitor.js`)
- **CSS split** into feature-scoped files in `public/css/`

### SignalRGB Plugin

- `DMXr.js` at repo root (required location for addon auto-install)
- `DMXr.qml` for settings panel UI
- Uses `device.color(x,y)` to sample canvas (not `getColors("Inline")` which is broken)

## Testing (DMXr-specific)

- **Coverage is DIAGNOSTIC** -- vitest with no enforced minimum.
- Favor tests at **module/API boundaries** over internals; mock only at process edges (stores/dispatcher injected as deps).
- **Pin every bug-fix with a regression test referencing the commit SHA.**

## Note

For deployment credentials, SSH access, and machine-specific details -- query local `.claude/` memory files (not committed to repo). These vary per developer machine.

## Maintenance

When you add, remove, or rename a file, or change a module's public interface:

1. Update the relevant README.md in that module's directory
2. If the repo structure changed, update the tree in this file
3. Keep READMEs under 50 lines -- intent and connections, not implementation details
