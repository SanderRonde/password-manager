import { WebComponentBase } from "./webcomponents";
export { bindToClass } from './webcomponents/base';

export type ExtendableComponent = {new(...args: Array<any>): WebComponentBase} & typeof WebComponentBase;