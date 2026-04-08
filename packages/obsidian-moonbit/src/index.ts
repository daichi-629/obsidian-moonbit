export {
	buildMoonBitWasmCachePath,
	createEmbeddedMoonBitWasmModule,
	loadEmbeddedMoonBitWasmModule,
	type EmbeddedMoonBitWasmModule,
	type LoadEmbeddedMoonBitWasmModuleOptions,
	type MoonBitCacheStore,
	type MoonBitImports
} from "./wasm";
export {
	createEmbeddedMoonBitWasmGcModule,
	getWasmGcCompileOptions,
	loadEmbeddedMoonBitWasmGcModule,
	type EmbeddedMoonBitWasmGcModule,
	type LoadEmbeddedMoonBitWasmGcModuleOptions
} from "./wasm-gc";

export {
	buildMoonBitWasmCachePath as buildMoonBitCachePath,
	createEmbeddedMoonBitWasmModule as createEmbeddedMoonBitModule,
	loadEmbeddedMoonBitWasmModule as loadEmbeddedMoonBitModule
} from "./wasm";

export type {
	EmbeddedMoonBitWasmModule as EmbeddedMoonBitModule,
	LoadEmbeddedMoonBitWasmModuleOptions as LoadEmbeddedMoonBitModuleOptions
} from "./wasm";
