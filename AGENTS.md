# Obsidian MoonBit library monorepo

## First read

- This repository is a `pnpm` monorepo for the `obsidian-moonbit` library.
- The product surface for consumers is the root package `obsidian-moonbit` and its subpath exports:
  `obsidian-moonbit`, `obsidian-moonbit/obsidian-api`, and `obsidian-moonbit/esbuild-plugin`.
- The intended package split and API shape are described in [`docs/moonbit-library-design.md`](/home/daichi/ghq/github.com/daichi-629/obsidian-plugin-moonbit-base/docs/moonbit-library-design.md).
- For reusable Obsidian integration guidance, load the local skill at [`.codex/skills/obsidian-plugin-dev/SKILL.md`](/home/daichi/ghq/github.com/daichi-629/obsidian-plugin-moonbit-base/.codex/skills/obsidian-plugin-dev/SKILL.md) and then read only the references you need.

## Repository layout

- `package.json`: Root consumer package published as `obsidian-moonbit`. Defines public subpath exports and the `prepare` build used by both npm publish and GitHub installs.
- `dist/`: Generated root package artifacts. Treat as build output, not source.
- `packages/obsidian-moonbit`: Core runtime for embedded MoonBit WebAssembly modules. Must remain independent from the Obsidian API.
- `packages/obsidian-moonbit-obsidian-api`: Obsidian-specific adapter exposing `loadMoonBit(plugin, module)`.
- `packages/obsidian-moonbit-esbuild-plugin`: Build-time integration for `.mbt` imports and MoonBit wasm embedding.
- `scripts/build-github-package.mjs`: Builds the root package artifacts consumed when the repo is installed directly from GitHub.

## Working rules

- Run workspace commands from the repository root with `pnpm`.
- Prefer the root scripts: `pnpm run build`, `pnpm run lint`, `pnpm run test`, and `pnpm run dev`.
- Keep the consumer-facing API stable at the root package level. Changes to subpath exports or import specifiers are high-impact and should be treated as API changes.
- Keep `packages/obsidian-moonbit` free of Obsidian API imports.
- Keep Obsidian-specific file-system and adapter logic inside `packages/obsidian-moonbit-obsidian-api`.
- Keep MoonBit source import handling, `moon build`, wasm lookup, hashing, and embedding logic inside `packages/obsidian-moonbit-esbuild-plugin`.
- When changing packaging, ensure both installation paths still work:
  published package `npm install obsidian-moonbit`
  GitHub install `npm install github:daichi-629/obsidian-moonbit`
- Prefer editing source under `packages/*/src` and `scripts/`; do not hand-edit generated `dist/` output except when debugging packaging.

## Validation

- For runtime or packaging changes, run `pnpm run build`.
- For behavior changes, run `pnpm run test`.
- For surface or source changes, run `pnpm run lint`.
- When changing root package exports or install flow, also verify `npm_config_cache=/tmp/npm-cache npm pack --dry-run`.
