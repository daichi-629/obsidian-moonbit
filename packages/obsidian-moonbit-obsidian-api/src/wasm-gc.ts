import type { Plugin } from "obsidian";
import {
	loadEmbeddedMoonBitWasmGcModule,
	type EmbeddedMoonBitWasmGcModule
} from "@obsidian-moonbit/obsidian-moonbit";

export async function loadMoonBitWasmGc<TExports>(
	_plugin: Plugin,
	module: EmbeddedMoonBitWasmGcModule
): Promise<TExports> {
	return await loadEmbeddedMoonBitWasmGcModule<TExports>(module);
}
