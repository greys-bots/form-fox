// converts questions from array to json

module.exports = async (bot, db) => {
	var columns = await db.query(`
		select column_name from information_schema.columns
		where table_name = 'forms'`);
	if(columns.rows?.[0] && !columns.rows.find(x => x.column_name == 'required'))
		return;

	var forms = await db.query(`SELECT * FROM forms`);
	var responses = (await db.query(`SELECT * FROM responses`)).rows;
	var open = (await db.query(`SELECT * FROM open_responses`)).rows;

	//shuffle values
	await db.query(`
		BEGIN TRANSACTION;
		UPDATE forms SET required = NULL;
		ALTER TABLE forms DROP COLUMN questions;
		ALTER TABLE forms RENAME COLUMN required TO questions;
		ALTER TABLE forms ALTER COLUMN questions TYPE JSONB USING to_jsonb(questions);

		create table tmp as table responses;
		drop table responses;
		create table responses (
			id 			SERIAL PRIMARY KEY,
			server_id 	TEXT,
			hid 		TEXT UNIQUE,
			user_id 	TEXT,
			form 		TEXT REFERENCES forms(hid) ON DELETE CASCADE,
			questions 	JSONB,
			answers 	TEXT[],
			status 		TEXT,
			received 	TIMESTAMPTZ
		);

		INSERT INTO responses (id, server_id, hid, user_id, form, answers, status, received) select * from tmp;

		drop table tmp;
		create table tmp as table open_responses;
		drop table open_responses;
		create table open_responses (
			id 			SERIAL PRIMARY KEY,
			server_id 	TEXT,
			channel_id 	TEXT,
			message_id 	TEXT,
			user_id 	TEXT,
			form 		TEXT REFERENCES forms(hid) ON DELETE CASCADE,
			questions   JSONB,
			answers 	TEXT[]
		);

		insert into open_responses (id, server_id, channel_id, message_id, user_id, form, answers) select * from tmp;

		drop table tmp;

		-- make sure sequences are accurate
		SELECT pg_catalog.setval(pg_get_serial_sequence('responses', 'id'), MAX(id)) FROM responses;
		SELECT pg_catalog.setval(pg_get_serial_sequence('open_responses', 'id'), MAX(id)) FROM open_responses;
	`);

	if(!forms.rows?.[0]) return;

	for(var form of forms.rows) {
		var required = form.required;
		var questions = form.questions.map((q, i) => {
			return {value: q, type: 'text', required: required.includes(i + 1)} //setting up for other question types
		})

		await db.query(`UPDATE forms SET questions = $1 WHERE id = $2`, [JSON.stringify(questions), form.id]);
		await db.query(`UPDATE responses SET questions = $1 WHERE form = $2`, [JSON.stringify(questions), form.hid]);
		await db.query(`UPDATE open_responses SET questions = $1 WHERE form = $2`, [JSON.stringify(questions), form.hid]);
	}

	return;
}
