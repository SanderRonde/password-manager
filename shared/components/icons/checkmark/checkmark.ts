import { html, TemplateResult } from "lit-html";

export const Checkmark = CheckmarkSize();

export function CheckmarkSize(width: number, height: number): TemplateResult;
export function CheckmarkSize(size: number): TemplateResult;
export function CheckmarkSize(): TemplateResult;
export function CheckmarkSize(width: number = 24, height: number = width) {
    return html`
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24">
            <path fill="none" d="M0 0h24v24H0z"/>
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
        </svg>`
}