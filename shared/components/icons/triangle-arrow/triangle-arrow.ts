import { html, TemplateResult } from 'lit-html';

export const TriangleArrow = TriangleArrowSize();

export function TriangleArrowSize(width: number, height: number): TemplateResult;
export function TriangleArrowSize(size: number): TemplateResult;
export function TriangleArrowSize(): TemplateResult;
export function TriangleArrowSize(width: number = 24, height: number = width) {
	return html`
		<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewbox="0 0 48 48">
			<path d="M16 10v28l22-14z"/>
		</svg>
	`
}