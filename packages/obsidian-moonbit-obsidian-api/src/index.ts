import type { Plugin } from "obsidian";
import {
	loadEmbeddedMoonBitModule,
	type EmbeddedMoonBitModule,
	type MoonBitCacheStore
} from "@obsidian-moonbit/obsidian-moonbit";

type BinaryVaultAdapter = {
	exists(path: string): Promise<boolean>;
	mkdir(path: string): Promise<void>;
	readBinary(path: string): Promise<ArrayBuffer>;
	writeBinary(path: string, data: ArrayBuffer, options?: DataWriteOptions): Promise<void>;
};

type DataWriteOptions = {
	ctime?: number;
	mtime?: number;
};

export async function loadMoonBit<TExports extends WebAssembly.Exports = WebAssembly.Exports>(
	plugin: Plugin,
	module: EmbeddedMoonBitModule
): Promise<TExports> {
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

	return await loadEmbeddedMoonBitModule<TExports>(module, {
		cacheRoot,
		cacheStore
	});
}

function getBinaryVaultAdapter(plugin: Plugin): BinaryVaultAdapter {
	const adapter = plugin.app.vault.adapter as Partial<BinaryVaultAdapter>;
	if (
		typeof adapter.exists !== "function" ||
		typeof adapter.mkdir !== "function" ||
		typeof adapter.readBinary !== "function" ||
		typeof adapter.writeBinary !== "function"
	) {
		throw new Error("MoonBit loading requires an Obsidian vault adapter with binary read/write support");
	}

	return adapter as BinaryVaultAdapter;
}

async function ensureDirectory(adapter: BinaryVaultAdapter, directoryPath: string): Promise<void> {
	if (!directoryPath || directoryPath === ".") {
		return;
	}

	if (await adapter.exists(directoryPath)) {
		return;
	}

	const parent = parentDirectory(directoryPath);
	if (parent !== directoryPath) {
		await ensureDirectory(adapter, parent);
	}
	await adapter.mkdir(directoryPath);
}

function parentDirectory(path: string): string {
	const normalized = normalizePath(path);
	const lastSeparatorIndex = normalized.lastIndexOf("/");
	if (lastSeparatorIndex <= 0) {
		return ".";
	}

	return normalized.slice(0, lastSeparatorIndex);
}

function normalizePath(path: string): string {
	return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/u, "");
}

function toArrayBuffer(binary: Uint8Array): ArrayBuffer {
	return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer;
}
