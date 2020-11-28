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
				await this.delete(guild.id, channel.id, id);
			} catch(e) {
				console.log(e.message || e);
			}
		})
	}

	async create(server, channel, message, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.get(`INSERT INTO form_posts (
					server_id,
					channel_id,
					message_id,
					form
				) VALUES (?, ?, ?, ?)`,
				[server, channel, message, data.form]);
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
				await this.db.get(`INSERT INTO form_posts (
					server_id,
					channel_id,
					message_id,
					form
				) VALUES (?, ?, ?, ?)`,
				[server, channel, message, data.form]);
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
				var data = await this.db.get(`
					SELECT * FROM form_posts WHERE
					server_id = ?
					AND channel_id = ?
					AND message_id = ?
				`, [server, channel, message]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			if(data && data[0]) {
				var guild = this.bot.guilds.resolve(server);
				if(!guild) return rej("Couldn't get guild!");
				guild = await guild.fetch();
				var chan = guild.channels.resolve(channel);
				var msg = chan?.messages.fetch(message);
				if(!chan || !msg) {
					await this.delete(server, channel, message);
					return res(undefined);
				}

				var form = await this.bot.stores.forms.get(data[0].server_id, data[0].form);
				if(form) data[0].form = form;
				this.set(`${server}-${channel}-${message}`, data[0])
				res(data[0])
			} else res(undefined);
		})
	}

	async getByForm(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.get(`
					SELECT * FROM form_posts WHERE
					server_id = ?
					AND form = ?
				`, [server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			var guild = this.bot.guilds.resolve(server);
			if(!guild) return rej("Couldn't get guild!");
			guild = await guild.fetch();
			
			if(data && data[0]) {
				for(var i = 0; i < data.length; i++) {
					var chan = guild.channels.resolve(data[i].channel_id);
					var msg = chan?.messages.fetch(data[i].message_id);
					if(!chan || !msg) {
						await this.delete(server, data[i].channel_id, data[i].message_id);
						data[i] = 'deleted';
						continue;
					}

					var form = await this.bot.stores.forms.get(data[i].server_id, data[i].form);
					if(form) data[i].form = form;
				}
				res(data.filter(x => x != 'deleted'))
			} else res(undefined);
		})
	}

	async update(server, channel, message, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.get(`
					UPDATE form_posts SET
					${Object.keys(data).map((k, i) => k+"=?").join(",")}
					WHERE server_id = ?
					AND channel_id = ?
					AND message_id = ?
				`, [...Object.values(data), server, channel, message]);
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
				await this.db.get(`
					DELETE FROM form_posts
					WHERE server_id = ?
					AND channel_id = ?
					AND message_id = ?
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
				await this.db.get(`
					DELETE FROM form_posts
					WHERE server_id = ?
					AND form = ?`
				, [server, hid]);
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
		if(!['📝'].includes(reaction.emoji.name)) return;

		var msg;
		if(reaction.message.partial) msg = await reaction.message.fetch();
		else msg = reaction.message;
		if(!msg.guild) return;

		var post = await this.get(msg.guild.id, msg.channel.id, msg.id);
		if(!post) return;

		await reaction.users.remove(user.id);
		if(!post.form.open) return;

		var cfg = await this.bot.stores.configs.get(msg.guild.id);
		if(!post.form.channel_id && !cfg?.response_channel)
			return await user.send('No response channel set for that form! Ask the mods to set one first!');

		switch(reaction.emoji.name) {
			case '📝':
				try {
					var existing = await this.bot.stores.openResponses.get(user.dmChannel?.id);
					if(existing) return await user.send('Please finish your current form before starting a new one!');
					
					await user.send({embed: {
						title: post.form.name,
						description: post.form.description,
						fields: post.form.questions.map((q,i) => {
							return {
								name: `Question ${i+1}${post.form.required?.includes(i+1) ? " (required)" : ""}`,
								value: q.value
							}
						}),
						color: parseInt(post.form.color || 'ee8833', 16)
					}})

					var question = await this.bot.utils.handleQuestion(post.form, 0);
					var message = await user.send({embed: {
						title: post.form.name,
						description: post.form.description,
						fields: question.message,
						color: parseInt(post.form.color || 'ee8833', 16),
						footer: question.footer
					}});

					question.reacts.forEach(r => message.react(r));
					await this.bot.stores.openResponses.create(msg.guild.id, message.channel.id, message.id, {
						user_id: user.id,
						form: post.form.hid,
						questions: JSON.stringify(post.form.questions)
					})
				} catch(e) {
					console.log(e);
					if(e.message) {
						var channel = msg.guild.channels.resolve(post.form.channel_id || cfg.response_channel);
						return await channel.send('Err while starting response process: '+e.message);
					} else return await user.send('ERR! Couldn\'t start response process: '+e);
				}
				break;
			default:
				return;
				break;
		}
	}	
}

module.exports = (bot, db) => new FormPostStore(bot, db);
