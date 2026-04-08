import { basename, dirname, extname, join, relative, resolve } from "node:path";
import type { Plugin as EsbuildPlugin, OnLoadArgs, OnResolveArgs } from "esbuild";
import {
	findMoonProjectRoot,
	pickBuiltWasmPath,
	readWasmArtifact,
	resolveBuiltWasmDirectory,
	resolveMoonSourcePath,
	runMoonBuild
} from "./shared";

export type MoonBitWasmGcEsbuildPluginOptions = {
	readonly buildMode?: "debug" | "release";
	readonly include?: (entryPath: string) => boolean;
	readonly moonBinary?: string;
	readonly moonBuildArgs?: readonly string[];
	readonly targetDir?: string;
};

export function moonBitWasmGcEsbuildPlugin(
	options: MoonBitWasmGcEsbuildPluginOptions = {}
): EsbuildPlugin {
	const buildMode = options.buildMode ?? "release";
	const include = options.include ?? (() => true);
	const moonBinary = options.moonBinary ?? "moon";
	const moonBuildArgs = options.moonBuildArgs ?? defaultMoonBuildArgs(buildMode);
	const targetDir = options.targetDir ?? defaultTargetDir(buildMode);

	return {
		name: "moonbit-esbuild-plugin-wasm-gc",
		setup(build) {
			build.onResolve({ filter: /\.mbt$/ }, (args: OnResolveArgs) => {
				const resolvedPath = resolveMoonSourcePath(args.path, args.resolveDir);
				if (!include(resolvedPath)) {
					return null;
				}

				return {
					namespace: "moonbit-mbt-wasm-gc",
					path: resolvedPath
				};
			});

			build.onLoad(
				{ filter: /\.mbt$/, namespace: "moonbit-mbt-wasm-gc" },
				async (args: OnLoadArgs) => {
					const moonProjectRoot = findMoonProjectRoot(args.path);
					await runMoonBuild(moonBinary, moonBuildArgs, moonProjectRoot);

					const buildRoot = resolveBuiltWasmDirectory(
						resolve(moonProjectRoot, targetDir),
						moonProjectRoot,
						args.path
					);
					const builtWasmPath = pickBuiltWasmPath(buildRoot, args.path);
					const suggestedFileName = `${basename(args.path, extname(args.path))}.wasm`;
					const wasmArtifact = readWasmArtifact(builtWasmPath);

					return {
						contents: renderEmbeddedMoonBitWasmGcModule({
							...wasmArtifact,
							entryPath: normalizeEntryPath(relative(moonProjectRoot, args.path)),
							suggestedFileName
						}),
						loader: "js",
						resolveDir: dirname(args.path)
					};
				}
			);
		}
	};
}

export function renderEmbeddedMoonBitWasmGcModule(module: {
	readonly entryPath: string;
	readonly wasmBase64: string;
	readonly wasmHash: string;
	readonly suggestedFileName: string;
}): string {
	return `const embeddedMoonBitWasmGcModule = Object.freeze({
  kind: "embedded-moonbit-wasm-gc-module",
  entryPath: ${JSON.stringify(module.entryPath)},
  wasmBase64: ${JSON.stringify(module.wasmBase64)},
  wasmHash: ${JSON.stringify(module.wasmHash)},
  suggestedFileName: ${JSON.stringify(module.suggestedFileName)}
});

export default embeddedMoonBitWasmGcModule;
`;
}

function normalizeEntryPath(entryPath: string): string {
	return entryPath.replace(/\\/g, "/");
}

function defaultMoonBuildArgs(buildMode: "debug" | "release"): readonly string[] {
	if (buildMode === "debug") {
		return ["build", "--target", "wasm-gc", "--nostd"];
	}

	return ["build", "--release", "--target-dir", "target", "--target", "wasm-gc", "--nostd"];
}

function defaultTargetDir(buildMode: "debug" | "release"): string {
	if (buildMode === "debug") {
		return join("_build", "wasm-gc", "debug", "build");
	}

	return join("target", "wasm-gc", "release", "build");
}
