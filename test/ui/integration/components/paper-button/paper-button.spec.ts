/// <reference types="Cypress" />

import { iterateThemes, toRGB, getContrast, listenForEvent, getOriginalElement, onMounted } from '../../../lib/ui-test-util';
import { PaperButton } from '../../../../../shared/components/util/paper-button/paper-button';
import { DEFAULT_THEME } from '../../../../../shared/types/shared-types';
import { UI_TEST_PORT } from '../../../lib/ui-test-const';
const DEFAULT_THEME: DEFAULT_THEME = 'light';

global.Promise = Cypress.Promise;
context('Paper-Button', function() {
	this.timeout(5000);
	this.slow(5000);
	
	beforeEach(() => {
		cy.visit(`http://localhost:${UI_TEST_PORT}/paper-button.html`);
		onMounted('#main');
	});

	context('Theme', () => {
		it('text color matches theme', () => {
			iterateThemes('#main', (theme, root) => {
				return cy.window().then((win) => {
					return win.getComputedStyle(
						root.querySelector('.mdl-button')!
					).color;
				}).then((color) => {
					return cy.wrap({
						color: color
					}).should('have.property', 'color', 
						toRGB(theme.textOnNonbackground));
				})
			}, 500);
		});
		it('button color matches theme', () => {
			iterateThemes('#main', (theme, root) => {
				return cy.window().then((win) => {
					return win.getComputedStyle(
						root.querySelector('.mdl-button')!
					).backgroundColor;
				}).then((color) => {
					return cy.wrap({
						color: color
					}).should('have.property', 'color', 
						toRGB(theme.primary.main));
				})
			}, 500);
		});
		it('should have proper contrasts in all themes', () => {
			iterateThemes('#main', (_theme, root) => {
				return cy.window().then((win) => {
					return [win.getComputedStyle(
						root.querySelector('.mdl-button')!
					).color, win.getComputedStyle(
						root.querySelector('.mdl-button')!
					).backgroundColor];
				}).then(([color, backgroundColor]) => {
					const contrast = getContrast(color!, backgroundColor!);
					return expect(contrast, 'contrast is at least 4.5').to.be.above(4.5);
				})
			}, 500);
		});
	});

	context('Events', () => {
		it('should fire the click event when clicked', () => {
			getOriginalElement<PaperButton>('#main', (el) => {
				listenForEvent(el, 'click', () => {
					Cypress.$(el.$.button).click();
				});
			});
		});
	});
});