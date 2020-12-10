const {Collection} = require("discord.js");
const axios = require('axios');
const EVENTS = require(__dirname + '/../extras.js').events;

class HookStore extends Collection {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	init() {
		// custom events
		EVENTS.forEach(e => {
			this.bot.on(e.toUpperCase(), async (response) => {
				var hooks = await this.getByForm(response.server_id, response.form);
				if(!hooks?.[0]) return;
				hooks = hooks.find(h => h.events.includes(e));
				if(!hooks[0]) return;

				for(var hook of hooks) {
					try {
						await this.bot.axios.post(hook.url, {
							action: e,
							response
						})
					} catch(e) {
						console.log(e.toString())
					}
				}
			})
		})
	}

	async create(server, form, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				var hid = this.bot.utils.genCode(this.bot.chars);
				await this.db.query(`INSERT INTO hooks (
					server_id,
					form,
					hid,
					url,
					events
				) VALUES ($1,$2,$3,$4,$5)`,
				[server, form, hid,
				 data.url, data.events]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res(await this.get(server, form, hid));
		})
	}

	async index(server, form, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				var hid = this.bot.utils.genCode(this.bot.chars);
				await this.db.query(`INSERT INTO hooks (
					server_id,
					form,
					hid,
					url,
					events
				) VALUES ($1,$2,$3,$4,$5)`,
				[server, form, hid,
				 data.url, data.events]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res();
		})
	}

	async get(server, form, hid, forceUpdate = false) {
		return new Promise(async (res, rej) => {
			if(!forceUpdate) {
				var hook = super.get(`${server}-${form}-${hid}`);
				if(hook) return res(hook);
			}
			
			try {
				var data = await this.db.query(`
					SELECT * FROM hooks
					WHERE server_id = $1
					AND form = $2
					AND hid = $3
				`,[server, form, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			if(data.rows && data.rows[0]) {
				this.set(`${server}-${form}-${hid}`, data.rows[0])
				res(data.rows[0])
			} else res(undefined);
		})
	}

	async getByForm(server, form, hid) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`
					SELECT * FROM hooks
					WHERE server_id = $1
					AND form = $2
				`,[server, form]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			if(data.rows && data.rows[0]) {
				res(data.rows)
			} else res(undefined);
		})
	}

	async update(server, form, hid, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`UPDATE hooks SET ${Object.keys(data).map((k, i) => k+"=$"+(i+4)).join(",")} WHERE server_id = $1 AND form = $2 AND hid = $3`,[server, form, hid, ...Object.values(data)]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			res(await this.get(`${server}-${form}-${hid}`, true));
		})
	}

	async delete(server, form, hid) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`
					DELETE FROM hooks
					WHERE server_id = $1
					AND form = $2
					AND hid = $3
				`, [server, form, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			super.delete(`${server}-${form}-${hid}`);
			res();
		})
	}

	async deleteByForm(server, form) {
		return new Promise(async (res, rej) => {
			try {
				var hooks = await this.getByForm(server, form);
				if(!hooks?.[0]) return res();
				await this.db.query(`
					DELETE FROM hooks
					WHERE server_id = $1
					AND form = $2
				`, [server, form]);
				for(var hook of hooks)
					super.delete(`${server}-${form}-${hook.hid}`);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			res();
		})
	}
}

module.exports = (bot, db) => new HookStore(bot, db);