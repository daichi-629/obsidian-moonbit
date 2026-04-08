declare module "*.mbt" {
	const embeddedMoonBitModule:
		| import("@obsidian-moonbit/obsidian-moonbit").EmbeddedMoonBitWasmModule
		| import("@obsidian-moonbit/obsidian-moonbit").EmbeddedMoonBitWasmGcModule;
	export default embeddedMoonBitModule;
}
