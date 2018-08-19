/// <reference types="Cypress" />

import { iterateThemes, toRGB, getContrast, listenForEvent, getOriginalElement, GetFirstArg, onMounted } from '../../../lib/ui-test-util';
import { AnimatedButton } from '../../../../../shared/components/util/animated-button/animated-button';
import { DEFAULT_THEME } from '../../../../../shared/types/shared-types';
import { WebComponent } from '../../../../../shared/lib/webcomponents';
import { UI_TEST_PORT } from '../../../lib/ui-test-const';
const DEFAULT_THEME: DEFAULT_THEME = 'light';

global.Promise = Cypress.Promise;
context('Animated-Button', () => {
	beforeEach(() => {
		cy.visit(`http://localhost:${UI_TEST_PORT}/animated-button.html`);
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
			getOriginalElement<AnimatedButton>('#main', (el) => {
				listenForEvent(el, 'click', () => {
					Cypress.$(el.$.button).click();
				});
			});
		});
	});

	context('Behavior', () => {
		const DEFAULT_STATE = 'regular';
		context('#getState()', () => {
			it('returns the current state at all times', () => {
				getOriginalElement<AnimatedButton>('#main', (el) => {
					let CURRENT_STATE: GetFirstArg<typeof el.setState> = DEFAULT_STATE;
					expect(el.getState()).to.be.equal(CURRENT_STATE, 
						'is equal to initial state');
					CURRENT_STATE = 'failure';
					el.setState(CURRENT_STATE);
					expect(el.getState()).to.be.equal(CURRENT_STATE,
						'is equal to new state');
					CURRENT_STATE = 'loading';
					el.setState(CURRENT_STATE);
					expect(el.getState()).to.be.equal(CURRENT_STATE,
						'is equal to new state');
					CURRENT_STATE = 'success';
					el.setState(CURRENT_STATE);
					expect(el.getState()).to.be.equal(CURRENT_STATE,
						'is equal to new state');
					CURRENT_STATE = 'regular';
					el.setState(CURRENT_STATE);
					expect(el.getState()).to.be.equal(CURRENT_STATE,
						'is equal to new state');
				});
			});
		});
		describe('#setState()', () => {
			it('throws an error when an invalid state is passed', () => {
				getOriginalElement<AnimatedButton>('#main', (el) => {
					expect(() => {
						//@ts-ignore
						el.setState('invalidstate')
					}, 'setting an invalid state throws').to.throw;
				});
			});
			it('shows a spinner when setting state to loading', () => {
				getOriginalElement<AnimatedButton>('#main', async (el) => {
					await el.setState('loading');
					expect(el.shadowRoot!.querySelector('#loadingContent loading-spinner')).to.be.visible;

					await el.setState('regular');
					expect(el.shadowRoot!.querySelector('#loadingContent loading-spinner')).to.not.be.visible;
				});
			});
			it('changes look when setting state to success', () => {
				getOriginalElement<AnimatedButton>('#main', (el) => {
					iterateThemes('#main', async (theme, root) => {
						await el.setState('success');
						expect(el.$.successContent).to.be.visible;
						
						cy.window().then((win) => {
							return win.getComputedStyle(root.querySelector('#button')!).backgroundColor;
						}).then((color) => {
							expect(color).to.be.equal(theme.success, 
								'background-color is equal to theme success color');
						});

						await el.setState('regular');
						cy.wait(500);
						expect(el.$.successContent).to.not.be.visible;
						
						return cy.window().then((win) => {
							return win.getComputedStyle(root.querySelector('#button')!).backgroundColor;
						}).then((color) => {
							return expect(color).to.not.be.equal(theme.success, 
								'background-color is not equal to theme success color when state is regular');
						}) as any;
					}, 500);
				});
			});
			it('changes look when setting state to failure', () => {
				getOriginalElement<AnimatedButton>('#main', (el) => {
					iterateThemes('#main', async (theme, root) => {
						await el.setState('failure');
						expect(el.$.failureContent).to.be.visible;
						
						cy.window().then((win) => {
							return win.getComputedStyle(root.querySelector('#button')!).backgroundColor;
						}).then((color) => {
							expect(color).to.be.equal(theme.error, 
								'background-color is equal to theme error color');
						});

						await el.setState('regular');
						expect(el.$.failureContent).to.not.be.visible;
						
						return cy.window().then((win) => {
							return win.getComputedStyle(root.querySelector('#button')!).backgroundColor;
						}).then((color) => {
							expect(color).to.not.be.equal(theme.error, 
								'background-color is not equal to theme error color when state is regular');
						}) as any;
					}, 500);
				});
			});
		});
	});
});