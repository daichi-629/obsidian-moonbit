import type { Plugin, TFile } from "obsidian";
import {
	loadEmbeddedMoonBitWasmGcModule,
	type EmbeddedMoonBitWasmGcModule
} from "@obsidian-moonbit/obsidian-moonbit";

type WasmGcImportFunction = (...args: unknown[]) => unknown;

type WebAssemblyWithJspi = typeof WebAssembly & {
	Suspending?: new (fn: WasmGcImportFunction) => WasmGcImportFunction;
	promising?(fn: WasmGcImportFunction): WasmGcImportFunction;
};

export async function loadMoonBitWasmGc<TExports>(
	plugin: Plugin,
	module: EmbeddedMoonBitWasmGcModule
): Promise<TExports> {
	assertWasmGcRuntimeSupport();

	return await loadEmbeddedMoonBitWasmGcModule<TExports>(module, {
		imports: {
			obsidian: createObsidianImports(plugin)
		}
	});
}

function createObsidianImports(plugin: Plugin): Record<string, WasmGcImportFunction> {
	return {
		settings_json: async () => JSON.stringify((await plugin.loadData()) ?? null),
		vault_read: async (path: unknown) => {
			if (typeof path !== "string") {
				throw new TypeError("MoonBit wasm-gc vault_read(path) expects a string path");
			}

			const file = plugin.app.vault.getAbstractFileByPath(path);
			if (!file || !(typeof file === "object" && "path" in file)) {
				throw new Error(`MoonBit wasm-gc could not find a vault file at ${path}`);
			}

			return await plugin.app.vault.read(file as TFile);
		}
	};
}

function assertWasmGcRuntimeSupport(): void {
	const webAssemblyApi = WebAssembly as WebAssemblyWithJspi;
	if (typeof webAssemblyApi.Module !== "function" || typeof webAssemblyApi.instantiate !== "function") {
		throw new Error("MoonBit wasm-gc requires WebAssembly runtime support");
	}

	if (typeof webAssemblyApi.Suspending !== "function") {
		throw new Error("MoonBit wasm-gc requires JSPI support via WebAssembly.Suspending");
	}

	if (typeof webAssemblyApi.promising !== "function") {
		throw new Error("MoonBit wasm-gc requires JSPI support via WebAssembly.promising");
	}
}
