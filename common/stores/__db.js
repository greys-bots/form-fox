var fs = require('fs');
var {Pool} = require('pg');

module.exports = (bot) => {
	const db = new Pool();

	db.query(`
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
			questions 	TEXT[],
			required 	INTEGER[],
			channel_id 	TEXT,
			roles 		TEXT[],
			message 	TEXT,
			color 		TEXT,
			open 		BOOLEAN
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
			answers 	TEXT[]
		);

		CREATE TABLE IF NOT EXISTS responses (
			id 			SERIAL PRIMARY KEY,
			server_id 	TEXT,
			hid 		TEXT UNIQUE,
			user_id 	TEXT,
			form 		TEXT REFERENCES forms(hid) ON DELETE CASCADE,
			answers 	TEXT[],
			status 		TEXT,
			received 	TIMESTAMPTZ
		);

		CREATE TABLE IF NOT EXISTS response_posts (
			id 			SERIAL PRIMARY KEY,
			server_id 	TEXT,
			channel_id 	TEXT,
			message_id 	TEXT,
			response 	TEXT
		);
	`);

	bot.stores = {};
	var files = fs.readdirSync(__dirname);
	for(var file of files) {
		if(["__db.js", "__migrations.js"].includes(file)) continue;
		var tmpname = file.replace(/store\.js/i, "");
		var name =  tmpname[0].toLowerCase() + 
				   (tmpname.endsWith("y") ?
				   	tmpname.slice(1, tmpname.length-1) + "ies" : //CategoryStore.js becomes categories
				    tmpname.slice(1) + "s"); //ProfileStore.js becomes profiles
		bot.stores[name] = require(__dirname+'/'+file)(bot, db);
		if(bot.stores[name].init) bot.stores[name].init();
	}

	return db;
}