const { Models: { DataStore, DataObject } } = require('frame');
const axios = require('axios');
const EVENTS = require(__dirname + '/../extras.js').events;
const KEYS = {
	id: { },
	server_id: { },
	form: { },
	hid: { },
	url: { patch: true },
	events: { patch: true }
}

class Hook extends DataObject {
	constructor(store, keys, data) {
		super(store, keys, data);
	}
}

class HookStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS hooks (
			id 			SERIAL PRIMARY KEY,
			server_id	TEXT,
			form 		TEXT,
			hid 		TEXT,
			url 		TEXT,
			events 		TEXT[]
		)`)
		
		// custom events
		EVENTS.forEach(e => {
			this.bot.on(e.toUpperCase(), async (response) => {
				var hooks = await this.getByForm(response.server_id, response.form.hid);
				if(!hooks?.[0]) return;
				hooks = hooks.filter(h => h.events.includes(e));
				if(!hooks[0]) return;

				for(var hook of hooks) {
					var data = {
						action: e,
						response
					}

					try {
						await axios.post(hook.url, data)
					} catch(e) {
						console.log(e)
						console.log(e.response)
					}
				}
			})
		})
	}

	async create(data = {}) {
		try {
			var data = await this.db.query(`INSERT INTO hooks (
				server_id,
				form,
				hid,
				url,
				events
			) VALUES ($1,$2,find_unique('hooks'),$3,$4)
			RETURNING *`,
			[data.server_id, data.form,
			 data.url, data.events]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(data.rows[0].id);
	}

	async index(server, form, data = {}) {
		try {
			await this.db.query(`INSERT INTO hooks (
				server_id,
				form,
				hid,
				url,
				events
			) VALUES ($1,$2,find_unique('hooks'),$3,$4)`,
			[server, form,
			 data.url, data.events]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server, form, hid) {
		try {
			var data = await this.db.query(`
				SELECT * FROM hooks
				WHERE server_id = $1
				AND form = $2
				AND hid = $3
			`,[server, form, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			return new Hook(this, KEYS, data.rows[0]);
		} else return new Hook(this, KEYS, { server_id: server, form });
	}

	async getID(id) {
		try {
			var data = await this.db.query(`
				SELECT * FROM hooks
				WHERE id = $1
			`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			return new Hook(this, KEYS, data.rows[0]);
		} else return new Hook(this, KEYS, { });
	}

	async getByForm(server, form) {
		try {
			var data = await this.db.query(`
				SELECT * FROM hooks
				WHERE server_id = $1
				AND form = $2
			`,[server, form]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			return data.rows.map(x => new Hook(this, KEYS, x));
		} else return undefined;
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE hooks SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE server = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`
				DELETE FROM hooks
				WHERE id = $1
			`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteByForm(server, form) {
		try {
			await this.db.query(`
				DELETE FROM hooks
				WHERE server_id = $1
				AND form = $2
			`, [server, form]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new HookStore(bot, db);