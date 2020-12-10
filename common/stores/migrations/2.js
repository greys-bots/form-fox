// adds cooldown to forms

module.exports = async (bot, db) => {
	var version = (await db.query(`SELECT * FROM extras WHERE key = 'version'`)).rows[0]?.val;
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'forms'`);
	var c2 = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'form_posts'`);
	
	if(columns.rows?.find(x => x.column_name == 'cooldown') &&
	   c2.rows?.find(x => x.column_name == 'bound')) {
		if(!version) await db.query(`INSERT INTO extras (key, val) VALUES ('version', 2)`);
		else await db.query(`UPDATE extras SET val = 2 WHERE key = 'version'`);
		return Promise.resolve();
	}
	
	await db.query(`
		ALTER TABLE forms ADD COLUMN cooldown	INTEGER;
		ALTER TABLE forms ADD COLUMN emoji 		TEXT;
		ALTER TABLE posts ADD COLUMN bound 		BOOLEAN;
	`);

	if(!version) await db.query(`INSERT INTO extras (key, val) VALUES ('version', 2)`);
	else await db.query(`UPDATE extras SET val = 2 WHERE key = 'version'`);

	return Promise.resolve();
}
