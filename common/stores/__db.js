var fs = require('fs');
var {Pool} = require('pg');

module.exports = async (bot) => {
	const db = new Pool();

	await db.query(`
		CREATE TABLE IF NOT EXISTS configs (
			id 					SERIAL PRIMARY KEY,
			server_id 			TEXT,
			response_channel 	TEXT,
			message 			TEXT
		);

		CREATE TABLE IF NOT EXISTS forms (
			id 			SERIAL PRIMARY KEY,
			server_id	TEXT,
			hid 		TEXT UNIQUE,
			name 		TEXT,
			description TEXT,
			questions 	JSONB,
			channel_id 	TEXT,
			roles 		TEXT[],
			message 	TEXT,
			color 		TEXT,
			open 		BOOLEAN
		);

		CREATE TABLE IF NOT EXISTS extras (
			id 			SERIAL PRIMARY KEY,
			key 		TEXT,
			val 		TEXT
		);

		CREATE TABLE IF NOT EXISTS form_posts (
			id 			SERIAL PRIMARY KEY,
			server_id 	TEXT,
			channel_id 	TEXT,
			message_id 	TEXT,
			form 		TEXT REFERENCES forms(hid) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS open_responses (
			id 			SERIAL PRIMARY KEY,
			server_id 	TEXT,
			channel_id 	TEXT,
			message_id 	TEXT,
			user_id 	TEXT,
			form 		TEXT REFERENCES forms(hid) ON DELETE CASCADE,
			questions   JSONB,
			answers 	TEXT[]
		);

		CREATE TABLE IF NOT EXISTS responses (
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

		CREATE TABLE IF NOT EXISTS response_posts (
			id 			SERIAL PRIMARY KEY,
			server_id 	TEXT,
			channel_id 	TEXT,
			message_id 	TEXT,
			response 	TEXT REFERENCES responses(hid) ON DELETE CASCADE
		);
	`);

	bot.stores = {};
	var files = fs.readdirSync(__dirname);
	for(var file of files) {
		if(!file.endsWith('.js') || ["__db.js"].includes(file)) continue;
		var tmpname = file.replace(/store\.js/i, "");
		var name =  tmpname[0].toLowerCase() + 
				   (tmpname.endsWith("y") ?
				   	tmpname.slice(1, tmpname.length-1) + "ies" : //CategoryStore.js becomes categories
				    tmpname.slice(1) + "s"); //ProfileStore.js becomes profiles
		bot.stores[name] = require(__dirname+'/'+file)(bot, db);
		if(bot.stores[name].init) bot.stores[name].init();
	}

	files = fs.readdirSync(__dirname + '/migrations');
	var version = (await db.query(`SELECT * FROM extras WHERE key = 'version'`)).rows[0]?.val || -1;
	if(files.length > version + 1) {
		for(var i = version; i < files.length; i++) {
			if(!files[i]) continue;
			var migration = require(`${__dirname}/migrations/${files[i]}`);
			await migration(bot, db);
		}
	}

	return db;
}