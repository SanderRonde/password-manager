import { WebComponentBase } from "wclib";

export type ExtendableComponent = {new(...args: Array<any>): WebComponentBase} & typeof WebComponentBase;