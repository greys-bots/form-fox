const { Collection } = require("discord.js");
const { qTypes: TYPES } = require('../extras');

class FormStore extends Collection {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	async create(server, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				var form = await this.db.query(`INSERT INTO forms (
					server_id,
					hid,
					name,
					description,
					questions,
					channel_id,
					roles,
					message,
					color,
					open,
					cooldown,
					emoji,
					reacts,
					embed,
					apply_channel,
					tickets_id,
					ticket_msg
				) VALUES ($1,find_unique('forms'),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
				RETURNING *`,
				[server, data.name, data.description,
				 JSON.stringify(data.questions || []),
				 data.channel_id, JSON.stringify(data.roles || []),
				 data.message, data.color, data.open || true,
				 data.cooldown, data.emoji, data.reacts,
				 data.embed, data.apply_channel, data.tickets_id,
				 data.ticket_msg]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}

			res(await this.get(server, form.rows[0].hid));
		})
	}

	async index(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO forms (
					server_id,
					hid,
					name,
					description,
					questions,
					channel_id,
					roles,
					message,
					color,
					open,
					cooldown,
					emoji,
					reacts,
					embed,
					apply_channel,
					tickets_id,
					ticket_msg
				) VALUES ($1,find_unique('forms'),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
				RETURNING *`,
				[server, data.name, data.description,
				 JSON.stringify(data.questions || []),
				 data.channel_id, JSON.stringify(data.roles || []),
				 data.message, data.color, data.open || true,
				 data.cooldown, data.emoji, data.reacts,
				 data.embed, data.apply_channel, data.tickets_id,
				 data.ticket_msg]);
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
				var data = await this.db.query(`SELECT * FROM forms WHERE server_id = $1 AND hid = $2`,[server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				var form = data.rows[0];
				var qs = [];
				for(var q of form.questions) {
					if(!q.value) continue; // filter emptt qs
					if(q.choices) {
						q.choices = q.choices.filter(x => x); // filter empty choices
					}

					qs.push(q);
				}

				form = await this.update(server, hid, {questions: qs});
				this.set(`${server}-${hid}`, form)
				res(data.rows[0])
			} else res(undefined);
		})
	}

	// async getByEmoji(server, emoji) {
		// return new Promise(async (res, rej) => {
			// try {
				// var data = await this.db.query(`SELECT * FROM forms WHERE server_id = $1 AND emoji = $2`,[server, emoji]);
			// } catch(e) {
				// console.log(e);
				// return rej(e.message);
			// }
			// 
			// if(data.rows && data.rows[0]) {
				// var form = data.rows[0];
				// if(form.questions.find(q => q == "")) {
					// form.questions = form.questions.filter(x => x != "");
					// form = await this.update(server, hid, {questions: form.questions});
				// }
				// res(data.rows[0])
			// } else res(undefined);
		// })
	// }

	async getAll(server) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM forms WHERE server_id = $1`,[server]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				res(data.rows)
			} else res(undefined);
		})
	}

	async getByHids(server, ids) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM forms WHERE server_id = $1 AND hid = ANY($2)`,[server, ids]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				res(data.rows)
			} else res(undefined);
		})
	}

	async getByApplyChannel(server, channel) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM forms WHERE server_id = $1 AND apply_channel = $2`,
					[server, channel]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			if(data.rows?.[0]) res(data.rows[0]);
			else res(undefined);
		})
	}

	async update(server, hid, data = {}) {
		return new Promise(async (res, rej) => {
			if(data.questions) data.questions = JSON.stringify(data.questions);
			try {
				var old = await this.get(server, hid);
				await this.db.query(`UPDATE forms SET ${Object.keys(data).map((k, i) => k+"=$"+(i+3)).join(",")} WHERE server_id = $1 AND hid = $2`,[server, hid, ...Object.values(data)]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			var form = await this.get(server, hid, true);
			if(!form) return res(undefined); //that's just silly
			var responses = await this.bot.stores.responses.getByForm(server, hid);
			var posts = await this.bot.stores.formPosts.getByForm(server, hid);

			var errs = [];
			if(['name', 'description', 'open', 'color', 'emoji'].find(x => Object.keys(data).includes(x))) {
				var guild = this.bot.guilds.resolve(server);
				if(posts) {
					for(var post of posts) {
						try {
							try {
								var chan = guild.channels.resolve(post.channel_id);
								var msg = await chan.messages.fetch(post.message_id);
							} catch(e) { }
							if(!msg) {
								await this.bot.stores.formPosts.delete(server, post.channel_id, post.message_id);
								errs.push(`Channel: ${chan.name} (${chan.id})\nMessage: ${post.message_id}\nErr: Message missing!`);
								continue;
							}

							if(Object.keys(data).includes('emoji')) {
								var react = msg.reactions.cache.find(r => [r.emoji.name, r.emoji.identifier].includes(old.emoji || '📝'));
								if(react) react.remove();
								msg.react(data.emoji || '📝');
							}

							if(post.bound) continue;

							await msg.edit({embeds: [{
								title: form.name,
								description: form.description,
								color: parseInt(!form.open ? 'aa5555' : form.color || '55aa55', 16),
								fields: [{name: 'Response Count', value: responses?.length.toString() || '0'}],
								footer: {
									text: `Form ID: ${form.hid} | ` +
										  (!form.open ?
										  'this form is not accepting responses right now!' :
										  'react below to apply to this form!')
								}
							}]})
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
					if(post.bound) continue;
					
					try {
						var chan = guild.channels.resolve(post.channel_id);
						var msg = await chan.messages.fetch(post.message_id);
						if(!msg) {
							await this.bot.stores.formPosts.delete(server, post.channel_id, post.message_id);
							return rej('Message missing!');
						}

						await msg.edit({embeds: [{
							title: form.name,
							description: form.description,
							color: parseInt(!form.open ? 'aa5555' : form.color || '55aa55', 16),
							fields: [{name: 'Response Count', value: responses?.length.toString() || '0'}],
							footer: {
								text: `Form ID: ${form.hid} | ` +
									  (!form.open ?
									  'this form is not accepting responses right now!' :
									  'react below to apply to this form!')
							}
						}]})
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
				await this.db.query(`DELETE FROM forms WHERE server_id = $1 AND hid = $2`, [server, hid]);
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

	async export(server, ids, resp = false) {
		return new Promise(async (res, rej) => {
			try {
				var forms = await this.getAll(server);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			var r;
			if(!forms?.length) return res();
			if(ids?.length) forms = forms.filter(f => ids.includes(f.hid));
			if(!forms?.length) return res();
			if(resp) r = await this.bot.stores.responses.getByForms(server, ids);
			
			for(var form of forms) {
				// remove server-specific data
				delete form.id;
				delete form.server_id;
				delete form.channel_id;
				delete form.roles;
				
				if(resp && r) form.responses = r[form.hid] ?? [];
				else form.responses = [];
			}
			
			res(forms);
		})
	}

	async import(server, data = []) {
		return new Promise(async (res, rej) => {
			try {
				var forms = await this.getAll(server);
				var updated = 0, created = 0, failed = [];
				for(var f of data) {
					var verify = this.verify(f);
					if(!verify.ok) {
						failed.push(`${f.name || f.hid || "(invalid form)"} - ${verify.reason}`);
						continue;
					}

					var {
						hid,
						server_id,
						channel_id,
						roles,
						responses,
						...form
					} = f;
					if(forms && forms.find(f => f.hid == form.hid || f.name == form.name)) {
						await this.update(server, form.hid, form);
						updated++;
					} else {
						await this.create(server, form);
						created++;
					}
				}
			} catch(e) {
				return rej(e);
			}

			return res({updated, created, failed, forms: await this.getAll(server)});
		})
	}

	verify(form) {
		if(!form.questions || form.questions.length == 0)
			return {ok: false, reason: "Questions must be present"};

		if(form.questions > 20)
			return {ok: false, reason: "Max of 20 questions per form"};

		if(form.questions.find(q => !q.value?.length))
			return {ok: false, reason: "Questions must have a value"};

		if(form.questions.find(q => q.value.length > 256))
			return {ok: false, reason: "Questions must be 256 characters or less"};

		if(form.questions.find(q => !TYPES[q.type]))
			return {ok: false, reason: "Questions must have a valid type"};

		if(!form.name)
			return {ok: false, reason: "Form must have a name"};

		if(form.description.length > 2048)
			return {ok: false, reason: "Description must be 2048 chars or less"};

		return {ok: true};
	}
}

module.exports = (bot, db) => new FormStore(bot, db);