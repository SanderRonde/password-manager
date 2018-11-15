/// <reference types="Cypress" />
import { GlobalController } from "../../../../../shared/components/entrypoints/base/global/global-controller";
import { ThemeSelector } from "../../../../../shared/components/util/theme-selector/theme-selector";
import { PaperToast } from "../../../../../shared/components/util/paper-toast/paper-toast";
import { MAIN_SERVER_PORT, DEFAULT_EMAIL, DEFAULT_PW } from "../../../lib/ui-test-const";
import { Login } from "../../../../../shared/components/entrypoints/base/login/login";
import { onMounted } from "../../../lib/ui-test-util";

global.Promise = Cypress.Promise;
context('Login-Page', function() {
	this.timeout(5000);
	this.slow(5000);
	
	beforeEach(function() {
		this.timeout(10000);

		cy.visit(`http://localhost:${MAIN_SERVER_PORT}/login`);
		onMounted('global-controller');
	});

	context('Theme', () => {
		it('can be changed', () => {
			cy.get('global-controller').then((globalController: JQuery<GlobalController>) => {
				const loginPage = globalController.get(0).currentContent!;
				const initialTheme = loginPage.getTheme();
				cy.get('global-controller').then((globalController: JQuery<GlobalController>) => {
					const loginPage = globalController.get(0).currentContent!;
					return loginPage.shadowRoot!.querySelector('theme-selector');
				}).then((ts: JQuery<ThemeSelector>) => {
					ts.get(0).$.button.click();

					const themes = ts.get(0).shadowRoot!.querySelectorAll('.theme');
					for (const theme of themes) {
						if (!theme.nextElementSibling!.classList.contains('active')) {	
							(theme as HTMLElement).click();
						}
					}
					cy.get('global-controller').then((globalController: JQuery<GlobalController>) => {
						const loginPage = globalController.get(0).currentContent!;
						expect(loginPage.getTheme(),
							'theme was changed').to.not.equal(initialTheme);
					});
				});
			});
		});
	});
	context('Behavior', () => {
		context('Validation', () => {
			it('input and button become invalid when inputting invalid email', () => {
				cy.get('global-controller').then((globalController: JQuery<GlobalController>) => {
					const loginPage = globalController.get(0).currentContent! as Login;
					loginPage.$.emailInput.set('invalidemail');

					expect(loginPage.$.emailInput.valid).to.be.false;
					expect(loginPage.$.emailInput
						.getAttribute('error')).to.be
						.equal('Please enter a valid email address');
					expect(loginPage.$.button
						.$.button.getAttribute('disabled')).to.be.equal('');
				});
			});
			it('input and button become invalid when inputting invalid 2FA', () => {
				cy.get('global-controller').then((globalController: JQuery<GlobalController>) => {
					const loginPage = globalController.get(0).currentContent! as Login;
					loginPage.$.twofactorInput.set('1234567');

					expect(loginPage.$.twofactorInput.valid).to.be.false;
					expect(loginPage.$.twofactorInput
						.getAttribute('error')).to.be
						.equal('Enter a 6-digit code');
					expect(loginPage.$.button
						.$.button.getAttribute('disabled')).to.be.equal('');
				});
			});
			it('button becomes available again when inputting valid value', () => {
				cy.get('global-controller').then((globalController: JQuery<GlobalController>) => {
					const loginPage = globalController.get(0).currentContent! as Login;
					loginPage.$.emailInput.set('invalidemail');

					expect(loginPage.$.button
						.$.button.getAttribute('disabled')).to.be.equal('');

					loginPage.$.emailInput.set('valid@email.com');

					expect(loginPage.$.button
						.$.button.getAttribute('disabled')).to.be.equal(null);
				});
			});
		});
		context('Submission', () => {
			it('fails if credentials are invalid', () => {
				cy.get('global-controller').then((globalController: JQuery<GlobalController>) => {
					const loginPage = globalController.get(0).currentContent! as Login;
					loginPage.$.emailInput.set('notthecorrect@email.com');
					loginPage.$.passwordInput.set('somepassword');
					loginPage.$.button.$.button.click();

					expect(loginPage.$.button.getState()).to.be.equal('loading');
					cy.wait(3000).then(() => {
						expect(loginPage.$.button.getState()).to.be.equal('failure');
						
						const toast = cy.get('paper-toast');
						toast.then((toast: JQuery<PaperToast>) => {
							expect(toast.get(0).props.content)
								.to.be.equal('Invalid credentials');
						})
					});
				});
			});
			it('succeeds if the credentials are valid', () => {
				cy.get('global-controller').then((globalController: JQuery<GlobalController>) => {
					const loginPage = globalController.get(0).currentContent! as Login;
					loginPage.$.emailInput.set(DEFAULT_EMAIL);
					loginPage.$.passwordInput.set(DEFAULT_PW);
					loginPage.$.button.$.button.click();

					expect(loginPage.$.button.getState()).to.be.equal('loading');
					cy.wait(3000).then(() => {
						expect(loginPage.$.button.getState()).to.be.equal('success');
					});
				});
			});
		});
	});
});