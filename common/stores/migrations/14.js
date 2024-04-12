// add more form customization options

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'forms'`);
	console.log(columns.rows, columns.rows.find(x => x.column_name == 'post_icon'))
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'post_icon'))
		return;

	await db.query(`
		ALTER TABLE forms ADD COLUMN post_icon TEXT;
		ALTER TABLE forms ADD COLUMN post_banner TEXT;
		ALTER TABLE forms ADD COLUMN button_text TEXT;
		ALTER TABLE forms ADD COLUMN button_style INTEGER;
		ALTER TABLE forms ADD COLUMN note TEXT;
	`);
	return;
}