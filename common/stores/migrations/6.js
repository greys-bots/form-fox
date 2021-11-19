// adds form apply channel id

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'forms'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'apply_channel'))
		return;

	await db.query(`ALTER TABLE forms ADD COLUMN apply_channel TEXT`);
	return;
}