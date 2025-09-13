// add data column to open responses and responses

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'open_responses'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'data'))
		return;

	await db.query(`
		ALTER TABLE open_responses ADD COLUMN data JSONB;
		ALTER TABLE responses ADD COLUMN data JSONB;
	`);
	return;
}