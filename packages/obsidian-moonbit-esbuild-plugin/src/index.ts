import type { Plugin as EsbuildPlugin } from "esbuild";
import type { EmbeddedMoonBitWasmGcModule, EmbeddedMoonBitWasmModule } from "@obsidian-moonbit/obsidian-moonbit";
import {
	findMoonProjectRoot,
	pickBuiltWasmPath
} from "./shared";
import {
	moonBitWasmEsbuildPlugin,
	renderEmbeddedMoonBitWasmModule,
	type MoonBitWasmEsbuildPluginOptions
} from "./wasm";
import {
	moonBitWasmGcEsbuildPlugin,
	parseAsyncExportNamesFromMoonInfoText,
	readAsyncExportNames,
	renderEmbeddedMoonBitWasmGcModule,
	type MoonBitWasmGcEsbuildPluginOptions
} from "./wasm-gc";

export type MoonBitEsbuildPluginOptions = {
	readonly target?: "wasm" | "wasm-gc";
	readonly moonBinary?: string;
	readonly moonBuildArgs?: readonly string[];
	readonly targetDir?: string;
};

export function moonBitEsbuildPlugin(
	options: MoonBitEsbuildPluginOptions = {}
): EsbuildPlugin {
	if (options.target === "wasm-gc") {
		const wasmGcOptions: MoonBitWasmGcEsbuildPluginOptions = {
			moonBinary: options.moonBinary,
			moonBuildArgs: options.moonBuildArgs,
			targetDir: options.targetDir
		};
		return moonBitWasmGcEsbuildPlugin(wasmGcOptions);
	}

	const wasmOptions: MoonBitWasmEsbuildPluginOptions = {
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
	parseAsyncExportNamesFromMoonInfoText,
	pickBuiltWasmPath,
	readAsyncExportNames,
	renderEmbeddedMoonBitWasmGcModule,
	renderEmbeddedMoonBitWasmModule
};

export type {
	EmbeddedMoonBitWasmGcModule,
	EmbeddedMoonBitWasmModule,
	MoonBitWasmEsbuildPluginOptions,
	MoonBitWasmGcEsbuildPluginOptions
};
