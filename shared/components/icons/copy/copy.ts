import { html, TemplateResult } from 'lit-html';

export const Copy = CopySize();

export function CopySize(width: number, height: number): TemplateResult;
export function CopySize(size: number): TemplateResult;
export function CopySize(): TemplateResult;
export function CopySize(width: number = 24, height: number = width) {
	return html`
		<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24">
			<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path>
		</svg>`;
}