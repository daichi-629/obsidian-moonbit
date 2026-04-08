import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	findMoonProjectRoot,
	pickBuiltWasmPath,
	renderEmbeddedMoonBitModule
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
});

describe("renderEmbeddedMoonBitModule", () => {
	it("renders the internal embedded artifact descriptor", () => {
		expect(
			renderEmbeddedMoonBitModule({
				wasmBase64: "AQID",
				wasmHash: "hash",
				suggestedFileName: "demo.wasm"
			})
		).toContain('kind: "embedded-moonbit-module"');
	});
});
