const {Collection} = require("discord.js");

class TicketStore extends Collection {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	init() {
		this.bot.on('channelDelete', (channel) => {
			if(!channel.guild) return;

			this.deleteByChannel(channel.guild.id, channel.id);
		})
	}

	async create(server, channel, response) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO tickets (
					server_id,
					channel_id,
					response_id
				) VALUES ($1,$2,$3)`,
				[server, channel, response]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res(await this.get(server, response));
		})
	}

	async index(server, channel, response) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO tickets (
					server_id,
					channel_id,
					response_id
				) VALUES ($1,$2,$3)`,
				[server, channel, response]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res();
		})
	}

	async get(server, response) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM tickets WHERE server_id = $1 AND response_id = $2`,[server, response]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) res(data.rows[0]);
			else res(undefined);
		})
	}

	async delete(server, response) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`DELETE FROM tickets WHERE server_id = $1 AND response_id = $2`, [server, response]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			res();
		})
	}

	async deleteByChannel(server, channel) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`DELETE FROM tickets WHERE server_id = $1 AND channel_id = $2`, [server, channel]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			res();
		})
	}
}

module.exports = (bot, db) => new TicketStore(bot, db);