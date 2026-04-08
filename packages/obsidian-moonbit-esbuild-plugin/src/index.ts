import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import type { Plugin as EsbuildPlugin, OnLoadArgs, OnResolveArgs } from "esbuild";

export type MoonBitEsbuildPluginOptions = {
	readonly moonBinary?: string;
	readonly moonBuildArgs?: readonly string[];
	readonly targetDir?: string;
};

export function moonBitEsbuildPlugin(
	options: MoonBitEsbuildPluginOptions = {}
): EsbuildPlugin {
	const moonBinary = options.moonBinary ?? "moon";
	const moonBuildArgs = options.moonBuildArgs ?? ["build", "--target", "wasm", "--nostd"];
	const targetDir = options.targetDir ?? join("target", "wasm", "release", "build");

	return {
		name: "moonbit-esbuild-plugin",
		setup(build) {
			build.onResolve({ filter: /\.mbt$/u }, (args: OnResolveArgs) => {
				const resolvedPath = isAbsolute(args.path)
					? args.path
					: resolve(args.resolveDir || process.cwd(), args.path);

				return {
					namespace: "moonbit-mbt",
					path: resolvedPath
				};
			});

			build.onLoad(
				{ filter: /\.mbt$/u, namespace: "moonbit-mbt" },
				(args: OnLoadArgs) => {
					const moonProjectRoot = findMoonProjectRoot(args.path);
					runMoonBuild(moonBinary, moonBuildArgs, moonProjectRoot);

					const builtWasmPath = pickBuiltWasmPath(resolve(moonProjectRoot, targetDir), args.path);
					const wasmBytes = readFileSync(builtWasmPath);
					const wasmHash = createHash("sha256").update(wasmBytes).digest("hex");
					const suggestedFileName = `${basename(args.path, extname(args.path))}.wasm`;

					return {
						contents: renderEmbeddedMoonBitModule({
							wasmBase64: wasmBytes.toString("base64"),
							wasmHash,
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

export function findMoonProjectRoot(entryFilePath: string): string {
	let currentDirectory = dirname(resolve(entryFilePath));

	while (true) {
		if (existsSync(join(currentDirectory, "moon.mod.json"))) {
			return currentDirectory;
		}

		const parentDirectory = dirname(currentDirectory);
		if (parentDirectory === currentDirectory) {
			throw new Error(`Could not find moon.mod.json for ${entryFilePath}`);
		}
		currentDirectory = parentDirectory;
	}
}

export function pickBuiltWasmPath(buildDirectory: string, sourceFilePath: string): string {
	const expectedBaseName = `${basename(sourceFilePath, extname(sourceFilePath))}.wasm`;
	const wasmFileNames = readdirSync(buildDirectory)
		.filter((entry) => entry.endsWith(".wasm"))
		.sort();

	if (wasmFileNames.length === 0) {
		throw new Error(`No built wasm files found in ${buildDirectory}`);
	}

	const exactMatch = wasmFileNames.find((entry) => entry === expectedBaseName);
	if (exactMatch) {
		return resolve(buildDirectory, exactMatch);
	}

	if (wasmFileNames.length === 1) {
		return resolve(buildDirectory, wasmFileNames[0]);
	}

	const newestMatch = wasmFileNames
		.map((entry) => ({
			entry,
			mtimeMs: statSync(resolve(buildDirectory, entry)).mtimeMs
		}))
		.sort((left, right) => right.mtimeMs - left.mtimeMs)[0];

	return resolve(buildDirectory, newestMatch.entry);
}

export function renderEmbeddedMoonBitModule(module: {
	readonly wasmBase64: string;
	readonly wasmHash: string;
	readonly suggestedFileName: string;
}): string {
	return `const embeddedMoonBitModule = Object.freeze({
  kind: "embedded-moonbit-module",
  wasmBase64: ${JSON.stringify(module.wasmBase64)},
  wasmHash: ${JSON.stringify(module.wasmHash)},
  suggestedFileName: ${JSON.stringify(module.suggestedFileName)}
});

export default embeddedMoonBitModule;
`;
}

function runMoonBuild(
	moonBinary: string,
	moonBuildArgs: readonly string[],
	moonProjectRoot: string
): void {
	execFileSync(moonBinary, [...moonBuildArgs], {
		cwd: moonProjectRoot,
		stdio: "inherit"
	});
}
