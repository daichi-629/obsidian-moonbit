const JS_STRING_BUILTINS = ["js-string"] as const;
const MOONBIT_IMPORTED_STRING_CONSTANTS = "moonbit:constant_strings";

export type EmbeddedMoonBitWasmGcModule = {
	readonly kind: "embedded-moonbit-wasm-gc-module";
	readonly entryPath: string;
	readonly suggestedFileName: string;
	readonly wasmBase64: string;
};

export type LoadEmbeddedMoonBitWasmGcModuleOptions = {
	readonly imports?: WebAssembly.Imports;
};

type WasmGcCompileOptions = {
	readonly builtins: readonly string[];
	readonly importedStringConstants: string;
};

type WebAssemblyWithCompileOptions = typeof WebAssembly & {
	Module: {
		new (bytes: BufferSource, compileOptions?: unknown): WebAssembly.Module;
	};
};

type InstantiatedModule =
	| WebAssembly.Instance
	| {
			readonly instance: WebAssembly.Instance;
			readonly module: WebAssembly.Module;
	  };

export function createEmbeddedMoonBitWasmGcModule(
	module: EmbeddedMoonBitWasmGcModule
): EmbeddedMoonBitWasmGcModule {
	return module;
}

export async function loadEmbeddedMoonBitWasmGcModule<TExports = WebAssembly.Exports>(
	module: EmbeddedMoonBitWasmGcModule,
	options: LoadEmbeddedMoonBitWasmGcModuleOptions = {}
): Promise<TExports> {
	assertEmbeddedMoonBitWasmGcModule(module);
	const compiledModule = new (WebAssembly as WebAssemblyWithCompileOptions).Module(
		toArrayBuffer(decodeBase64(module.wasmBase64)),
		getWasmGcCompileOptions()
	);
	const instance = (await WebAssembly.instantiate(
		compiledModule,
		options.imports ?? {}
	)) as InstantiatedModule;

	if ("instance" in instance) {
		return instance.instance.exports as TExports;
	}

	return instance.exports as TExports;
}

export function getWasmGcCompileOptions(): WasmGcCompileOptions {
	return {
		builtins: JS_STRING_BUILTINS,
		importedStringConstants: MOONBIT_IMPORTED_STRING_CONSTANTS
	};
}

function assertEmbeddedMoonBitWasmGcModule(module: EmbeddedMoonBitWasmGcModule): void {
	if (module.kind !== "embedded-moonbit-wasm-gc-module") {
		throw new Error("Expected an embedded MoonBit wasm-gc module artifact");
	}
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
