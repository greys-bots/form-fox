// set up sections
/*
	adds built-in section for forms,
	moves questions into said section,
	then transforms and merges response questions
	and answers into one object
*/

module.exports = async (bot, db) => {
	const secstore = require('../sections')(null, db);
	await secstore.init();
	
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'forms'`);
	if(columns.rows?.[0] && columns.rows.find(x => x.column_name == 'sections'))
		return;

	var forms = (await db.query(`
		ALTER TABLE forms RENAME COLUMN questions TO sections;
		ALTER TABLE responses ALTER COLUMN answers TYPE jsonb;
		ALTER TABLE open_responses ALTER COLUMN answers TYPE jsonb;
		select * from forms;
	`))?.rows;
	if(forms?.length) {
		for(var f of forms) {
			console.log(f.server_id, f.hid, f.name);
			var section = await secstore.create({
				server_id: f.server_id,
				form: f.hid,
				name: 'Section 1',
				questions: f.sections
			})
			await db.query(`
				update forms set sections = $1
				where id = $2`,
				[JSON.stringify([section.hid]), f.id]
			);
			
			var responses = (await db.query(`
				select * from responses where
				server_id = $1 and form = $2
			`, [f.server_id, f.hid]))?.rows;
			if(!responses?.length) continue;

			for(var r of responses) {
				var tmp = [section];
				tmp[0].questions.forEach((q, i) => q.answer = r.answers[i])
				await db.query(`
					update responses
					set answers = $1
					where id = $2
				`, [tmp, r.id])
			}
		}

		await db.query(`delete from open_responses;`);
	}

	await db.query(`
		ALTER TABLE responses DROP COLUMN questions;
		ALTER TABLE open_responses DROP COLUMN questions;
		ALTER TABLE open_responses ADD COLUMN current JSONB;
		COMMIT;
	`);
	return;
}