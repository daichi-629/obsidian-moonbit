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

export declare function createEmbeddedMoonBitModule(
	module: EmbeddedMoonBitModule
): EmbeddedMoonBitModule;

export declare function loadEmbeddedMoonBitModule<
	TExports extends WebAssembly.Exports = WebAssembly.Exports
>(
	module: EmbeddedMoonBitModule,
	options: LoadEmbeddedMoonBitModuleOptions
): Promise<TExports>;

export declare function buildMoonBitCachePath(
	cacheRoot: string,
	module: Pick<EmbeddedMoonBitModule, "suggestedFileName" | "wasmHash">
): string;
`
	);

	writeDeclaration(
		"obsidian-api.d.ts",
		`import type { Plugin } from "obsidian";
import type { EmbeddedMoonBitModule } from "./runtime";

export declare function loadMoonBit<
	TExports extends WebAssembly.Exports = WebAssembly.Exports
>(plugin: Plugin, module: EmbeddedMoonBitModule): Promise<TExports>;
`
	);

	writeDeclaration(
		"esbuild-plugin.d.ts",
		`import type { Plugin as EsbuildPlugin } from "esbuild";

export type MoonBitEsbuildPluginOptions = {
	readonly moonBinary?: string;
	readonly moonBuildArgs?: readonly string[];
	readonly targetDir?: string;
};

export declare function moonBitEsbuildPlugin(
	options?: MoonBitEsbuildPluginOptions
): EsbuildPlugin;

declare module "*.mbt" {
	import type { EmbeddedMoonBitModule } from "./runtime";
	const embeddedMoonBitModule: EmbeddedMoonBitModule;
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
