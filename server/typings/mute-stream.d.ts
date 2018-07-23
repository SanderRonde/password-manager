declare module 'mute-stream' {
	class Mute {
		constructor(opts: {
			replace: string;
			prompt: string;
		})

		mute(): void;
		unmute(): void;
		pipe(pipe: any, opts: any): void;
	}

	export = Mute;
}