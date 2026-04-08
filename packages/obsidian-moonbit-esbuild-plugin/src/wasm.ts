import { basename, dirname, extname, join, resolve } from "node:path";
import type { Plugin as EsbuildPlugin, OnLoadArgs, OnResolveArgs } from "esbuild";
import {
	findMoonProjectRoot,
	pickBuiltWasmPath,
	readWasmArtifact,
	resolveBuiltWasmDirectory,
	resolveMoonSourcePath,
	runMoonBuild
} from "./shared";

export type MoonBitWasmEsbuildPluginOptions = {
	readonly buildMode?: "debug" | "release";
	readonly include?: (entryPath: string) => boolean;
	readonly moonBinary?: string;
	readonly moonBuildArgs?: readonly string[];
	readonly targetDir?: string;
};

export function moonBitWasmEsbuildPlugin(
	options: MoonBitWasmEsbuildPluginOptions = {}
): EsbuildPlugin {
	const buildMode = options.buildMode ?? "release";
	const include = options.include ?? (() => true);
	const moonBinary = options.moonBinary ?? "moon";
	const moonBuildArgs = options.moonBuildArgs ?? defaultMoonBuildArgs(buildMode);
	const targetDir = options.targetDir ?? defaultTargetDir(buildMode);

	return {
		name: "moonbit-esbuild-plugin-wasm",
		setup(build) {
			build.onResolve({ filter: /\.mbt$/ }, (args: OnResolveArgs) => {
				const resolvedPath = resolveMoonSourcePath(args.path, args.resolveDir);
				if (!include(resolvedPath)) {
					return null;
				}

				return {
					namespace: "moonbit-mbt-wasm",
					path: resolvedPath
				};
			});

			build.onLoad({ filter: /\.mbt$/, namespace: "moonbit-mbt-wasm" }, async (args: OnLoadArgs) => {
				const moonProjectRoot = findMoonProjectRoot(args.path);
				await runMoonBuild(moonBinary, moonBuildArgs, moonProjectRoot);

				const artifactDirectory = resolveBuiltWasmDirectory(
					resolve(moonProjectRoot, targetDir),
					moonProjectRoot,
					args.path
				);
				const builtWasmPath = pickBuiltWasmPath(artifactDirectory, args.path);
				const wasmArtifact = readWasmArtifact(builtWasmPath);
				const suggestedFileName = `${basename(args.path, extname(args.path))}.wasm`;

				return {
					contents: renderEmbeddedMoonBitWasmModule({
						...wasmArtifact,
						suggestedFileName
					}),
					loader: "js",
					resolveDir: dirname(args.path)
				};
			});
		}
	};
}

export function renderEmbeddedMoonBitWasmModule(module: {
	readonly wasmBase64: string;
	readonly wasmHash: string;
	readonly suggestedFileName: string;
}): string {
	return `const embeddedMoonBitModule = Object.freeze({
  kind: "embedded-moonbit-wasm-module",
  wasmBase64: ${JSON.stringify(module.wasmBase64)},
  wasmHash: ${JSON.stringify(module.wasmHash)},
  suggestedFileName: ${JSON.stringify(module.suggestedFileName)}
});

export default embeddedMoonBitModule;
`;
}

function defaultMoonBuildArgs(buildMode: "debug" | "release"): readonly string[] {
	if (buildMode === "debug") {
		return ["build", "--target", "wasm", "--nostd"];
	}

	return ["build", "--release", "--target-dir", "target", "--target", "wasm", "--nostd"];
}

function defaultTargetDir(buildMode: "debug" | "release"): string {
	if (buildMode === "debug") {
		return join("_build", "wasm", "debug", "build");
	}

	return join("target", "wasm", "release", "build");
}
