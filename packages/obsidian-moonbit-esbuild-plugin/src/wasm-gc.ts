import { execFileSync } from "node:child_process";
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
	readonly include?: (entryPath: string) => boolean;
	readonly moonBinary?: string;
	readonly moonBuildArgs?: readonly string[];
	readonly targetDir?: string;
};

export function moonBitWasmGcEsbuildPlugin(
	options: MoonBitWasmGcEsbuildPluginOptions = {}
): EsbuildPlugin {
	const include = options.include ?? (() => true);
	const moonBinary = options.moonBinary ?? "moon";
	const moonBuildArgs = options.moonBuildArgs ?? ["build", "--target", "wasm-gc", "--nostd"];
	const targetDir = options.targetDir ?? join("target", "wasm-gc", "release", "build");

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
				(args: OnLoadArgs) => {
					const moonProjectRoot = findMoonProjectRoot(args.path);
					runMoonBuild(moonBinary, moonBuildArgs, moonProjectRoot);

					const buildRoot = resolveBuiltWasmDirectory(
						resolve(moonProjectRoot, targetDir),
						moonProjectRoot,
						args.path
					);
					const builtWasmPath = pickBuiltWasmPath(buildRoot, args.path);
					const suggestedFileName = `${basename(args.path, extname(args.path))}.wasm`;
					const wasmArtifact = readWasmArtifact(builtWasmPath);
					const asyncExportNames = readAsyncExportNames(
						resolve(dirname(builtWasmPath), `${basename(builtWasmPath, ".wasm")}.mi`)
					);

					return {
						contents: renderEmbeddedMoonBitWasmGcModule({
							...wasmArtifact,
							asyncExportNames,
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
	readonly asyncExportNames: readonly string[];
}): string {
	return `const embeddedMoonBitWasmGcModule = Object.freeze({
  kind: "embedded-moonbit-wasm-gc-module",
  entryPath: ${JSON.stringify(module.entryPath)},
  wasmBase64: ${JSON.stringify(module.wasmBase64)},
  wasmHash: ${JSON.stringify(module.wasmHash)},
  suggestedFileName: ${JSON.stringify(module.suggestedFileName)},
  asyncExportNames: Object.freeze(${JSON.stringify([...module.asyncExportNames])})
});

export default embeddedMoonBitWasmGcModule;
`;
}

export function readAsyncExportNames(interfacePath: string): readonly string[] {
	const moonInfoOutput = execFileSync("mooninfo", ["-format", "text", interfacePath, "-o", "-"], {
		encoding: "utf8"
	});

	return parseAsyncExportNamesFromMoonInfoText(moonInfoOutput);
}

export function parseAsyncExportNamesFromMoonInfoText(moonInfoOutput: string): readonly string[] {
	return moonInfoOutput
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("pub async fn "))
		.map((line) => line.slice("pub async fn ".length).split("(")[0]);
}

function normalizeEntryPath(entryPath: string): string {
	return entryPath.replace(/\\/g, "/");
}
