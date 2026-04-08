# MoonBit Library Design

This document captures the intended package split and public API shape for a reusable MoonBit integration library for Obsidian plugin authors.

## Goal

Provide a plugin-author-facing integration that feels like a normal import-and-load flow.
The public API should hide implementation details such as:

- `wasm` hashing
- base64 embedding
- cache path management
- first-run extraction
- `VaultAdapter.writeBinary(...)`

Plugin authors should only need to import a generated MoonBit module and call `loadMoonBit(...)`.

## Package split

### `@username/obsidian-moonbit`

Core runtime for MoonBit-backed WebAssembly modules.

Responsibilities:

- instantiate embedded `wasm`
- manage internal cache/version checks
- provide the internal module contract consumed by higher-level adapters

This package should not depend on the Obsidian API.

### `@username/obsidian-moonbit-obsidian-api`

Obsidian-specific adapter layer.

Responsibilities:

- accept an Obsidian `Plugin`
- resolve plugin-local cache paths
- use the Obsidian vault adapter for persisted `wasm` caching
- expose the high-level public API for plugin authors

This package depends on `@username/obsidian-moonbit`.

### `@username/obsidian-moonbit-esbuild-plugin`

Build-time integration for plugin authors.

Responsibilities:

- handle MoonBit source imports in the plugin build
- run `moon build`
- find the generated `wasm`
- embed the `wasm` into generated JavaScript
- emit the internal module metadata consumed by runtime code

This package hides build-time details from plugin authors.

## Public API

The plugin-author-facing API should be reduced to `loadMoonBit(...)`.

Example:

```ts
import { loadMoonBit } from "@username/obsidian-moonbit-obsidian-api";
import demoModule from "./moonbit/demo.mbt";

const wasm = await loadMoonBit(this, demoModule);
```

Expected properties:

- the caller passes the current `Plugin`
- the caller passes a generated MoonBit module artifact
- the return value is the instantiated exports object
- no hash, cache, or file-path arguments are exposed

## Internal module contract

The generated module imported from `.mbt` should not expose raw embedding details to plugin authors.
It should export an internal artifact object that is only meant to be consumed by `loadMoonBit(...)`.

Conceptually:

```ts
type EmbeddedMoonBitModule = {
  readonly kind: "embedded-moonbit-module";
  readonly wasmBase64: string;
  readonly wasmHash: string;
  readonly suggestedFileName: string;
  readonly imports?: WebAssembly.Imports;
};
```

This shape is internal. Plugin authors should not construct it manually.

## Runtime flow

`loadMoonBit(plugin, module)` should do the following:

1. derive a stable cache location for the plugin
2. check whether the cached `wasm` for `module.wasmHash` already exists
3. if missing, decode the embedded payload and write it once
4. read the cached binary
5. instantiate it and return the exports

The hash-based cache key is an implementation detail, not part of the public API.

## Why `loadMoonBit(...)`

This API shape keeps the integration small and obvious:

- plugin authors learn one entrypoint
- the runtime can change cache/versioning behavior later without API churn
- the esbuild plugin can evolve independently of Obsidian-specific code

This is preferable to exposing lower-level APIs around cache adapters, hashes, or embedded bytes.

## Non-goals

The initial design does not try to:

- support manual construction of embedded module descriptors
- expose a public cache management API
- require plugin authors to call `moon build` directly in application code

Build orchestration belongs in the esbuild plugin or related tooling.
