const {Collection} = require("discord.js");

class FormPostStore extends Collection {
	constructor(bot, db) {
		super();

		this.db = db;
		this.bot = bot;
	};

	async init() {
		this.bot.on('messageReactionAdd', async (...args) => {
			try {
				this.handleReactions(...args);
			} catch(e) {
				console.log(e.message || e);
			}
		})

		this.bot.on('messageDelete', async ({guild, channel, id}) => {
			try {
				await this.delete(channel.guild.id, channel.id, id);
			} catch(e) {
				console.log(e.message || e);
			}
		})

		this.bot.on('interactionCreate', (...args) => {
			try {
				this.handleInteractions(...args);
			} catch(e) {
				console.log(e.message || e);
			}
		})
	}

	async create(server, channel, message, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO form_posts (
					server_id,
					channel_id,
					message_id,
					form,
					bound
				) VALUES ($1,$2,$3,$4,$5)`,
				[server, channel, message, data.form, data.bound || false]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res(await this.get(server, channel, message));
		})
	}

	async index(server, channel, message, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO form_posts (
					server_id,
					channel_id,
					message_id,
					form,
					bound
				) VALUES ($1,$2,$3,$4,$5)`,
				[server, channel, message, data.form, data.bound || false]);
			} catch(e) {
				console.log(e);
		 		return rej(e.message);
			}
			
			res();
		})
	}

	async get(server, channel, message, forceUpdate = false) {
		return new Promise(async (res, rej) => {
			if(!forceUpdate) {
				var post = super.get(`${server}-${channel}-${message}`);
				if(post) return res(post);
			}
			
			try {
				var data = await this.db.query(`
					SELECT * FROM form_posts WHERE
					server_id = $1
					AND channel_id = $2
					AND message_id = $3
					AND bound = FALSE
				`, [server, channel, message]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			if(data.rows && data.rows[0]) {
				var guild = this.bot.guilds.resolve(server);
				if(!guild) return rej("Couldn't get guild!");
				guild = await guild.fetch();
				try {
					var chan = guild.channels.resolve(data.rows[0].channel_id);
					var msg = chan?.messages.fetch(message);
				} catch(e) { }
				if(!chan || !msg) {
					await this.delete(server, channel, message);
					return res(undefined);
				}

				var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
				if(form) data.rows[0].form = form;
				this.set(`${server}-${channel}-${message}`, data.rows[0])
				res(data.rows[0])
			} else res(undefined);
		})
	}

	// async getByEmoji(server, message, emoji) {
		// return new Promise(async (res, rej) => {
			// try {
				// var data = await this.db.query(`
					// SELECT * FROM form_posts WHERE
					// server_id = $1
					// AND message_id = $2
					// AND emoji = $3
				// `, [server, message, emoji]);
			// } catch(e) {
				// console.log(e);
				// return rej(e.message);
			// }
//
			// if(data.rows && data.rows[0]) {
				// var guild = this.bot.guilds.resolve(server);
				// if(!guild) return rej("Couldn't get guild!");
				// guild = await guild.fetch();
				// var chan = guild.channels.resolve(data.rows[0].channel_id);
				// var msg = chan?.messages.fetch(message);
				// if(!chan || !msg) {
					// await this.delete(server, data.rows[0].channel_id, message);
					// return res(undefined);
				// }
//
				// var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
				// if(form) data.rows[0].form = form;
				// res(data.rows[0]);
			// } else res(undefined);
		// })
	// }

	async getBound(server, message, hid) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`
					SELECT * FROM form_posts WHERE
					server_id = $1
					AND message_id = $2
					AND form = $3
					AND bound = TRUE
				`, [server, message, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			if(data.rows && data.rows[0]) {
				var guild = this.bot.guilds.resolve(server);
				if(!guild) return rej("Couldn't get guild!");
				guild = await guild.fetch();
				try {
					var chan = guild.channels.resolve(data.rows[0].channel_id);
					var msg = chan?.messages.fetch(message);
				} catch(e) { }
				if(!chan || !msg) {
					await this.delete(server, data.rows[0].channel_id, message);
					return res(undefined);
				}

				var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
				if(form) data.rows[0].form = form;
				res(data.rows[0])
			} else res(undefined);
		})
	}

	async getByForm(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`
					SELECT * FROM form_posts WHERE
					server_id = $1
					AND form = $2
				`,[server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			var guild = this.bot.guilds.resolve(server);
			if(!guild) return rej("Couldn't get guild!");
			guild = await guild.fetch();
			
			if(data.rows && data.rows[0]) {
				for(var i = 0; i < data.rows.length; i++) {
					try {
						var chan = guild.channels.resolve(data.rows[i].channel_id);
						var msg = chan?.messages.fetch(data.rows[i].message_id);
					} catch(e) { }
					if(!chan || !msg) {
						await this.delete(server, data.rows[i].channel_id, data.rows[i].message_id);
						data.rows[i] = 'deleted';
						continue;
					}

					var form = await this.bot.stores.forms.get(data.rows[i].server_id, data.rows[i].form);
					if(form) data.rows[i].form = form;
				}
				res(data.rows.filter(x => x != 'deleted'))
			} else res(undefined);
		})
	}

	async getBoundByForm(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`
					SELECT * FROM form_posts WHERE
					server_id = $1
					AND form = $2
					AND bound = TRUE
				`,[server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			var guild = this.bot.guilds.resolve(server);
			if(!guild) return rej("Couldn't get guild!");
			guild = await guild.fetch();
			
			if(data.rows && data.rows[0]) {
				for(var i = 0; i < data.rows.length; i++) {
					try {
						var chan = guild.channels.resolve(data.rows[i].channel_id);
						var msg = chan?.messages.fetch(data.rows[i].message_id);
					} catch(e) { }
					if(!chan || !msg) {
						await this.delete(server, data.rows[i].channel_id, data.rows[i].message_id);
						data.rows[i] = 'deleted';
						continue;
					}

					var form = await this.bot.stores.forms.get(data.rows[i].server_id, data.rows[i].form);
					if(form) data.rows[i].form = form;
				}
				res(data.rows.filter(x => x != 'deleted'))
			} else res(undefined);
		})
	}

	async getByMessage(server, message) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`
					SELECT * FROM form_posts WHERE
					server_id = $1
					AND message_id = $2
				`,[server, message]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			var guild = this.bot.guilds.resolve(server);
			if(!guild) return rej("Couldn't get guild!");
			guild = await guild.fetch();
			
			if(data.rows && data.rows[0]) {
				for(var i = 0; i < data.rows.length; i++) {
					try {
						var chan = guild.channels.resolve(data.rows[i].channel_id);
						var msg = chan?.messages.fetch(data.rows[i].message_id);
					} catch(e) { }
					if(!chan || !msg) {
						await this.delete(server, data.rows[i].channel_id, data.rows[i].message_id);
						data.rows[i] = 'deleted';
						continue;
					}

					var form = await this.bot.stores.forms.get(data.rows[i].server_id, data.rows[i].form);
					if(form) data.rows[i].form = form;
				}
				res(data.rows.filter(x => x != 'deleted'))
			} else res(undefined);
		})
	}

	async update(server, channel, message, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`
					UPDATE form_posts SET
					${Object.keys(data).map((k, i) => k+"=$"+(i+4)).join(",")}
					WHERE server_id = $1
					AND channel_id = $2
					AND message_id = $3
				`, [server, channel, message, ...Object.values(data)]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			res(await this.get(server, channel, message, true));
		})
	}

	async delete(server, channel, message) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`
					DELETE FROM form_posts
					WHERE server_id = $1
					AND channel_id = $2
					AND message_id = $3
				`, [server, channel, message]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			super.delete(`${server}-${channel}-${message}`);
			res();
		})
	}

	async deleteByForm(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				var posts = await this.getByForm(server, hid);
				if(!posts?.[0]) return res();
				await this.db.query(`
					DELETE FROM form_posts
					WHERE server_id = $1
					AND form = $2
				`, [server, hid]);
				if(posts)
					for(var post of posts)
						super.delete(`${server}-${post.channel_id}-${post.message_id}`);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			res();
		})
	}

	async handleReactions(reaction, user) {
		if(this.bot.user.id == user.id) return;
		if(user.bot) return;

		var msg;
		if(reaction.message.partial) msg = await reaction.message.fetch();
		else msg = reaction.message;
		if(!msg.channel.guild) return;

		var posts = await this.getByMessage(msg.channel.guild.id, msg.id);
		if(!posts?.[0]) return;
		var post = posts.find(p => (p.form.emoji || '📝') == (reaction.emoji.id ? reaction.emoji.identifier : reaction.emoji.name));
		if(!post) return;

		var cfg = await this.bot.stores.configs.get(msg.channel.guild.id);
		if(cfg?.reacts || post.form.reacts) await reaction.users.remove(user.id);
		if(!post.form.open) return;

		var resp = await this.bot.handlers.response.startResponse({
			user,
			form: post.form,
			cfg
		})

		if(!resp.includes('started')) return await user.send(resp);
	}

	async handleInteractions(intr) {
		if(!intr.isButton()) return;
		if(!intr.inGuild()) return;
		var { user, message: msg, component: button } = intr;

		var posts = await this.getByMessage(intr.guildId, msg.id);
		if(!posts?.[0]) return;
		var id = button.customId.split('-')[0];
		var post = posts.find(p => p.form.hid == id);
		if(!post) return;

		var cfg = await this.bot.stores.configs.get(intr.guildId);
		if(!post.form.open) return;

		if(!post.form.channel_id && !cfg?.response_channel)
			return await user.send('No response channel set for that form! Ask the mods to set one first!');

		var resp = await this.bot.handlers.response.startResponse({
			user,
			form: post.form,
			cfg
		})

		await intr.reply({content: resp, ephemeral: true});
	}
}

module.exports = (bot, db) => new FormPostStore(bot, db);
