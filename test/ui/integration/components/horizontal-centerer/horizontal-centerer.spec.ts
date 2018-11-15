/// <reference types="Cypress" />

import { getOriginalElement, onMounted } from "../../../lib/ui-test-util";
import { UI_TEST_PORT } from "../../../lib/ui-test-const";

global.Promise = Cypress.Promise;
context('Horizontal-Centerer', function() {
	this.timeout(5000);
	this.slow(5000);
	
	beforeEach(() => {
		cy.visit(`http://localhost:${UI_TEST_PORT}/horizontal-centerer.html`);
		onMounted('#main');
	});
	
	context('Behavior', () => {
		it('centers its contents to the middle of the page', () => {
			getOriginalElement('#main', (el) => {
				const { left, right } = el.children[0].getBoundingClientRect();
				cy.window().then((win) => {
					const width = (win.document.body.getBoundingClientRect().width - 20) / 2;
					expect(left, 'margin left is over 90% of the margin left')
						.to.be.least(width * 0.90);
					expect(left, 'margin left is not over 110% of the margin left')
						.to.be.lt(width * 1.10);
					expect(right, 'margin right is over 90% of the margin right')
						.to.be.least(width * 0.90);
					expect(right, 'margin right is not over 110% of the margin right')
						.to.be.lt(width * 1.10);
				})
			});
		});
	});
});