const {Collection} = require("discord.js");

class ResponseStore extends Collection {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	async create(server, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				var resp = await this.db.query(`INSERT INTO responses (
					server_id,
					hid,
					user_id,
					form,
					questions,
					answers,
					status,
					received
				) VALUES ($1,find_unique('responses'),$2,$3,$4,$5,$6,$7)
				RETURNING *`,
				[server, data.user_id, data.form, data.questions || [],
				data.answers || [], data.status || 'pending', data.received || new Date()]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res(await this.get(server, resp.rows[0].hid));
		})
	}

	async index(server, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO responses (
					server_id,
					hid,
					user_id,
					form,
					questions,
					answers,
					status,
					received
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				[server, data.hid, data.user_id, data.form, data.questions || [],
				data.answers || [], data.status || 'pending', data.received || new Date()]);
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
				var data = await this.db.query(`SELECT * FROM responses WHERE server_id = $1 AND hid = $2`,[server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
				if(form) data.rows[0].form = form;
				res(data.rows[0])
			} else res(undefined);
		})
	}

	async getAll(server) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM responses WHERE server_id = $1`,[server]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				for(var i = 0; i < data.rows.length; i++) {
					var form = await this.bot.stores.forms.get(data.rows[i].server_id, data.rows[i].form);
					if(form) data.rows[i].form = form;
				}
				res(data.rows)
			} else res(undefined);
		})
	}

	async getByUser(server, user) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM responses WHERE server_id = $1 AND user_id = $2`,[server, user]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				for(var i = 0; i < data.rows.length; i++) {
					var form = await this.bot.stores.forms.get(data.rows[i].server_id, data.rows[i].form);
					if(form) data.rows[i].form = form;
				}
				res(data.rows)
			} else res(undefined);
		})
	}

	async getByForm(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM responses WHERE server_id = $1 AND form = $2`,[server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				var form = await this.bot.stores.forms.get(server, hid);
                for(var i = 0; i < data.rows.length; i++) {
                    if(form) data.rows[i].form = form;
                }
                
				res(data.rows)
			} else res(undefined);
		})
	}

	async getByForms(server, ids) {
		try {
			var data;
			if(ids) {
				data = await this.db.query(`
					SELECT * FROM responses
					WHERE server_id = $1
					AND form = ANY($2)
				`, [server, ids]);
			} else {
				data = await this.db.query(`
					SELECT * FROM responses
					WHERE server_id = $1
				`, [server]);
			}
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(!data?.rows?.length) return undefined;
		
		var d = {};
		for(var r of data.rows) {
			var {
				form: f,
				id,
				server_id,
				questions,
				answers,
				...rest
			} = r;
			if(!d[f]) d[f] = [];
			
			var ans = [];
			for(var i = 0; i < questions.length; i++) {
				ans.push({
					question: questions[i],
					answer: answers[i]
				})
			}
			rest.answers = ans;
			d[f].push(rest)
		}

		return d;
	}

	async update(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`UPDATE responses SET ${Object.keys(data).map((k, i) => k+"=$"+(i+3)).join(",")} WHERE server_id = $1 AND hid = $2`,[server, hid, ...Object.values(data)]);
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
				await this.db.query(`DELETE FROM responses WHERE server_id = $1 AND hid = $2`, [server, hid]);
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
				await this.db.query(`DELETE FROM responses WHERE server_id = $1`, [server]);
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
				await this.db.query(`DELETE FROM responses WHERE server_id = $1 AND user_id = $2`, [server, user]);
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
				await this.db.query(`DELETE FROM responses WHERE server_id = $1 AND form = $2`, [server, form]);
				for(var response of responses) {
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