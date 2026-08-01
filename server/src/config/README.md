# config/ — Settings, Presets & Server Configuration

## Files

### server-config.ts
- `loadConfig(persisted?)` -> `ServerConfig`
- Merges environment variables over persisted settings
- Validates PORT, DMX_DRIVER (null | enttec-usb-dmx-pro | enttec-open-usb-dmx), PORT_RANGE_SIZE
- Auto-detects SoundSwitch DB path via `findSoundswitchDb()`

### settings-store.ts
- `createSettingsStore(filePath)` -> `SettingsStore { load, update, get }`
- Persists to `./config/settings.json` (dmxDriver, port, host, mDNS, serverId, serverName, etc.)
- Auto-generates `serverId` (UUID) on first load if missing
- Always returns defensive copies (`{ ...current }`) to prevent external mutation

### node-pin.ts
- `parseMajor(raw)`, `isBoundedRange(range)`, `checkNodePin(inputs)` -> `NodePinCheckResult`
- Pure comparison logic for the Node 24 LTS pin (issue #126): asserts `.nvmrc`,
  `engines.node`, `@types/node` and the running interpreter all name the same major,
  and that `engines.node` is bounded rather than an open-ended floor
- No I/O -- `server/scripts/check-node-pin.ts` supplies the files and the exit code.
  Lives here so tsconfig typechecks it and vitest covers it; `scripts/` is outside both.

### remap-preset-store.ts
- `createRemapPresetStore(filePath)` -> `RemapPresetStore { load, getAll, get, upsert, remove, save }`
- Stores named channel-remap presets (channelCount + offset mapping)
- Persists to `./config/remap-presets.json`

## Persistence Pattern (saveChain)

All stores use a chained-promise write pattern to prevent concurrent file writes:

```ts
saveChain = saveChain.then(async () => {
  await writeFile(tmpPath, data);
  await rename(tmpPath, filePath);  // atomic swap
});
```

This ensures writes are serialized even when multiple callers trigger saves
concurrently. The atomic rename prevents partial-write corruption on crash.
