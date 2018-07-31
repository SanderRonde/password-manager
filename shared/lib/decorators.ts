export type AnyFunction = (...args: any[]) => any;

export function bindToClass(target: Object & {
	__toBind: ((__this: any) => void)[];
	__doBinds(__this: any): void;
}, _propertyKey: string|symbol, 
	descriptor: TypedPropertyDescriptor<AnyFunction>): TypedPropertyDescriptor<AnyFunction> | void {
		const originalvalue = descriptor.value!;
		let __this: any = null;
		target.__toBind = target.__toBind || [];
		target.__toBind.push((___this: any) => {
			__this = ___this;
		});
		descriptor.value = function(...args: any[]) {
			return originalvalue.bind(__this)(...args);
		}
	}