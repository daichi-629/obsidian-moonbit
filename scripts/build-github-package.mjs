import esbuild from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const distRoot = resolve(repoRoot, "dist");

mkdirSync(distRoot, { recursive: true });

await buildRuntimeBundle();
await buildObsidianApiBundle();
await buildEsbuildPluginBundle();
writeTypeDeclarations();

async function buildRuntimeBundle() {
	await esbuild.build({
		entryPoints: [resolve(repoRoot, "packages/obsidian-moonbit/src/index.ts")],
		outfile: resolve(distRoot, "runtime.js"),
		bundle: true,
		format: "esm",
		platform: "browser",
		target: "es2020"
	});
}

async function buildObsidianApiBundle() {
	await esbuild.build({
		entryPoints: [resolve(repoRoot, "packages/obsidian-moonbit-obsidian-api/src/index.ts")],
		outfile: resolve(distRoot, "obsidian-api.js"),
		bundle: true,
		format: "esm",
		platform: "browser",
		target: "es2020",
		external: ["obsidian"],
		alias: {
			"@obsidian-moonbit/obsidian-moonbit": resolve(
				repoRoot,
				"packages/obsidian-moonbit/src/index.ts"
			)
		}
	});
}

async function buildEsbuildPluginBundle() {
	await esbuild.build({
		entryPoints: [resolve(repoRoot, "packages/obsidian-moonbit-esbuild-plugin/src/index.ts")],
		outfile: resolve(distRoot, "esbuild-plugin.js"),
		bundle: true,
		format: "esm",
		platform: "node",
		target: "node18",
		external: ["esbuild"]
	});
}

function writeTypeDeclarations() {
	writeDeclaration(
		"runtime.d.ts",
		`export type MoonBitImports =
	| WebAssembly.Imports
	| (() => WebAssembly.Imports | Promise<WebAssembly.Imports>);

export type EmbeddedMoonBitWasmModule = {
	readonly kind: "embedded-moonbit-wasm-module";
	readonly wasmBase64: string;
	readonly wasmHash: string;
	readonly suggestedFileName: string;
	readonly imports?: MoonBitImports;
};

export type EmbeddedMoonBitWasmGcModule = {
	readonly kind: "embedded-moonbit-wasm-gc-module";
	readonly entryPath: string;
	readonly suggestedFileName: string;
	readonly wasmBase64: string;
	readonly asyncExportNames?: readonly string[];
};

export type MoonBitCacheStore = {
	readBinary(path: string): Promise<Uint8Array | null>;
	writeBinary(path: string, binary: Uint8Array): Promise<void>;
};

export type LoadEmbeddedMoonBitWasmModuleOptions = {
	readonly cacheRoot: string;
	readonly cacheStore: MoonBitCacheStore;
};

export type LoadEmbeddedMoonBitWasmGcModuleOptions = {
	readonly imports: WebAssembly.Imports;
};

export declare function createEmbeddedMoonBitWasmModule(
	module: EmbeddedMoonBitWasmModule
): EmbeddedMoonBitWasmModule;

export declare function createEmbeddedMoonBitWasmGcModule(
	module: EmbeddedMoonBitWasmGcModule
): EmbeddedMoonBitWasmGcModule;

export declare function loadEmbeddedMoonBitWasmModule<
	TExports extends WebAssembly.Exports = WebAssembly.Exports
>(
	module: EmbeddedMoonBitWasmModule,
	options: LoadEmbeddedMoonBitWasmModuleOptions
): Promise<TExports>;

export declare function loadEmbeddedMoonBitWasmGcModule<TExports = WebAssembly.Exports>(
	module: EmbeddedMoonBitWasmGcModule,
	options: LoadEmbeddedMoonBitWasmGcModuleOptions
): Promise<TExports>;

export declare function buildMoonBitWasmCachePath(
	cacheRoot: string,
	module: Pick<EmbeddedMoonBitWasmModule, "suggestedFileName" | "wasmHash">
): string;

export declare function getWasmGcCompileOptions(): {
	readonly builtins: readonly string[];
	readonly importedStringConstants: string;
};

export declare function wrapSuspendingImports(imports: WebAssembly.Imports): WebAssembly.Imports;

export declare function wrapPromisingExports<TExports extends WebAssembly.Exports>(
	exportsObject: TExports,
	asyncExportNames: readonly string[]
): TExports;

export {
	buildMoonBitWasmCachePath as buildMoonBitCachePath,
	createEmbeddedMoonBitWasmModule as createEmbeddedMoonBitModule,
	loadEmbeddedMoonBitWasmModule as loadEmbeddedMoonBitModule
};

export type {
	EmbeddedMoonBitWasmModule as EmbeddedMoonBitModule,
	LoadEmbeddedMoonBitWasmModuleOptions as LoadEmbeddedMoonBitModuleOptions
};
`
	);

	writeDeclaration(
		"obsidian-api.d.ts",
		`import type { Plugin } from "obsidian";
import type { EmbeddedMoonBitWasmGcModule, EmbeddedMoonBitWasmModule } from "./runtime";

export declare function loadMoonBitWasm<
	TExports extends WebAssembly.Exports = WebAssembly.Exports
>(plugin: Plugin, module: EmbeddedMoonBitWasmModule): Promise<TExports>;

export declare function loadMoonBit<
	TExports extends WebAssembly.Exports = WebAssembly.Exports
>(plugin: Plugin, module: EmbeddedMoonBitWasmModule): Promise<TExports>;

export declare function loadMoonBitWasmGc<TExports>(
	plugin: Plugin,
	module: EmbeddedMoonBitWasmGcModule
): Promise<TExports>;
`
	);

	writeDeclaration(
		"esbuild-plugin.d.ts",
		`import type { Plugin as EsbuildPlugin } from "esbuild";
import type { EmbeddedMoonBitWasmGcModule, EmbeddedMoonBitWasmModule } from "./runtime";

export type MoonBitEsbuildPluginOptions = {
	readonly target?: "wasm" | "wasm-gc";
	readonly include?: (entryPath: string) => boolean;
	readonly moonBinary?: string;
	readonly moonBuildArgs?: readonly string[];
	readonly targetDir?: string;
};

export declare function moonBitEsbuildPlugin(
	options?: MoonBitEsbuildPluginOptions
): EsbuildPlugin;

declare module "*.mbt" {
	const embeddedMoonBitModule: EmbeddedMoonBitWasmModule | EmbeddedMoonBitWasmGcModule;
	export default embeddedMoonBitModule;
}
`
	);
}

function writeDeclaration(fileName, contents) {
	const outputPath = resolve(distRoot, fileName);
	mkdirSync(dirname(outputPath), { recursive: true });
	writeFileSync(outputPath, contents);
}
