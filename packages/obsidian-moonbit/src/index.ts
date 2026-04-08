export type MoonBitImports =
	| WebAssembly.Imports
	| (() => WebAssembly.Imports | Promise<WebAssembly.Imports>);

export type EmbeddedMoonBitModule = {
	readonly kind: "embedded-moonbit-module";
	readonly wasmBase64: string;
	readonly wasmHash: string;
	readonly suggestedFileName: string;
	readonly imports?: MoonBitImports;
};

export type MoonBitCacheStore = {
	readBinary(path: string): Promise<Uint8Array | null>;
	writeBinary(path: string, binary: Uint8Array): Promise<void>;
};

export type LoadEmbeddedMoonBitModuleOptions = {
	readonly cacheRoot: string;
	readonly cacheStore: MoonBitCacheStore;
};

export function createEmbeddedMoonBitModule(
	module: EmbeddedMoonBitModule
): EmbeddedMoonBitModule {
	return module;
}

export async function loadEmbeddedMoonBitModule<
	TExports extends WebAssembly.Exports = WebAssembly.Exports
>(
	module: EmbeddedMoonBitModule,
	options: LoadEmbeddedMoonBitModuleOptions
): Promise<TExports> {
	assertEmbeddedMoonBitModule(module);
	const cachePath = buildMoonBitCachePath(options.cacheRoot, module);

	let binary = await options.cacheStore.readBinary(cachePath);
	if (!binary) {
		const decodedBinary = decodeBase64(module.wasmBase64);
		await options.cacheStore.writeBinary(cachePath, decodedBinary);
		binary = await options.cacheStore.readBinary(cachePath);
	}

	if (!binary) {
		throw new Error(`MoonBit cache write did not persist ${cachePath}`);
	}

	const imports = await resolveImports(module.imports);
	const compiledModule = await WebAssembly.compile(toArrayBuffer(binary));
	const instance = await WebAssembly.instantiate(compiledModule, imports);
	return instance.exports as TExports;
}

export function buildMoonBitCachePath(
	cacheRoot: string,
	module: Pick<EmbeddedMoonBitModule, "suggestedFileName" | "wasmHash">
): string {
	const fileStem = normalizeSuggestedFileName(module.suggestedFileName);
	return `${trimTrailingSlashes(cacheRoot)}/${fileStem}.${module.wasmHash}.wasm`;
}

function assertEmbeddedMoonBitModule(module: EmbeddedMoonBitModule): void {
	if (module.kind !== "embedded-moonbit-module") {
		throw new Error("Expected an embedded MoonBit module artifact");
	}
}

async function resolveImports(imports: MoonBitImports | undefined): Promise<WebAssembly.Imports> {
	if (!imports) {
		return {};
	}

	if (typeof imports === "function") {
		return await imports();
	}

	return imports;
}

function normalizeSuggestedFileName(fileName: string): string {
	const trimmed = fileName.trim();
	const withoutExtension = trimmed.endsWith(".wasm")
		? trimmed.slice(0, -".wasm".length)
		: trimmed;
	const sanitized = withoutExtension.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
	return sanitized || "moonbit-module";
}

function trimTrailingSlashes(path: string): string {
	return path.replace(/[\\/]+$/u, "");
}

function decodeBase64(payload: string): Uint8Array {
	if (typeof globalThis.atob === "function") {
		const binary = globalThis.atob(payload);
		return Uint8Array.from(binary, (character) => character.charCodeAt(0));
	}

	return Uint8Array.from(Buffer.from(payload, "base64"));
}

function toArrayBuffer(binary: Uint8Array): ArrayBuffer {
	return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer;
}
