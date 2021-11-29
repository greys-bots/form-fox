// paginate response embeds

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'response_posts'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'page'))
		return;

	await db.query(`
		ALTER TABLE response_posts ADD COLUMN page INTEGER;
		UPDATE response_posts SET page = 1;
	`);
	return;
}