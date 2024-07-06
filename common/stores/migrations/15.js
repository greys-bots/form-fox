// add ticket and forum format options

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'forms'`);
	console.log(columns.rows, columns.rows.find(x => x.column_name == 'ticket_format'))
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'ticket_format'))
		return;

	await db.query(`
		ALTER TABLE forms ADD COLUMN ticket_format TEXT;
		ALTER TABLE forms ADD COLUMN forum_title TEXT;
	`);
	return;
}