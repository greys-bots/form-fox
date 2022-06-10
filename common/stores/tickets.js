const KEYS = {
	id: { },
	server_id: { },
	channel_id: { },
	response_id: { }
}

class Ticket {
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
		else data = await this.#store.create(this.server_id, this.channel_id, this.response_id);
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

class TicketStore {
	#db;
	#bot;
	
	constructor(bot, db) {
		this.#db = db;
		this.#bot = bot;
	}

	async init() {
		await this.#db.query(`CREATE TABLE IF NOT EXISTS tickets (
			id			SERIAL PRIMARY KEY,
			server_id	TEXT,
			channel_id	TEXT,
			response_id	TEXT
		)`)
		
		this.#bot.on('channelDelete', (channel) => {
			if(!channel.guild) return;

			this.deleteByChannel(channel.guild.id, channel.id);
		})
	}

	async create(server, channel, response) {
		try {
			await this.#db.query(`INSERT INTO tickets (
				server_id,
				channel_id,
				response_id
			) VALUES ($1,$2,$3)`,
			[server, channel, response]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.get(server, response);
	}

	async index(server, channel, response) {
		try {
			await this.#db.query(`INSERT INTO tickets (
				server_id,
				channel_id,
				response_id
			) VALUES ($1,$2,$3)`,
			[server, channel, response]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server, response) {
		try {
			var data = await this.#db.query(`SELECT * FROM tickets WHERE server_id = $1 AND response_id = $2`,[server, response]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) return new Ticket(this, data.rows[0]);
		else return new Ticket(this, { server_id: server, response_id: response });
	}

	async delete(id) {
		try {
			await this.#db.query(`DELETE FROM tickets WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteByChannel(server, channel) {
		try {
			await this.#db.query(`DELETE FROM tickets WHERE server_id = $1 AND channel_id = $2`, [server, channel]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new TicketStore(bot, db);