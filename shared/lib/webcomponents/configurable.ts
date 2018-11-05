import { WebComponentConfiguration } from '../webcomponent-util';
import { EventListenerObj } from './listener';
import { WebComponent } from './component';
import { TemplateFn } from './base';

export class ConfigurableWebComponent<IDS extends {
	[key: string]: HTMLElement;
} = {}, E extends EventListenerObj = {}> extends WebComponent<IDS, E> {
	protected renderer!: TemplateFn;
	public static config: WebComponentConfiguration;
	public config!: WebComponentConfiguration;
	protected css!: TemplateFn;
}