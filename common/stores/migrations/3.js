// adds new fields to config

module.exports = async (bot, db) => {
	var version = (await db.query(`SELECT * FROM extras WHERE key = 'version'`)).rows[0]?.val;
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'configs'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'embed')) {
		if(!version) await db.query(`INSERT INTO extras (key, val) VALUES ('version', 3)`);
		else await db.query(`UPDATE extras SET val = 3 WHERE key = 'version'`);
		return Promise.resolve();
	}

	await db.query(`
		ALTER TABLE configs ADD COLUMN prefix TEXT;
		ALTER TABLE configs ADD COLUMN reacts BOOLEAN;
		ALTER TABLE configs ADD COLUMN embed BOOLEAN;
	`);

	if(!version) await db.query(`INSERT INTO extras (key, val) VALUES ('version', 3)`);
	else await db.query(`UPDATE extras SET val = 3 WHERE key = 'version'`);

	return Promise.resolve();
}
