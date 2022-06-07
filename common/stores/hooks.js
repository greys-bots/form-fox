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

class Hook {
	#store;

	constructor(store, data) {
		this.#store = store;
		for(var k in KEYS) this[k] = data[k];
	}

	async fetch() {
		var data = await this.#store.getID(this.id);
		for(var k in KEYS) this[k] = data[k];

		return this;
	}

	async save() {
		var obj = await this.verify();

		var data;
		if(this.id) data = await this.#store.update(this.id, obj);
		else data = await this.#store.create(this.server_id, this.form, obj);
		for(var k in KEYS) this[k] = data[k];
		return this;
	}

	async delete() {
		await this.#store.delete(this.id);
	}

	async verify(patch = true /* generate patch-only object */) {
		var obj = {};
		var errors = []
		for(var k in KEYS) {
			if(!KEYS[k].patch && patch) continue;
			if(this[k] == undefined) continue;
			if(this[k] == null) {
				obj[k] = this[k];
				continue;
			}

			var test = true;
			if(KEYS[k].test) test = await KEYS[k].test(this[k]);
			if(!test) {
				errors.push(KEYS[k].err);
				continue;
			}
			if(KEYS[k].transform) obj[k] = KEYS[k].transform(this[k]);
			else obj[k] = this[k];
		}

		if(errors.length) throw new Error(errors.join("\n"));
		return obj;
	}
}

class HookStore {
	#db;
	#bot;
	
	constructor(bot, db) {
		this.#db = db;
		this.#bot = bot;
	};

	init() {
		// custom events
		EVENTS.forEach(e => {
			this.#bot.on(e.toUpperCase(), async (response) => {
				var hooks = await this.getByForm(response.server_id, response.form.hid);
				if(!hooks?.[0]) return;
				hooks = hooks.filter(h => h.events.includes(e));
				if(!hooks[0]) return;

				for(var hook of hooks) {
					try {
						await axios.post(hook.url, {
							action: e,
							response
						})
					} catch(e) {
						console.log(e.response)
					}
				}
			})
		})
	}

	async create(server, form, data = {}) {
		try {
			var data = await this.#db.query(`INSERT INTO hooks (
				server_id,
				form,
				hid,
				url,
				events
			) VALUES ($1,$2,find_unique('hooks'),$3,$4)
			RETURNING *`,
			[server, form,
			 data.url, data.events]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.get(server, form, data.rows[0].hid);
	}

	async index(server, form, data = {}) {
		try {
			await this.#db.query(`INSERT INTO hooks (
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
			var data = await this.#db.query(`
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
			return new Hook(this, data.rows[0]);
		} else return new Hook(this, { server_id: server, form });
	}

	async getID(id) {
		try {
			var data = await this.#db.query(`
				SELECT * FROM hooks
				WHERE id = $1
			`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			return new Hook(this, data.rows[0]);
		} else return new Hook(this, { });
	}

	async getByForm(server, form) {
		try {
			var data = await this.#db.query(`
				SELECT * FROM hooks
				WHERE server_id = $1
				AND form = $2
			`,[server, form]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			return data.rows.map(x => new Hook(this, x));
		} else return undefined;
	}

	async update(id, data = {}) {
		try {
			await this.#db.query(`UPDATE hooks SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE server = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.#db.query(`
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
			await this.#db.query(`
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