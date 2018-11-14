import { MaterialInput } from "../../../../../shared/components/util/material-input/material-input";
import { onMounted, iterateThemes, toRGB, getInnerText } from "../../../lib/ui-test-util";
import { UI_TEST_PORT } from "../../../lib/ui-test-const";


global.Promise = Cypress.Promise;
context('Material-Input', () => {
	beforeEach(() => {
		cy.visit(`http://localhost:${UI_TEST_PORT}/material-input.html`);
		onMounted('#main','#withContent', '#withProps', '#password');
	});

	context('Theme', () => {
		it('text color matches theme', () => {
			iterateThemes('#main', (theme) => {
				return cy.get('#main').then((mainEl: JQuery<MaterialInput>) => {
					return cy.window().then((win) => {
						return win.getComputedStyle(
							mainEl.get(0).$.input
						).color;
					}).then((color) => {
						return cy.wrap({
							color
						}).should('have.property', 'color',
							toRGB(theme.text));
					});
				});
			});
		});
		it('underline color matches theme', () => {
			iterateThemes('#main', (theme) => {
				return cy.get('#main').then((mainEl: JQuery<MaterialInput>) => {
					return cy.window().then((win) => {
						return win.getComputedStyle(
							mainEl.get(0).$.label,
							':after'
						).backgroundColor;
					}).then((color) => {
						return cy.wrap({
							color
						}).should('have.property', 'color',
							toRGB(theme.primary.main));
					});
				});
			}, 500);
		});
	});
	context('Behavior', () => {
		context('Icons', () => {
			it('should contain icons if passed', () => {
				cy.get('#withContent').children().should('be.visible');
			});
			it('should be positioned correctly', () => {
				cy.get('#withContent').children().then((children) => {
					cy.get('#withContent').then((el: JQuery<MaterialInput>) => {
						const input = el.get(0).$.input;

						expect(children[0].getBoundingClientRect().left,
							'Pre icon is before input').to.be.below(
								input.getBoundingClientRect().left);
						expect(children[1].getBoundingClientRect().left,
							'Post icon is after input').to.be.above(
								input.getBoundingClientRect().left);
					});
				});
			});
		});
		it('should have a label if label property is set', () => {
			cy.get('#withProps').then((el: JQuery<MaterialInput>) => {
				cy.get('#withProps').invoke('attr', 'label').then((label) => {
					expect(getInnerText(el.get(0).$.label)).to.be.equal(
						label);
				});
			});
		});
		it('should have its value already set if attribute is set', () => {
			cy.get('#withProps').then((el: JQuery<MaterialInput>) => {
				cy.get('#withProps').invoke('attr', 'value').then((value) => {
					expect(el.get(0).$.input.value).to.be.equal(
						value);
					expect(el.get(0).value).to.be.equal(value);
				});
			});
		});
		it('should have an error set if error attribute is set', () => {
			cy.get('#withProps').then((el: JQuery<MaterialInput>) => {
				cy.get('#withProps').invoke('attr', 'error').then((error) => {
					expect(getInnerText(<HTMLElement>el.get(0).shadowRoot!.querySelector('.mdl-textfield__error')!))
						.to.be.equal(error);
				});
			});
		});
		it('should be possible to use non-text type inputs', () => {
			cy.get('#password').then((el: JQuery<MaterialInput>) => {
				expect(el.get(0).$.input.type).to.be.equal('password');
			});
		});
	});
});