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

export const HollowTriangleArrow = HollowTriangleArrowSize();

function pythagoras(crossSection: number) {
	return Math.round(Math.sqrt(Math.pow(crossSection, 2) / 2));
}

export function HollowTriangleArrowSize(width: number, height: number): TemplateResult;
export function HollowTriangleArrowSize(size: number): TemplateResult;
export function HollowTriangleArrowSize(): TemplateResult;
export function HollowTriangleArrowSize(width: number = 24, height: number = width) { 
	const actualWidth = pythagoras(width);
	const actualHeight = pythagoras(height);
	const widthPart = actualWidth / 4;
	const heightPart = actualHeight / 4;
	return html`
		<style>
			.__hollow_arrow {
				border-right: ${widthPart}px solid black;
				border-bottom: ${heightPart}px solid black;
				width: ${widthPart * 3}px;
				height: ${heightPart * 3}px;
				transform: rotate(-45deg);
			}
		</style>
		<div class="__hollow_arrow"></div>
	`
}