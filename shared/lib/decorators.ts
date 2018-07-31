type AnyFunction = (...args: any[]) => any;

export function bindToClass(target: Object, _propertyKey: string|symbol, 
	descriptor: TypedPropertyDescriptor<AnyFunction>): TypedPropertyDescriptor<AnyFunction> | void {
		descriptor.value = descriptor.value!.bind(target);
	}