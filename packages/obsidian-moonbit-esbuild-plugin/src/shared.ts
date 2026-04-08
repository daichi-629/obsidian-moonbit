import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, resolve } from "node:path";

export function findMoonProjectRoot(entryFilePath: string): string {
	let currentDirectory = dirname(resolve(entryFilePath));

	while (true) {
		if (existsSync(resolve(currentDirectory, "moon.mod.json"))) {
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

export function resolveMoonSourcePath(path: string, resolveDir: string): string {
	return isAbsolute(path) ? path : resolve(resolveDir || process.cwd(), path);
}

export function runMoonBuild(
	moonBinary: string,
	moonBuildArgs: readonly string[],
	moonProjectRoot: string
): void {
	execFileSync(moonBinary, [...moonBuildArgs], {
		cwd: moonProjectRoot,
		stdio: "inherit"
	});
}

export function readWasmArtifact(wasmPath: string): {
	readonly wasmBase64: string;
	readonly wasmHash: string;
} {
	const wasmBytes = readFileSync(wasmPath);

	return {
		wasmBase64: wasmBytes.toString("base64"),
		wasmHash: createHash("sha256").update(wasmBytes).digest("hex")
	};
}
