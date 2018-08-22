import { config, defineProps, PROP_TYPE, JSONType } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { InfiniteListIDMap } from './infinite-list-querymap';
import { InfiniteListHTML } from './infinite-list.html';
import { InfiniteListCSS } from './infinite-list.css';

@config({
	is: 'infinite-list',
	css: InfiniteListCSS,
	html: InfiniteListHTML
})
export class InfiniteList<D> extends ConfigurableWebComponent<InfiniteListIDMap> {
	props = defineProps(this, {
		reflect: {
			dataName: {
				type: PROP_TYPE.STRING,
				value: 'item'
			},
			data: {
				type: JSONType<D[]>(),
				value: [],
				isPrivate: true
			}
		}
	});
}