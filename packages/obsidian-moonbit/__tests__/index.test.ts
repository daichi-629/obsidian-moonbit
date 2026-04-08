import { afterEach, describe, expect, it, vi } from "vitest";
import {
	buildMoonBitCachePath,
	createEmbeddedMoonBitModule,
	createEmbeddedMoonBitWasmGcModule,
	loadEmbeddedMoonBitModule,
	wrapPromisingExports,
	wrapSuspendingImports,
	type MoonBitCacheStore
} from "../src/index";

const EMPTY_WASM_BASE64 = "AGFzbQEAAAA=";
const EMPTY_WASM_HASH = "2bf8b1254bbcbf63da4c6a048f8751df6a3385df4dddb4f190f1f9eb5dc51b98";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("buildMoonBitCachePath", () => {
	it("uses the suggested file name and hash", () => {
		expect(
			buildMoonBitCachePath("/cache/root/", {
				suggestedFileName: "demo.wasm",
				wasmHash: "abc123"
			})
		).toBe("/cache/root/demo.abc123.wasm");
	});
});

describe("loadEmbeddedMoonBitModule", () => {
	it("writes embedded wasm once and loads exports from the cache", async () => {
		const readBinary = vi
			.fn<(_: string) => Promise<Uint8Array | null>>()
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(Uint8Array.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
		const writeBinary = vi.fn<(_: string, __: Uint8Array) => Promise<void>>().mockResolvedValue();
		const cacheStore: MoonBitCacheStore = { readBinary, writeBinary };
		const instantiate = vi
			.spyOn(WebAssembly, "instantiate")
			.mockResolvedValue({ exports: { answer: 42 } } as never);

		const exportsObject = await loadEmbeddedMoonBitModule<{ answer: number }>(
			createEmbeddedMoonBitModule({
				kind: "embedded-moonbit-wasm-module",
				wasmBase64: EMPTY_WASM_BASE64,
				wasmHash: EMPTY_WASM_HASH,
				suggestedFileName: "demo.wasm"
			}),
			{
				cacheRoot: "/cache",
				cacheStore
			}
		);

		expect(writeBinary).toHaveBeenCalledOnce();
		expect(readBinary).toHaveBeenCalledTimes(2);
		expect(instantiate).toHaveBeenCalledOnce();
		expect(exportsObject.answer).toBe(42);
	});
});

describe("wrapSuspendingImports", () => {
	it("wraps nested import functions with WebAssembly.Suspending", () => {
		const wrapped = vi.fn((value: (...args: unknown[]) => unknown) => value);
		const originalSuspending = (WebAssembly as { Suspending?: unknown }).Suspending;
		(WebAssembly as { Suspending?: unknown }).Suspending = function (this: object, fn: unknown) {
			return wrapped(fn as (...args: unknown[]) => unknown);
		} as never;

		try {
			const imports = wrapSuspendingImports({
				obsidian: {
					settings_json: () => "{}",
					vault_read: async () => "note"
				}
			});

			expect(wrapped).toHaveBeenCalledTimes(2);
			expect(typeof (imports as { obsidian: { settings_json: unknown } }).obsidian.settings_json).toBe(
				"function"
			);
		} finally {
			(WebAssembly as { Suspending?: unknown }).Suspending = originalSuspending;
		}
	});
});

describe("wrapPromisingExports", () => {
	it("wraps only configured async exports", async () => {
		const promising = vi.fn((fn: (...args: unknown[]) => unknown) => async (...args: unknown[]) =>
			fn(...args)
		);
		const exportsObject = {
			run: () => "sync",
			fetch_text: () => "async"
		} satisfies WebAssembly.Exports;

		const wrapped = wrapPromisingExports(exportsObject, ["fetch_text"], {
			...WebAssembly,
			promising
		});

		expect(wrapped.run()).toBe("sync");
		expect(promising).toHaveBeenCalledOnce();
		await expect(wrapped.fetch_text()).resolves.toBe("async");
	});
});

describe("createEmbeddedMoonBitWasmGcModule", () => {
	it("returns the input module unchanged", () => {
		const module = createEmbeddedMoonBitWasmGcModule({
			kind: "embedded-moonbit-wasm-gc-module",
			entryPath: "cmd/main/main.mbt",
			wasmBase64: EMPTY_WASM_BASE64,
			suggestedFileName: "main.wasm"
		});

		expect(module.entryPath).toBe("cmd/main/main.mbt");
	});
});
