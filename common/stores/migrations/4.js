// adds new fields to forms

module.exports = async (bot, db) => {
	var version = (await db.query(`SELECT * FROM extras WHERE key = 'version'`)).rows[0]?.val;
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'forms'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'embed')) {
		if(!version) await db.query(`INSERT INTO extras (key, val) VALUES ('version', 4)`);
		else await db.query(`UPDATE extras SET val = 4 WHERE key = 'version'`);
		return Promise.resolve();
	}

	await db.query(`
		ALTER TABLE forms ADD COLUMN reacts BOOLEAN;
		ALTER TABLE forms ADD COLUMN embed BOOLEAN;
	`);

	if(!version) await db.query(`INSERT INTO extras (key, val) VALUES ('version', 4)`);
	else await db.query(`UPDATE extras SET val = 4 WHERE key = 'version'`);

	return Promise.resolve();
}
