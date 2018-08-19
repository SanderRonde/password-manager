/// <reference types="Cypress" />

import { HorizontalCenterer } from "../../../../../shared/components/util/horizontal-centerer/horizontal-centerer";
import { UI_TEST_PORT } from "../../../lib/ui-test-const";
import { getOriginalElement } from "../../../lib/ui-test-util";

global.Promise = Cypress.Promise;
context('Horizontal-Centerer', () => {
	beforeEach(() => {
		cy.visit(`http://localhost:${UI_TEST_PORT}/horizontal-centerer.html`);
		cy.get('#main').then((el: JQuery<HorizontalCenterer>) => {
			const component = el.get(0);
			return new Cypress.Promise((resolve) => {
				if (component.isMounted) {
					resolve();
				} else {
					component.mounted = () => {
						resolve();
					}
				}
			});
		})
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