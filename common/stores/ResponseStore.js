const {Collection} = require("discord.js");

class ResponseStore extends Collection {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	async create(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.get(`INSERT INTO responses (
					server_id,
					hid,
					user_id,
					form,
					questions,
					answers,
					status,
					received
				) VALUES (?,?,?,?,?,?,?,?)`,
				[server, hid, data.user_id, data.form, data.questions || [],
				data.answers || [], data.status || 'pending', data.received || new Date().toISOString()]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res(await this.get(server, hid));
		})
	}

	async index(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.get(`INSERT INTO responses (
					server_id,
					hid,
					user_id,
					form,
					questions,
					answers,
					status,
					received
				) VALUES (?,?,?,?,?,?,?,?)`,
				[server, hid, data.user_id, data.form, data.questions || [],
				data.answers || [], data.status || 'pending', data.received || new Date().toISOString()]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res();
		})
	}

	async get(server, hid, forceUpdate = false) {
		return new Promise(async (res, rej) => {
			if(!forceUpdate) {
				var response = super.get(`${server}-${hid}`);
				if(response) {
					var form = await this.bot.stores.forms.get(response.server_id, response.form);
					if(form) response.form = form;
					return res(response);
				}
			}
			
			try {
				var data = await this.db.get(`SELECT * FROM responses WHERE server_id = ? AND hid = ?`, [server, hid], {
					id: Number,
					server_id: String,
					hid: String,
					user_id: String,
					form: String,
					questions: JSON.parse,
					answers: JSON.parse,
					status: String,
					received: Date
				});
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data && data[0]) {
				var form = await this.bot.stores.forms.get(data[0].server_id, data[0].form);
				if(form) data[0].form = form;
				this.set(`${server}-${hid}`, data[0])
				res(data[0])
			} else res(undefined);
		})
	}

	async getAll(server) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.get(`SELECT * FROM responses WHERE server_id = ?`, [server], {
					id: Number,
					server_id: String,
					hid: String,
					user_id: String,
					form: String,
					questions: JSON.parse,
					answers: JSON.parse,
					status: String,
					received: Date
				});
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data && data[0]) {
				for(var i = 0; i < data.length; i++) {
					var form = await this.bot.stores.forms.get(data[i].server_id, data[i].form);
					if(form) data[i].form = form;
				}
				res(data)
			} else res(undefined);
		})
	}

	async getByUser(server, user) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.get(`SELECT * FROM responses WHERE server_id = ? AND user_id = ?`, [server, user], {
					id: Number,
					server_id: String,
					hid: String,
					user_id: String,
					form: String,
					questions: JSON.parse,
					answers: JSON.parse,
					status: String,
					received: Date
				});
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data && data[0]) {
				for(var i = 0; i < data.length; i++) {
					var form = await this.bot.stores.forms.get(data[i].server_id, data[i].form);
					if(form) data[i].form = form;
				}
				res(data)
			} else res(undefined);
		})
	}

	async getByForm(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.get(`SELECT * FROM responses WHERE server_id = ? AND form = ?`, [server, hid], {
					id: Number,
					server_id: String,
					hid: String,
					user_id: String,
					form: String,
					questions: JSON.parse,
					answers: JSON.parse,
					status: String,
					received: Date
				});
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data && data[0]) {
				var form = await this.bot.stores.forms.get(server, hid);
                for(var i = 0; i < data.length; i++) {
                    if(form) data[i].form = form;
                }
                
				res(data)
			} else res(undefined);
		})
	}

	async update(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.get(`UPDATE responses SET ${Object.keys(data).map((k, i) => k+"=?").join(",")} WHERE server_id = ? AND hid = ?`,[...Object.values(data), server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			res(await this.get(server, hid, true));
		})
	}

	async delete(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.get(`DELETE FROM responses WHERE server_id = ? AND hid = ?`, [server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			super.delete(`${server}-${hid}`);
			res();
		})
	}

	async deleteAll(server) {
		return new Promise(async (res, rej) => {
			try {
				var responses = await this.getAll(server);
				if(!responses?.[0]) return res();
				await this.db.get(`DELETE FROM responses WHERE server_id = ?`, [server]);
				for(var response of responses) super.delete(`${server}-${response.hid}`);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			res();
		})
	}

	async deleteByUser(server, user) {
		return new Promise(async (res, rej) => {
			try {
				var responses = await this.getByUser(server, user);
				if(!responses?.[0]) return res();
				await this.db.get(`DELETE FROM responses WHERE server_id = ? AND user_id = ?`, [server, user]);
				for(var response of responses) super.delete(`${server}-${response.hid}`);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			res();
		})
	}

	async deleteByForm(server, form) {
		return new Promise(async (res, rej) => {
			try {
				var responses = await this.getByForm(server, form);
				if(!responses?.[0]) return res();
				await this.db.get(`DELETE FROM responses WHERE server_id = ? AND form = ?`, [server, form]);
				for(var response of responses) {
					await this.bot.stores.responsePosts.deleteByResponse(server, response.hid);
					super.delete(`${server}-${response.hid}`);
				}
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			res();
		})
	}
}

module.exports = (bot, db) => new ResponseStore(bot, db);