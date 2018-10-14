import { html, TemplateResult } from 'lit-html';

export const Delete = DeleteSize();

export function DeleteSize(width: number, height: number): TemplateResult;
export function DeleteSize(size: number): TemplateResult;
export function DeleteSize(): TemplateResult;
export function DeleteSize(width: number = 24, height: number = width) {
	return html`
		<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24">
			<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
			<path d="M0 0h24v24H0z" fill="none"/>
		</svg>`;
}