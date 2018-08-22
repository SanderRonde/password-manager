import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { InfiniteListIDMap } from './infinite-list-querymap';
import { config } from '../../../lib/webcomponent-util';
import { InfiniteListHTML } from './infinite-list.html';
import { InfiniteListCSS } from './infinite-list.css';

@config({
	is: 'infinite-list',
	css: InfiniteListCSS,
	html: InfiniteListHTML
})
export class InfiniteList extends ConfigurableWebComponent<InfiniteListIDMap> {
	
}