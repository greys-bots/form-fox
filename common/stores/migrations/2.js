// adds cooldown to forms

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'forms'`);
	var c2 = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'form_posts'`);
	
	if(columns.rows?.find(x => x.column_name == 'cooldown') &&
	   c2.rows?.find(x => x.column_name == 'bound')) return;
	
	await db.query(`
		ALTER TABLE forms ADD COLUMN cooldown	INTEGER;
		ALTER TABLE forms ADD COLUMN emoji 		TEXT;
		ALTER TABLE form_posts ADD COLUMN bound BOOLEAN;
	`);

	return;
}
