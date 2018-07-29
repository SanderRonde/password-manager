import { COLLECTIONS } from "../../../../../database/database";
import { Webserver } from "../webserver";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

function createPeriodical(fn: () => void, time: number): () => void {
	const interval = setInterval(fn, time);
	interval.unref();
	return () => {
		clearInterval(interval);
	}
}

export function initPeriodicals(server: Webserver) {
	createPeriodical(async () => {
		//Clear all expired instances
		const instances = await server.database.Manipulation.getAll(
			COLLECTIONS.INSTANCES);
		if (instances === null) return;

		await Promise.all(instances.filter(({ expires }) => {
			return Date.now() > expires;
		}).map(async (instance) => {
			await server.database.Manipulation.deleteOne(COLLECTIONS.INSTANCES, {
				_id: instance._id
			});
		}));
	}, DAY);
}