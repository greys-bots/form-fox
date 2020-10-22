// converts questions from array to json

module.exports = async (bot, db) => {
	var version = (await db.query(`SELECT * FROM extras WHERE key = 'version'`)).rows[0]?.val;
	var oresp = (await db.query(`SELECT * FROM open_responses`)).rows;
	if(oresp?.[0]?.selection) {
		if(!version) await db.query(`INSERT INTO extras (key, val) VALUES ('version', 1)`);
		else await db.query(`UPDATE extras SET val = 1 WHERE key = 'version'`);
	}

	await db.query(`
		ALTER TABLE open_responses ADD COLUMN selection TEXT[];
	`);

	if(!version) await db.query(`INSERT INTO extras (key, val) VALUES ('version', 0)`);
	else await db.query(`UPDATE extras SET val = 1 WHERE key = 'version'`);

	return Promise.resolve();
}
