// converts questions from array to json

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'open_responses'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'selection')) return;

	var oresp = (await db.query(`SELECT * FROM open_responses`)).rows;
	if(oresp?.[0]?.selection) return;

	await db.query(`
		ALTER TABLE open_responses ADD COLUMN selection TEXT[];
	`);

	return;
}
