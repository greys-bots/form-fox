const { Models: { DataStore, DataObject } } = require('frame');
const KEYS = {
	id: { },
	server_id: { },
	channel_id: { },
	response_id: { }
}

class Ticket extends DataObject {
	constructor(store, keys, data) {
		super(store, keys, data);
	}
}

class TicketStore extends DataStore {
	constructor(bot, db) {
		super(bot, db);
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS tickets (
			id			SERIAL PRIMARY KEY,
			server_id	TEXT,
			channel_id	TEXT,
			response_id	TEXT
		)`)
		
		this.bot.on('channelDelete', (channel) => {
			if(!channel.guild) return;

			this.deleteByChannel(channel.guild.id, channel.id);
		})
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO tickets (
				server_id,
				channel_id,
				response_id
			) VALUES ($1,$2,$3)
			RETURNING id`,
			[data.server_id, data.channel_id, data.response_id]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(server, channel, response) {
		try {
			await this.db.query(`INSERT INTO tickets (
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
			var data = await this.db.query(`SELECT * FROM tickets WHERE server_id = $1 AND response_id = $2`,[server, response]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) return new Ticket(this, KEYS, data.rows[0]);
		else return new Ticket(this, KEYS, { server_id: server, response_id: response });
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM tickets WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteByChannel(server, channel) {
		try {
			await this.db.query(`DELETE FROM tickets WHERE server_id = $1 AND channel_id = $2`, [server, channel]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new TicketStore(bot, db);