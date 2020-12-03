var fs = require('fs');
var dblite = require('dblite');

//uncomment the line below if your setup involves
//getting the sqlite tools and putting them in (root)/sqlite
// dblite.bin = `${__dirname}/../../sqlite/sqlite3.exe`;

module.exports = async (bot) => {
	const db = dblite(`${__dirname}/../../data.sqlite`, '-header');

	// promisify
	db.get = function (...args) {
		return new Promise((resolve, reject) => {
			this.query(...args, (err, data) => {
				if(err) {
					return reject(err);
				} else {
					return resolve(data)
				}
			})
		})
	}

	await db.get(`
		PRAGMA foreign_keys = ON;
		
		CREATE TABLE IF NOT EXISTS configs (
			id 					INTEGER PRIMARY KEY AUTOINCREMENT,
			server_id 			TEXT,
			response_channel 	TEXT,
			message 			TEXT
		);

		CREATE TABLE IF NOT EXISTS forms (
			id 			INTEGER PRIMARY KEY AUTOINCREMENT,
			server_id	TEXT,
			hid 		TEXT UNIQUE,
			name 		TEXT,
			description TEXT,
			questions 	TEXT,
			channel_id 	TEXT,
			roles 		TEXT[],
			message 	TEXT,
			color 		TEXT,
			open 		BOOLEAN
		);

		CREATE TABLE IF NOT EXISTS extras (
			id 			INTEGER PRIMARY KEY AUTOINCREMENT,
			key 		TEXT,
			val 		TEXT
		);

		CREATE TABLE IF NOT EXISTS form_posts (
			id 			INTEGER PRIMARY KEY AUTOINCREMENT,
			server_id 	TEXT,
			channel_id 	TEXT,
			message_id 	TEXT,
			form 		TEXT REFERENCES forms(hid) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS open_responses (
			id 			INTEGER PRIMARY KEY AUTOINCREMENT,
			server_id 	TEXT,
			channel_id 	TEXT,
			message_id 	TEXT,
			user_id 	TEXT,
			form 		TEXT REFERENCES forms(hid) ON DELETE CASCADE,
			questions   JSONB,
			answers 	TEXT[],
			selection   TEXT[]
		);

		CREATE TABLE IF NOT EXISTS responses (
			id 			INTEGER PRIMARY KEY AUTOINCREMENT,
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
			id 			INTEGER PRIMARY KEY AUTOINCREMENT,
			server_id 	TEXT,
			channel_id 	TEXT,
			message_id 	TEXT,
			response 	TEXT REFERENCES responses(hid) ON DELETE CASCADE
		);
	`);

	console.log('done')

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
	var version = parseInt((await db.get(`SELECT * FROM extras WHERE key = 'version'`))[0]?.val || -1);
	if(files.length > version + 1) {
		for(var i = version + 1; i < files.length; i++) {
			if(!files[i]) continue;
			var migration = require(`${__dirname}/migrations/${files[i]}`);
			await migration(bot, db);
		}
	}

	return db;
}