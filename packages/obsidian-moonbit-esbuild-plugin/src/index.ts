import type { Plugin as EsbuildPlugin } from "esbuild";
import type { EmbeddedMoonBitWasmGcModule, EmbeddedMoonBitWasmModule } from "@obsidian-moonbit/obsidian-moonbit";
import { findMoonProjectRoot, pickBuiltWasmPath, resolveBuiltWasmDirectory } from "./shared";
import {
	moonBitWasmEsbuildPlugin,
	renderEmbeddedMoonBitWasmModule,
	type MoonBitWasmEsbuildPluginOptions
} from "./wasm";
import {
	moonBitWasmGcEsbuildPlugin,
	renderEmbeddedMoonBitWasmGcModule,
	type MoonBitWasmGcEsbuildPluginOptions
} from "./wasm-gc";

export type MoonBitEsbuildPluginOptions = {
	readonly buildMode?: "debug" | "release";
	readonly target?: "wasm" | "wasm-gc";
	readonly include?: (entryPath: string) => boolean;
	readonly moonBinary?: string;
	readonly moonBuildArgs?: readonly string[];
	readonly targetDir?: string;
};

export function moonBitEsbuildPlugin(
	options: MoonBitEsbuildPluginOptions = {}
): EsbuildPlugin {
	if (options.target === "wasm-gc") {
		const wasmGcOptions: MoonBitWasmGcEsbuildPluginOptions = {
			buildMode: options.buildMode,
			include: options.include,
			moonBinary: options.moonBinary,
			moonBuildArgs: options.moonBuildArgs,
			targetDir: options.targetDir
		};
		return moonBitWasmGcEsbuildPlugin(wasmGcOptions);
	}

	const wasmOptions: MoonBitWasmEsbuildPluginOptions = {
		buildMode: options.buildMode,
		include: options.include,
		moonBinary: options.moonBinary,
		moonBuildArgs: options.moonBuildArgs,
		targetDir: options.targetDir
	};
	return moonBitWasmEsbuildPlugin(wasmOptions);
}

export {
	findMoonProjectRoot,
	moonBitWasmEsbuildPlugin,
	moonBitWasmGcEsbuildPlugin,
	pickBuiltWasmPath,
	resolveBuiltWasmDirectory,
	renderEmbeddedMoonBitWasmGcModule,
	renderEmbeddedMoonBitWasmModule
};

export type {
	EmbeddedMoonBitWasmGcModule,
	EmbeddedMoonBitWasmModule,
	MoonBitWasmEsbuildPluginOptions,
	MoonBitWasmGcEsbuildPluginOptions
};
