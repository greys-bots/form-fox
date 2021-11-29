// paginate open response embeds

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'open_responses'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'page'))
		return;

	await db.query(`
		ALTER TABLE open_responses ADD COLUMN page INTEGER;
	`);
	return;
}