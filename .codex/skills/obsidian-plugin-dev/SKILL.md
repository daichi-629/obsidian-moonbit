---
name: obsidian-plugin-dev
description: Guidance for implementing, refactoring, packaging, and validating the Obsidian-facing MoonBit integration library in this repository. Use when work touches the Obsidian adapter, the consumer package surface, `.mbt` build integration, or package boundaries across the workspace.
---

# Obsidian Plugin Dev

Use this skill for reusable Obsidian-facing conventions in the `obsidian-moonbit` workspace. Keep repository-specific rules in `AGENTS.md`, and load only the reference files that match the task.

## Workflow

1. Decide whether the task changes the core runtime, the Obsidian adapter, the esbuild integration, or the published root package surface.
2. Read `references/obsidian-community-plugin.md` when changing the Obsidian adapter package, `loadMoonBit(...)`, plugin-facing examples, or other Obsidian API behavior.
3. Read `references/monorepo-layout.md` when changing package boundaries, root exports, build scripts, install flow, or release packaging.
4. Keep the public consumer API stable at `obsidian-moonbit`, `obsidian-moonbit/obsidian-api`, and `obsidian-moonbit/esbuild-plugin` unless the user explicitly wants an API break.
5. Keep `packages/obsidian-moonbit` independent from the Obsidian API.
6. Validate with the relevant root scripts before finishing, and check `npm pack --dry-run` when packaging changes.

## Reference files

- `references/obsidian-community-plugin.md`
- `references/monorepo-layout.md`
