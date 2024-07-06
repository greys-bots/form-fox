const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	server_id: { },
	form: { },
	hid: { },
	type: { patch: true },
	event: { patch: true },
	data: { patch: true },
	priority: { patch: true }
}

class Action extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
	}
}

class ActionStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS actions (
			id 					SERIAL PRIMARY KEY,
			server_id 			TEXT,
			form			 	TEXT,
			hid		 			TEXT DEFAULT find_unique('actions'),
			type 				TEXT,
			event 				TEXT,
			data 				JSONB,
			priority 			INTEGER DEFAULT 1
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO actions (
				server_id,
				form,
				type,
				event,
				data,
				priority
			) VALUES ($1,$2,$3,$4,$5,$6)
			RETURNING id`,
			[data.server_id, data.form,
			 data.type, data.event, data.data, data.priority ?? 1]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async get(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM actions WHERE server_id = $1 AND hid = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Action(this, KEYS, data.rows[0]);
		} else return undefined;
	}

	async getByForm(server, fid) {
		try {
			var data = await this.db.query(`SELECT * FROM actions WHERE server_id = $1 AND form = $2`,[server, fid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			data.rows = data.rows.sort((a, b) => (
				a.priority - b.priority
			))
			return data.rows.map(x => new Action(this, KEYS, x));
		} else return [];
	}

	async getAll(server) {
		try {
			var data = await this.db.query(`SELECT * FROM actions WHERE server_id = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			data.rows = data.rows.sort((a, b) => (
				a.priority - b.priority
			))
			return data.rows.map(x => new Action(this, KEYS, x));
		} else return [];
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM actions WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Action(this, KEYS, data.rows[0]);
		} else return new Action(this, KEYS, {});
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE actions SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM actions WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteByForm(server, fid) {
		try {
			await this.db.query(`DELETE FROM actions WHERE server_id = $1 and form = $2`, [server, fid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteAll(server) {
		try {
			await this.db.query(`DELETE FROM actions WHERE server_id = $1`, [server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new ActionStore(bot, db);