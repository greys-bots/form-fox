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

class Config {
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
		else data = await this.#store.create(this.server_id, obj);
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
			if(this[k] === undefined) continue;
			if(this[k] === null) {
				obj[k] = null;
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

class ConfigStore {
	constructor(bot, db) {
		this.db = db;
		this.bot = bot;
	};

	async create(server, data = {}) {
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
		
		return await this.get(server);
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
			return new Config(this, data.rows[0]);
		} else return new Config(this, {server_id: server});
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM configs WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Config(this, data.rows[0]);
		} else return new Config(this, {});
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