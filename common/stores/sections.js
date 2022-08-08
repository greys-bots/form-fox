const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	hid: { },
	server_id: { },
	form: { },
	name: { patch: true },
	description: { patch: true },
	questions: { patch: true }
}

class Section extends DataObject {
	constructor(store, keys, data) {
		super(store, keys, data);
	}

	toJSON() {
		var {store, KEYS, old, ...rest} = this;

		return rest;
	}
}

class SectionStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS sections (
			id 			SERIAL PRIMARY KEY,
			server_id 	TEXT,
			hid			TEXT,
			form	 	TEXT references forms(hid) on delete cascade,
			name 		TEXT,
			description	TEXT,
			questions	JSONB
		)`);
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO sections (
				hid,
				server_id,
				form,
				name,
				description,
				questions
			) VALUES (find_unique('sections'), $1,$2,$3,$4,$5)
			RETURNING id`,
			[data.server_id, data.form, data.name, data.description, JSON.stringify(data.questions ?? [])]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async get(server, form, hid) {
		try {
			var data = await this.db.query(`
				SELECT * FROM sections WHERE
				server_id = $1 AND
				form = $2 AND
				hid = $2
			`,[server, form, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Section(this, KEYS, data.rows[0]);
		} else return new Section(this, KEYS, {server_id: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM sections WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Section(this, KEYS, data.rows[0]);
		} else return new Section(this, KEYS, {});
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE sections SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM sections WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}