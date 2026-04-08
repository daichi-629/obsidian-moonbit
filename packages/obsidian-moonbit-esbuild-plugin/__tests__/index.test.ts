import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	findMoonProjectRoot,
	moonBitEsbuildPlugin,
	pickBuiltWasmPath,
	resolveBuiltWasmDirectory,
	renderEmbeddedMoonBitWasmModule
} from "../src/index";

describe("findMoonProjectRoot", () => {
	it("walks up to the nearest moon.mod.json", () => {
		const fixtureRoot = join(tmpdir(), `moonbit-esbuild-${Date.now()}-root`);
		const nestedDirectory = join(fixtureRoot, "src", "nested");
		mkdirSync(nestedDirectory, { recursive: true });
		writeFileSync(join(fixtureRoot, "moon.mod.json"), "{}");
		writeFileSync(join(nestedDirectory, "demo.mbt"), "");

		expect(findMoonProjectRoot(join(nestedDirectory, "demo.mbt"))).toBe(fixtureRoot);
	});
});

describe("pickBuiltWasmPath", () => {
	it("prefers the wasm matching the MoonBit source name", () => {
		const fixtureRoot = join(tmpdir(), `moonbit-esbuild-${Date.now()}-wasm`);
		mkdirSync(fixtureRoot, { recursive: true });
		writeFileSync(join(fixtureRoot, "other.wasm"), "other");
		writeFileSync(join(fixtureRoot, "demo.wasm"), "demo");

		expect(pickBuiltWasmPath(fixtureRoot, "/workspace/demo.mbt")).toBe(
			join(fixtureRoot, "demo.wasm")
		);
	});

	it("finds wasm files in nested build directories", () => {
		const fixtureRoot = join(tmpdir(), `moonbit-esbuild-${Date.now()}-nested`);
		const nestedDirectory = join(fixtureRoot, "cmd", "wasm");
		mkdirSync(nestedDirectory, { recursive: true });
		writeFileSync(join(nestedDirectory, "demo.wasm"), "demo");

		expect(pickBuiltWasmPath(fixtureRoot, "/workspace/demo.mbt")).toBe(
			join(nestedDirectory, "demo.wasm")
		);
	});
});

describe("resolveBuiltWasmDirectory", () => {
	it("maps the source directory into the build tree", () => {
		const fixtureRoot = join(tmpdir(), `moonbit-esbuild-${Date.now()}-mapped-dir`);
		const mappedDirectory = join(fixtureRoot, "cmd", "wasm");
		mkdirSync(mappedDirectory, { recursive: true });

		expect(
			resolveBuiltWasmDirectory(
				fixtureRoot,
				"/workspace/moonbit",
				"/workspace/moonbit/cmd/wasm/main.mbt"
			)
		).toBe(mappedDirectory);
	});

	it("falls back to the build root when the mapped directory does not exist", () => {
		const fixtureRoot = join(tmpdir(), `moonbit-esbuild-${Date.now()}-build-root`);
		mkdirSync(fixtureRoot, { recursive: true });

		expect(
			resolveBuiltWasmDirectory(
				fixtureRoot,
				"/workspace/moonbit",
				"/workspace/moonbit/cmd/wasm/main.mbt"
			)
		).toBe(fixtureRoot);
	});
});

describe("renderEmbeddedMoonBitWasmModule", () => {
	it("renders the wasm artifact descriptor", () => {
		expect(
			renderEmbeddedMoonBitWasmModule({
				wasmBase64: "AQID",
				wasmHash: "hash",
				suggestedFileName: "demo.wasm"
			})
		).toContain('kind: "embedded-moonbit-wasm-module"');
	});
});

describe("moonBitEsbuildPlugin", () => {
	it("passes include through to the target-specific plugin", () => {
		const plugin = moonBitEsbuildPlugin({
			include(entryPath) {
				return entryPath.includes("/cmd/wasm/");
			}
		});

		expect(plugin.name).toBe("moonbit-esbuild-plugin-wasm");
	});
});
