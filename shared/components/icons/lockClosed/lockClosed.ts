import { html, TemplateResult } from "lit-html";

export const LockClosed = LockClosedSize();

export function LockClosedSize(width: number, height: number): TemplateResult;
export function LockClosedSize(size: number): TemplateResult;
export function LockClosedSize(): TemplateResult;
export function LockClosedSize(width: number = 24, height: number = width) {
	return html`
		<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24">
		<path d="M0 0h24v24H0z" fill="none"/>
			<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
		</svg>`
}

export const LockClosedUnfilled = LockClosedUnfilledSize();

export function LockClosedUnfilledSize(width: number, height: number): TemplateResult;
export function LockClosedUnfilledSize(size: number): TemplateResult;
export function LockClosedUnfilledSize(): TemplateResult;
export function LockClosedUnfilledSize(width: number = 24, height: number = width) {
	return html`
		<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="${width}" height="${height}" viewBox="0 0 24 24"  xml:space="preserve">
			<g id="Bounding_Boxes">
				<g id="ui_x5F_spec_x5F_header_copy_3" display="none">
				</g>
				<path fill="none" d="M0,0h24v24H0V0z"/>
				<path opacity="0.87" fill="none" d="M0,0h24v24H0V0z"/>
			</g>
			<g id="Rounded" display="none">
				<g id="ui_x5F_spec_x5F_header_copy_5">
				</g>
				<path display="inline" d="M18,8h-1V6c0-2.76-2.24-5-5-5S7,3.24,7,6v2H6c-1.1,0-2,0.9-2,2v10c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V10   C20,8.9,19.1,8,18,8z M12,17c-1.1,0-2-0.9-2-2c0-1.1,0.9-2,2-2c1.1,0,2,0.9,2,2C14,16.1,13.1,17,12,17z M9,8V6c0-1.66,1.34-3,3-3   s3,1.34,3,3v2H9z"/>
			</g>
			<g id="Sharp" display="none">
				<g id="ui_x5F_spec_x5F_header_copy_4">
				</g>
				<path display="inline" d="M20,8h-3l0-1.79c0-2.61-1.91-4.94-4.51-5.19C9.51,0.74,7,3.08,7,6v2H4v14h16V8z M12,17c-1.1,0-2-0.9-2-2   c0-1.1,0.9-2,2-2c1.1,0,2,0.9,2,2C14,16.1,13.1,17,12,17z M9,8V6c0-1.66,1.34-3,3-3s3,1.34,3,3v2H9z"/>
			</g>
			<g id="Outline">
				<g id="ui_x5F_spec_x5F_header" display="none">
				</g>
				<path d="M18,8h-1V6c0-2.76-2.24-5-5-5S7,3.24,7,6v2H6c-1.1,0-2,0.9-2,2v10c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V10   C20,8.9,19.1,8,18,8z M9,6c0-1.66,1.34-3,3-3s3,1.34,3,3v2H9V6z M18,20H6V10h12V20z M12,17c1.1,0,2-0.9,2-2c0-1.1-0.9-2-2-2   c-1.1,0-2,0.9-2,2C10,16.1,10.9,17,12,17z"/>
			</g>
			<g id="Duotone" display="none">
				<g id="ui_x5F_spec_x5F_header_copy_2">
				</g>
				<g display="inline">
					<path opacity="0.3" d="M6,20h12V10H6V20z M12,13c1.1,0,2,0.9,2,2c0,1.1-0.9,2-2,2c-1.1,0-2-0.9-2-2C10,13.9,10.9,13,12,13z"/>
					<path d="M18,8h-1V6c0-2.76-2.24-5-5-5S7,3.24,7,6v2H6c-1.1,0-2,0.9-2,2v10c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V10    C20,8.9,19.1,8,18,8z M9,6c0-1.66,1.34-3,3-3s3,1.34,3,3v2H9V6z M18,20H6V10h12V20z M12,17c1.1,0,2-0.9,2-2c0-1.1-0.9-2-2-2    c-1.1,0-2,0.9-2,2C10,16.1,10.9,17,12,17z"/>
				</g>
			</g>
			<g id="Material" display="none">
				<g id="ui_x5F_spec_x5F_header_copy">
				</g>
				<path display="inline" d="M18,8h-1V6c0-2.76-2.24-5-5-5S7,3.24,7,6v2H6c-1.1,0-2,0.9-2,2v10c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V10   C20,8.9,19.1,8,18,8z M12,17c-1.1,0-2-0.9-2-2c0-1.1,0.9-2,2-2c1.1,0,2,0.9,2,2C14,16.1,13.1,17,12,17z M9,8V6c0-1.66,1.34-3,3-3   s3,1.34,3,3v2H9z"/>
			</g>
		</svg>`
}