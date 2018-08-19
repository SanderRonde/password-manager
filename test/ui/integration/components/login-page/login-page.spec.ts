/// <reference types="Cypress" />

import { ThemeSelector } from "../../../../../shared/components/util/theme-selector/theme-selector";
import { PaperToast } from "../../../../../shared/components/util/paper-toast/paper-toast";
import { Login } from "../../../../../shared/components/entrypoints/base/login/login";
import { WebComponent } from "../../../../../shared/lib/webcomponents";
import { MAIN_SERVER_PORT, DEFAULT_EMAIL, DEFAULT_PW } from "../../../lib/ui-test-const";
import { onMounted } from "../../../lib/ui-test-util";

global.Promise = Cypress.Promise;
context('Login-Page', () => {
	beforeEach(() => {
		cy.visit(`http://localhost:${MAIN_SERVER_PORT}/login`);
		onMounted('login-page');
	});

	context('Theme', () => {
		it('can be changed', () => {
			cy.get('login-page').then((loginPage: JQuery<WebComponent>) => {
				const initialTheme = loginPage.get(0).getTheme();
				cy.get('login-page').then((loginPage: JQuery<WebComponent>) => {
					return loginPage.get(0).shadowRoot!.querySelector('theme-selector');
				}).then((ts: JQuery<ThemeSelector>) => {
					ts.get(0).$.button.click();

					const themes = ts.get(0).shadowRoot!.querySelectorAll('.theme');
					for (const theme of themes) {
						if (!theme.nextElementSibling!.classList.contains('active')) {	
							(theme as HTMLElement).click();
						}
					}
					cy.get('login-page').then((loginPage: JQuery<WebComponent>) => {
						expect(loginPage.get(0).getTheme(),
							'theme was changed').to.not.equal(initialTheme);
					});
				});
			});
		});
	});
	context('Behavior', () => {
		context('Validation', () => {
			it('input and button become invalid when inputting invalid email', () => {
				cy.get('login-page').then((loginPage: JQuery<Login>) => {
					loginPage.get(0).$.emailInput.set('invalidemail');

					expect(loginPage.get(0).$.emailInput.valid).to.be.false;
					expect(loginPage.get(0).$.emailInput
						.getAttribute('error')).to.be
						.equal('Please enter a valid email address');
					expect(loginPage.get(0).$.button
						.$.button.getAttribute('disabled')).to.be.equal('');
				});
			});
			it('input and button become invalid when inputting invalid 2FA', () => {
				cy.get('login-page').then((loginPage: JQuery<Login>) => {
					loginPage.get(0).$.twofactorInput.set('1234567');

					expect(loginPage.get(0).$.twofactorInput.valid).to.be.false;
					expect(loginPage.get(0).$.twofactorInput
						.getAttribute('error')).to.be
						.equal('Enter a 6-digit code');
					expect(loginPage.get(0).$.button
						.$.button.getAttribute('disabled')).to.be.equal('');
				});
			});
			it('button becomes available again when inputting valid value', () => {
				cy.get('login-page').then((loginPage: JQuery<Login>) => {
					loginPage.get(0).$.emailInput.set('invalidemail');

					expect(loginPage.get(0).$.button
						.$.button.getAttribute('disabled')).to.be.equal('');

					loginPage.get(0).$.emailInput.set('valid@email.com');

					expect(loginPage.get(0).$.button
						.$.button.getAttribute('disabled')).to.be.equal(null);
				});
			});
		});
		context('Submission', () => {
			it('fails if credentials are invalid', () => {
				cy.get('login-page').then((loginPage: JQuery<Login>) => {
					loginPage.get(0).$.emailInput.set('notthecorrect@email.com');
					loginPage.get(0).$.passwordInput.set('somepassword');
					loginPage.get(0).$.button.$.button.click();

					expect(loginPage.get(0).$.button.getState()).to.be.equal('loading');
					cy.wait(3000).then(() => {
						expect(loginPage.get(0).$.button.getState()).to.be.equal('failure');
						
						const toast = cy.get('paper-toast');
						toast.then((toast: JQuery<PaperToast>) => {
							expect(toast.get(0).props.content)
								.to.be.equal('Invalid credentials');
						})
					});
				});
			});
			it('succeeds if the credentials are valid', () => {
				cy.get('login-page').then((loginPage: JQuery<Login>) => {
					loginPage.get(0).$.emailInput.set(DEFAULT_EMAIL);
					loginPage.get(0).$.passwordInput.set(DEFAULT_PW);
					loginPage.get(0).$.button.$.button.click();

					expect(loginPage.get(0).$.button.getState()).to.be.equal('loading');
					cy.wait(3000).then(() => {
						expect(loginPage.get(0).$.button.getState()).to.be.equal('success');
					});
				});
			});
		});
	});
});