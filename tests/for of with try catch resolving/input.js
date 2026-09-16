async function(candidates) {
	async function probe(value) {
		if (!value) {
			throw new Error("rejected");
		}
		return value;
	}
	let last;
	for (const candidate of candidates) {
		try {
			return await probe(candidate);
		} catch (e) {
			last = e;
		}
	}
	throw last;
}
