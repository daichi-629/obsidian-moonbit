import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, relative, resolve } from "node:path";

const buildPromises = new Map<string, Promise<void>>();
const projectBuildQueues = new Map<string, Promise<void>>();

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
	const wasmFilePaths = collectWasmFiles(buildDirectory);
	const expectedBaseName = `${basename(sourceFilePath, extname(sourceFilePath))}.wasm`;
	const wasmFileNames = wasmFilePaths.map((path) => basename(path)).sort();

	if (wasmFileNames.length === 0) {
		throw new Error(`No built wasm files found in ${buildDirectory}`);
	}

	const exactMatch = wasmFileNames.find((entry) => entry === expectedBaseName);
	if (exactMatch) {
		return wasmFilePaths.find((path) => basename(path) === exactMatch) ?? resolve(buildDirectory, exactMatch);
	}

	if (wasmFileNames.length === 1) {
		return wasmFilePaths[0];
	}

	const newestMatch = wasmFilePaths
		.map((path) => ({
			path,
			mtimeMs: statSync(path).mtimeMs
		}))
		.sort((left, right) => right.mtimeMs - left.mtimeMs)[0];

	return newestMatch.path;
}

export function resolveBuiltWasmDirectory(
	buildDirectory: string,
	moonProjectRoot: string,
	sourceFilePath: string
): string {
	const preferredDirectory = resolve(buildDirectory, dirname(relative(moonProjectRoot, sourceFilePath)));
	return existsSync(preferredDirectory) ? preferredDirectory : buildDirectory;
}

export function resolveMoonSourcePath(path: string, resolveDir: string): string {
	return isAbsolute(path) ? path : resolve(resolveDir || process.cwd(), path);
}

export function runMoonBuild(
	moonBinary: string,
	moonBuildArgs: readonly string[],
	moonProjectRoot: string
): Promise<void> {
	const buildKey = `${moonProjectRoot}:${moonBinary}:${moonBuildArgs.join("\u0000")}`;
	const existingBuild = buildPromises.get(buildKey);
	if (existingBuild) {
		return existingBuild;
	}

	const queuedBuild = (projectBuildQueues.get(moonProjectRoot) ?? Promise.resolve()).then(() => {
		execFileSync(moonBinary, [...moonBuildArgs], {
			cwd: moonProjectRoot,
			stdio: "inherit"
		});
	});

	buildPromises.set(buildKey, queuedBuild);
	projectBuildQueues.set(
		moonProjectRoot,
		queuedBuild.catch(() => undefined)
	);

	return queuedBuild.finally(() => {
		buildPromises.delete(buildKey);
		if (projectBuildQueues.get(moonProjectRoot) === queuedBuild) {
			projectBuildQueues.delete(moonProjectRoot);
		}
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

function collectWasmFiles(buildDirectory: string): string[] {
	const entries = readdirSync(buildDirectory, { withFileTypes: true });
	const wasmFiles: string[] = [];

	for (const entry of entries) {
		const entryPath = resolve(buildDirectory, entry.name);
		if (entry.isDirectory()) {
			wasmFiles.push(...collectWasmFiles(entryPath));
			continue;
		}

		if (entry.isFile() && entry.name.endsWith(".wasm")) {
			wasmFiles.push(entryPath);
		}
	}

	return wasmFiles.sort();
}
