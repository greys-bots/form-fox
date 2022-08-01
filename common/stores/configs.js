const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	server_id: { },
	response_channel: { patch: true },
	message: { patch: true },
	prefix: { patch: true },
	reacts: { patch: true },
	embed: { patch: true },
	opped: { patch: true },
	ticket_category: { patch: true },
	ticket_message: { patch: true },
	autodm: { patch: true },
	autothread: { patch: true }
}

class Config extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
	}
}

class ConfigStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS configs (
			id 					SERIAL PRIMARY KEY,
			server_id 			TEXT,
			response_channel 	TEXT,
			message 			TEXT,
			prefix 				TEXT,
			reacts 				BOOLEAN,
			embed 				BOOLEAN,
			opped 				JSONB,
			ticket_category 	TEXT,
			ticket_message		TEXT,
			autodm 				TEXT,
			autothread			BOOLEAN
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO configs (
				server_id,
				response_channel,
				message,
				prefix,
				reacts,
				embed,
				opped,
				ticket_category,
				ticket_message,
				autodm,
				autothread
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			RETURNING id`,
			[data.server_id, data.response_channel,
			 data.message, data.prefix, data.reacts ?? true,
			 data.embed ?? true, data.opped ?? {roles: [], users: []}, data.ticket_category,
			 data.ticket_message, data.autodm, data.autothread]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(server, data = {}) {
		try {
			await this.db.query(`INSERT INTO configs (
				server_id,
				response_channel,
				message,
				prefix,
				reacts,
				embed,
				opped,
				ticket_category,
				ticket_message,
				autodm,
				autothread
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
			[server, data.response_channel,
			 data.message, data.prefix, data.reacts ?? true,
			 data.embed ?? true, data.opped ?? {roles: [], users: []}, data.ticket_category,
			 data.ticket_message, data.autodm, data.autothread]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server) {
		try {
			var data = await this.db.query(`SELECT * FROM configs WHERE server_id = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Config(this, KEYS, data.rows[0]);
		} else return new Config(this, KEYS, {server_id: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM configs WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Config(this, KEYS, data.rows[0]);
		} else return new Config(this, KEYS, {});
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE configs SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM configs WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new ConfigStore(bot, db);