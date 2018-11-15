/// <reference types="Cypress" />

import { getOriginalElement, onMounted } from "../../../lib/ui-test-util";
import { UI_TEST_PORT } from "../../../lib/ui-test-const";

global.Promise = Cypress.Promise;
context('Vertical-Centerer', function() {
	this.timeout(5000);
	this.slow(5000);
	
	beforeEach(() => {
		cy.visit(`http://localhost:${UI_TEST_PORT}/vertical-centerer.html`);
		onMounted('#main');
	});
	
	context('Behavior', () => {
		it('centers its contents to the middle of the page', () => {
			getOriginalElement('#main', (el) => {
				const { top, bottom } = el.children[0].getBoundingClientRect();
				cy.window().then((win) => {
					const height = (win.document.body.getBoundingClientRect().height - 20) / 2;
					expect(top, 'margin top is over 90% of the margin top')
						.to.be.least(height * 0.90);
					expect(top, 'margin top is not over 110% of the margin top')
						.to.be.lt(height * 1.10);
					expect(bottom, 'margin bottom is over 90% of the margin bottom')
						.to.be.least(height * 0.90);
					expect(bottom, 'margin bottom is not over 110% of the margin bottom')
						.to.be.lt(height * 1.10);
				})
			});
		});
	});
});