const JS_STRING_BUILTINS = ["js-string"] as const;
const MOONBIT_IMPORTED_STRING_CONSTANTS = "moonbit:constant_strings";

export type EmbeddedMoonBitWasmGcModule = {
	readonly kind: "embedded-moonbit-wasm-gc-module";
	readonly entryPath: string;
	readonly suggestedFileName: string;
	readonly wasmBase64: string;
	readonly asyncExportNames?: readonly string[];
};

export type LoadEmbeddedMoonBitWasmGcModuleOptions = {
	readonly imports: WebAssembly.Imports;
};

type WasmGcInstance = {
	readonly exports: WebAssembly.Exports;
};

type WasmGcCompileOptions = {
	readonly builtins: readonly string[];
	readonly importedStringConstants: string;
};

type WasmGcExportsWithPromising = WebAssembly.Exports & {
	[name: string]: unknown;
};

type WebAssemblyWithJspi = typeof WebAssembly & {
	promising?(fn: (...args: unknown[]) => unknown): (...args: unknown[]) => Promise<unknown>;
	Suspending?: new (fn: (...args: unknown[]) => unknown) => (...args: unknown[]) => unknown;
	Module: {
		new (bytes: BufferSource, compileOptions?: unknown): WebAssembly.Module;
	};
};

export function createEmbeddedMoonBitWasmGcModule(
	module: EmbeddedMoonBitWasmGcModule
): EmbeddedMoonBitWasmGcModule {
	return module;
}

export async function loadEmbeddedMoonBitWasmGcModule<TExports = WebAssembly.Exports>(
	module: EmbeddedMoonBitWasmGcModule,
	options: LoadEmbeddedMoonBitWasmGcModuleOptions
): Promise<TExports> {
	assertEmbeddedMoonBitWasmGcModule(module);
	const webAssemblyApi = getWebAssemblyWithJspi();
	const compiledModule = new webAssemblyApi.Module(
		toArrayBuffer(decodeBase64(module.wasmBase64)),
		getWasmGcCompileOptions()
	);
	const instance = await instantiateWasmGcModule(compiledModule, wrapSuspendingImports(options.imports));
	const exportsObject = wrapPromisingExports(
		instance.exports,
		module.asyncExportNames ?? [],
		webAssemblyApi
	);
	return exportsObject as TExports;
}

export function getWasmGcCompileOptions(): WasmGcCompileOptions {
	return {
		builtins: JS_STRING_BUILTINS,
		importedStringConstants: MOONBIT_IMPORTED_STRING_CONSTANTS
	};
}

export function wrapSuspendingImports(imports: WebAssembly.Imports): WebAssembly.Imports {
	const webAssemblyApi = getWebAssemblyWithJspi();
	const Suspending = webAssemblyApi.Suspending;

	if (!Suspending) {
		throw new Error("MoonBit wasm-gc requires WebAssembly.Suspending support for JSPI");
	}

	return wrapNestedFunctions(imports, (value) => new Suspending(value)) as WebAssembly.Imports;
}

export function wrapPromisingExports<TExports extends WebAssembly.Exports>(
	exportsObject: TExports,
	asyncExportNames: readonly string[],
	webAssemblyApi: WebAssemblyWithJspi = getWebAssemblyWithJspi()
): TExports {
	if (asyncExportNames.length === 0) {
		return exportsObject;
	}

	const promising = webAssemblyApi.promising;
	if (!promising) {
		throw new Error("MoonBit wasm-gc requires WebAssembly.promising support for JSPI");
	}

	const wrappedExports = {
		...exportsObject
	} as WasmGcExportsWithPromising;

	for (const exportName of asyncExportNames) {
		const exportValue = wrappedExports[exportName];
		if (typeof exportValue !== "function") {
			throw new Error(`Expected async wasm-gc export "${exportName}" to be a function`);
		}
		wrappedExports[exportName] = promising(exportValue as (...args: unknown[]) => unknown);
	}

	return wrappedExports as TExports;
}

function assertEmbeddedMoonBitWasmGcModule(module: EmbeddedMoonBitWasmGcModule): void {
	if (module.kind !== "embedded-moonbit-wasm-gc-module") {
		throw new Error("Expected an embedded MoonBit wasm-gc module artifact");
	}
}

function getWebAssemblyWithJspi(): WebAssemblyWithJspi {
	const webAssemblyApi = WebAssembly as WebAssemblyWithJspi;
	if (typeof webAssemblyApi.Module !== "function" || typeof webAssemblyApi.instantiate !== "function") {
		throw new Error("WebAssembly runtime support is unavailable");
	}

	return webAssemblyApi;
}

async function instantiateWasmGcModule(
	module: WebAssembly.Module,
	imports: WebAssembly.Imports
): Promise<WasmGcInstance> {
	const instantiated = await WebAssembly.instantiate(module, imports);
	if ("instance" in instantiated) {
		return instantiated;
	}

	return {
		exports: instantiated.exports
	};
}

function wrapNestedFunctions(
	value: unknown,
	wrapFunction: (value: (...args: unknown[]) => unknown) => unknown
): unknown {
	if (typeof value === "function") {
		return wrapFunction(value as (...args: unknown[]) => unknown);
	}

	if (!value || typeof value !== "object") {
		return value;
	}

	const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
		key,
		wrapNestedFunctions(entryValue, wrapFunction)
	]);

	return Object.fromEntries(entries);
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
