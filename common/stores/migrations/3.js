// adds new fields to config

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'configs'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'embed')) return;

	await db.query(`
		ALTER TABLE configs ADD COLUMN prefix TEXT;
		ALTER TABLE configs ADD COLUMN reacts BOOLEAN;
		ALTER TABLE configs ADD COLUMN embed BOOLEAN;
	`);

	return;
}
