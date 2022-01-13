// add tickets message columns to configs and forms

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'configs'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'ticket_message'))
		return;

	await db.query(`
		ALTER TABLE configs ADD COLUMN ticket_message TEXT;
		ALTER TABLE forms ADD COLUMN ticket_msg TEXT;
	`);
	return;
}