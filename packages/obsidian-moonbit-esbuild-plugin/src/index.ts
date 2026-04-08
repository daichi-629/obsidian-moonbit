import type { Plugin as EsbuildPlugin } from "esbuild";
import type { EmbeddedMoonBitWasmModule } from "@obsidian-moonbit/obsidian-moonbit";
import { findMoonProjectRoot, pickBuiltWasmPath, resolveBuiltWasmDirectory } from "./shared";
import {
	moonBitWasmEsbuildPlugin,
	renderEmbeddedMoonBitWasmModule,
	type MoonBitWasmEsbuildPluginOptions
} from "./wasm";

export type MoonBitEsbuildPluginOptions = {
	readonly buildMode?: "debug" | "release";
	readonly include?: (entryPath: string) => boolean;
	readonly moonBinary?: string;
	readonly moonBuildArgs?: readonly string[];
	readonly targetDir?: string;
};

export function moonBitEsbuildPlugin(
	options: MoonBitEsbuildPluginOptions = {}
): EsbuildPlugin {
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
	pickBuiltWasmPath,
	resolveBuiltWasmDirectory,
	renderEmbeddedMoonBitWasmModule
};

export type { EmbeddedMoonBitWasmModule, MoonBitWasmEsbuildPluginOptions };
