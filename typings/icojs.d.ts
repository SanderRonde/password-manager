declare module "icojs" {
	interface ParsedImage {
		width: number;
		height: number;
		bpp: number;
		buffer: ArrayBuffer|Buffer;
	}

	export function isICO(source: ArrayBuffer|Buffer): boolean;
	export function parse(buffer: ArrayBuffer|Buffer, mime?: string): Promise<Array<ParsedImage>>;
	export function parseSync(buffer: ArrayBuffer|Buffer, mime?: string): Array<ParsedImage>;
}