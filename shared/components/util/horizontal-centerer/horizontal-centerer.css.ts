const css = (input: any) => input;

export const HorizontalCentererCSS = css(`<style>
	#container {
		display: flex;
		flex-direction: row;
		justify-content: center
	}

	#content {
		display: block;
	}
</style>`);