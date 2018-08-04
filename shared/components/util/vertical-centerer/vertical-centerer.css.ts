const css = (input: any) => input;

export const VerticalCentererCSS = css(`<style>
	#container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		height: 100%;
	}

	#container.fullscreen {
		height: 100vh;
	}

	#content {
		display: block;
	}
</style>`);