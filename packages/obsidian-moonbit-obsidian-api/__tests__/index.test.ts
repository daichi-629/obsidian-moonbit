import { afterEach, describe, expect, it, vi } from "vitest";
import { loadMoonBit, loadMoonBitWasmGc } from "../src/index";

const EMPTY_WASM_BASE64 = "AGFzbQEAAAA=";
const EMPTY_WASM_HASH = "2bf8b1254bbcbf63da4c6a048f8751df6a3385df4dddb4f190f1f9eb5dc51b98";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("loadMoonBit", () => {
	it("uses the plugin-local cache directory and writes the wasm once", async () => {
		const directories = new Set<string>();
		const files = new Map<string, ArrayBuffer>();
		const exists = vi.fn(async (path: string) => directories.has(path) || files.has(path));
		const mkdir = vi.fn(async (path: string) => {
			directories.add(path);
		});
		const readBinary = vi.fn(async (path: string) => {
			const binary = files.get(path);
			if (!binary) {
				throw new Error(`Missing binary for ${path}`);
			}
			return binary;
		});
		const writeBinary = vi.fn(async (path: string, data: ArrayBuffer) => {
			files.set(path, data);
		});
		const instantiate = vi
			.spyOn(WebAssembly, "instantiate")
			.mockResolvedValue({ exports: { moonbit_answer: () => 42 } } as never);

		const exportsObject = await loadMoonBit<{ moonbit_answer(): number }>(
			{
				manifest: {
					dir: ".obsidian/plugins/example-plugin"
				},
				app: {
					vault: {
						adapter: {
							exists,
							mkdir,
							readBinary,
							writeBinary
						}
					}
				}
			} as never,
			{
				kind: "embedded-moonbit-wasm-module",
				wasmBase64: EMPTY_WASM_BASE64,
				wasmHash: EMPTY_WASM_HASH,
				suggestedFileName: "demo.wasm"
			}
		);

		expect(mkdir).toHaveBeenCalledWith(".obsidian");
		expect(mkdir).toHaveBeenCalledWith(".obsidian/plugins");
		expect(mkdir).toHaveBeenCalledWith(".obsidian/plugins/example-plugin");
		expect(mkdir).toHaveBeenCalledWith(".obsidian/plugins/example-plugin/.moonbit-cache");
		expect(writeBinary).toHaveBeenCalledOnce();
		expect(readBinary).toHaveBeenCalledOnce();
		expect(instantiate).toHaveBeenCalledOnce();
		expect(exportsObject.moonbit_answer()).toBe(42);
	});
});

describe("loadMoonBitWasmGc", () => {
	it("assembles Obsidian imports and delegates to the wasm-gc runtime", async () => {
		const instantiate = vi
			.spyOn(WebAssembly, "instantiate")
			.mockResolvedValue({
				exports: {
					settings_json: () => "{}"
				}
			} as never);
		const originalSuspending = (WebAssembly as { Suspending?: unknown }).Suspending;
		const originalPromising = (WebAssembly as { promising?: unknown }).promising;
		(WebAssembly as { Suspending?: unknown }).Suspending = function (this: object, fn: unknown) {
			return fn;
		} as never;
		(WebAssembly as { promising?: unknown }).promising = ((fn: unknown) => fn) as never;

		try {
			await loadMoonBitWasmGc(
				{
					loadData: vi.fn(async () => ({ enabled: true })),
					app: {
						vault: {
							getAbstractFileByPath: vi.fn(() => ({ path: "note.md" })),
							read: vi.fn(async () => "hello")
						}
					}
				} as never,
				{
					kind: "embedded-moonbit-wasm-gc-module",
					entryPath: "cmd/main/main.mbt",
					wasmBase64: EMPTY_WASM_BASE64,
					suggestedFileName: "main.wasm",
					asyncExportNames: []
				}
			);

			expect(instantiate).toHaveBeenCalledOnce();
			const [, imports] = instantiate.mock.calls[0];
			expect(imports).toHaveProperty("obsidian");
		} finally {
			(WebAssembly as { Suspending?: unknown }).Suspending = originalSuspending;
			(WebAssembly as { promising?: unknown }).promising = originalPromising;
		}
	});
});
