const {Collection} = require("discord.js");

class FormStore extends Collection {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	async create(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.get(`INSERT INTO forms (
					server_id,
					hid,
					name,
					description,
					questions,
					channel_id,
					roles,
					message,
					color,
					open
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[server, hid, data.name, data.description,
				 JSON.stringify(data.questions || []),
				 data.channel_id, data.roles || [],
				 data.message, data.color, data.open || true]);
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
				await this.db.get(`INSERT INTO forms (
					server_id,
					hid,
					name,
					description,
					questions,
					channel_id,
					roles,
					message,
					color,
					open
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[server, hid, data.name, data.description,
				 JSON.stringify(data.questions || []),
				 data.channel_id, data.roles || [],
				 data.message, data.color, data.open || true]);
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
				var form = super.get(`${server}-${hid}`);
				if(form) return res(form);
			}
			
			try {
				var data = await this.db.get(`SELECT * FROM forms WHERE server_id = ? AND hid = ?`, [server, hid], {
					id: Number,
					server_id: String,
					hid: String,
					name: String,
					description: String,
					questions: JSON.parse,
					channel_id: String,
					roles: JSON.parse,
					message: String,
					color: String,
					open: Boolean
				});
				console.log(data)
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data && data[0]) {
				console.log(data)
				var form = data[0];
				if(form.questions.find(q => q == "")) {
					form.questions = form.questions.filter(x => x != "");
					form = await this.update(server, hid, {questions: form.questions});
				}
				this.set(`${server}-${hid}`, form)
				res(data[0])
			} else res(undefined);
		})
	}

	async getAll(server) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.get(`SELECT * FROM forms WHERE server_id = ?`, [server], {
					id: Number,
					server_id: String,
					hid: String,
					name: String,
					description: String,
					questions: JSON.parse,
					channel_id: String,
					roles: JSON.parse,
					message: String,
					color: String,
					open: Boolean
				});
				console.log(data)
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data && data[0]) {
				res(data)
			} else res(undefined);
		})
	}

	async getByHids(server, ids) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.get(`SELECT * FROM forms WHERE server_id = ? AND hid IN (?)`, [server, ids], {
					id: Number,
					server_id: String,
					hid: String,
					name: String,
					description: String,
					questions: JSON.parse,
					channel_id: String,
					roles: JSON.parse,
					message: String,
					color: String,
					open: Boolean
				});
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data && data[0]) {
				res(data)
			} else res(undefined);
		})
	}

	async update(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			if(data.questions) data.questions = JSON.stringify(data.questions);
			try {
				await this.db.get(`UPDATE forms SET ${Object.keys(data).map((k, i) => k+"=?").join(",")} WHERE server_id = ? AND hid = ?`,[...Object.values(data), server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			var form = await this.get(server, hid, true);
			if(!form) return res(undefined); //that's just silly
			var responses = await this.bot.stores.responses.getByForm(server, hid);

			var errs = [];
			if(['name', 'description', 'open', 'color'].find(x => Object.keys(data).includes(x))) {
				var posts = await this.bot.stores.formPosts.getByForm(server, hid);
				var guild = this.bot.guilds.resolve(server);
				if(posts) {
					for(var post of posts) {
						try {
							var chan = guild.channels.resolve(post.channel_id);
							var msg = await chan.messages.fetch(post.message_id);
							if(!msg) {
								await this.bot.stores.formPosts.delete(server, post.channel_id, post.message_id);
								errs.push(`Channel: ${chan.name} (${chan.id})\nMessage: ${post.message_id}\nErr: Message missing!`);
								continue;
							}

							await msg.edit({embed: {
								title: form.name,
								description: form.description,
								color: parseInt(!form.open ? 'aa5555' : form.color || '55aa55', 16),
								fields: [{name: 'Response Count', value: responses?.length || 0}],
								footer: {
									text: `Form ID: ${form.hid} | ` +
										  (!form.open ?
										  'this form is not accepting responses right now!' :
										  'react below to apply to this form!')
								}
							}})
						} catch(e) {
							errs.push(`Channel: ${chan.name} (${chan.id})\nMessage: ${post.message_id}\nErr: ${e.message || e}`);
						}
					}
				}
			}

			if(errs[0]) rej(errs.join('\n\n'));
			else res(form);
		})
	}

	async updateCount(server, hid) {
		return new Promise(async (res, rej) => {
			var form = await this.get(server, hid);
			if(!form) return res(undefined); //that's just silly

			var errs = [];
			var responses = await this.bot.stores.responses.getByForm(server, hid);
			var posts = await this.bot.stores.formPosts.getByForm(server, hid);
			var guild = this.bot.guilds.resolve(server);
			if(posts) {
				for(var post of posts) {
					try {
						var chan = guild.channels.resolve(post.channel_id);
						var msg = await chan.messages.fetch(post.message_id);
						if(!msg) {
							await this.bot.stores.formPosts.delete(server, post.channel_id, post.message_id);
							return rej('Message missing!');
						}

						await msg.edit({embed: {
							title: form.name,
							description: form.description,
							color: parseInt(!form.open ? 'aa5555' : form.color || '55aa55', 16),
							fields: [{name: 'Response Count', value: responses?.length || 0}],
							footer: {
								text: `Form ID: ${form.hid} | ` +
									  (!form.open ?
									  'this form is not accepting responses right now!' :
									  'react below to apply to this form!')
							}
						}})
					} catch(e) {
						errs.push(`Channel: ${chan.name} (${chan.id})\nErr: ${e.message || e}`);
					}
				}
			}

			if(errs.length > 0) rej(errs);
			else res(await this.get(server, hid, true));
		})
	}

	async delete(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.get(`DELETE FROM forms WHERE server_id = ? AND hid = ?`, [server, hid]);
				await this.bot.stores.formPosts.deleteByForm(server, hid);
				await this.bot.stores.openResponses.deleteByForm(server, hid);
				await this.bot.stores.responses.deleteByForm(server, hid);
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
				var forms = await this.getAll(server);
				if(!forms?.[0]) return res();
				for(var form of forms) await this.delete(server, form.hid);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			res();
		})
	}

	async deleteByHids(server, ids) {
		return new Promise(async (res, rej) => {
			try {
				var forms = await this.getByHids(server, ids);
				if(!forms?.[0]) return res();
				for(var form of forms) await this.delete(server, form.hid);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			res();
		})
	}

	async export(server, ids) {
		return new Promise(async (res, rej) => {
			try {
				var forms = await this.getAll(server);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			if(!forms?.[0]) return res();
			if(ids?.[0]) forms = forms.filter(f => ids.includes(f.hid));
			
			res(forms.map(f => {
				delete f.id;
				delete f.server_id;
				delete f.channel_id;
				return f;
			}));
		})
	}

	async import(server, data = []) {
		return new Promise(async (res, rej) => {
			try {
				var forms = await this.getAll(server);
				var updated = 0, created = 0;
				for(var form of data) {
					if(forms && forms.find(f => f.hid == form.hid)) {
						await this.update(server, form.hid, form);
						updated++;
					} else {
						await this.create(server, this.bot.utils.genCode(this.bot.chars), form);
						created++;
					}
				}
			} catch(e) {
				return rej(e);
			}

			return res({updated, created, forms: await this.getAll(server)});
		})
	}
}

module.exports = (bot, db) => new FormStore(bot, db);