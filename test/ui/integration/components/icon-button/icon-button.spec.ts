import { onMounted, iterateThemes, toRGB } from "../../../lib/ui-test-util";
import { UI_TEST_PORT } from "../../../lib/ui-test-const";

global.Promise = Cypress.Promise;
context('Icon-Button', () => {
	beforeEach(() => {
		cy.visit(`http://localhost:${UI_TEST_PORT}/icon-button.html`);
		onMounted('#filledNonText', '#filledText');
	});
	describe('Theme', () => {
		it('fill color matches theme', () => {
			iterateThemes('#filledNonText', (theme, _roor, themeName) => {
				return cy.get('#filledNonText').children().then((children) => {
					return cy.window().then((win) => {
						return win.getComputedStyle(
							children[0]		
						).fill;
					}).then((fill) => {
						cy.log(themeName);
						return cy.wrap({
							fill: fill
						}).should('have.property', 'fill',
							toRGB(theme.textOnNonbackground));
					});
				});
			});
			iterateThemes('#filledText', (theme, _roor, themeName) => {
				return cy.get('#filledText').children().then((children) => {
					return cy.window().then((win) => {
						return win.getComputedStyle(
							children[0]		
						).fill;
					}).then((fill) => {
						cy.log(themeName);
						return cy.wrap({
							fill: fill
						}).should('have.property', 'fill',
							toRGB(theme.textOnBackground));
					});
				});
			});
		});
	});
});