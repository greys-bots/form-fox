// adds new fields to forms

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'forms'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'embed')) return;

	await db.query(`
		ALTER TABLE forms ADD COLUMN reacts BOOLEAN;
		ALTER TABLE forms ADD COLUMN embed BOOLEAN;
	`);

	return;
}
