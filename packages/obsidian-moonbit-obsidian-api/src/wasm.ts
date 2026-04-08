import type { Plugin } from "obsidian";
import {
	loadEmbeddedMoonBitWasmModule,
	type EmbeddedMoonBitWasmModule,
	type MoonBitCacheStore
} from "@obsidian-moonbit/obsidian-moonbit";
import {
	ensureDirectory,
	getBinaryVaultAdapter,
	parentDirectory,
	normalizePath,
	toArrayBuffer
} from "./shared";

export async function loadMoonBitWasm<
	TExports extends WebAssembly.Exports = WebAssembly.Exports
>(plugin: Plugin, module: EmbeddedMoonBitWasmModule): Promise<TExports> {
	const cacheRoot = normalizePath(`${plugin.manifest.dir}/.moonbit-cache`);
	const adapter = getBinaryVaultAdapter(plugin);
	await ensureDirectory(adapter, cacheRoot);

	const cacheStore: MoonBitCacheStore = {
		readBinary: async (path) => {
			if (!(await adapter.exists(path))) {
				return null;
			}

			return new Uint8Array(await adapter.readBinary(path));
		},
		writeBinary: async (path, binary) => {
			await ensureDirectory(adapter, parentDirectory(path));
			await adapter.writeBinary(path, toArrayBuffer(binary));
		}
	};

	return await loadEmbeddedMoonBitWasmModule<TExports>(module, {
		cacheRoot,
		cacheStore
	});
}
