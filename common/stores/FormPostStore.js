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
	}

	async create(server, channel, message, data = {}) {
		return new Promise(async (res, rej) => {
			try {
				await this.db.query(`INSERT INTO form_posts (
					server_id,
					channel_id,
					message_id,
					form
				) VALUES ($1,$2,$3,$4)`,
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
				await this.db.query(`INSERT INTO form_posts (
					server_id,
					channel_id,
					message_id,
					response
				) VALUES ($1,$2,$3,$4)`,
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
				var data = await this.db.query(`
					SELECT * FROM form_posts WHERE
					server_id = $1
					AND channel_id = $2
					AND message_id = $3
				`, [server, channel, message]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}
			
			if(data.rows && data.rows[0]) {
				var guild = this.bot.guilds.resolve(server);
				if(!guild) return rej("Couldn't get guild!");
				var channel = guild.channels.resolve(channel);
				var msg = channel?.messages.fetch(message);
				if(!channel || !msg) {
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

	async getByForm(server, hid) {
		return new Promise(async (res, rej) => {
			try {
				var data = await this.db.query(`SELECT * FROM form_posts WHERE server_id = $1 AND form = $2`,[server, hid]);
			} catch(e) {
				console.log(e);
				return rej(e.message);
			}

			var guild = this.bot.guilds.resolve(server);
			if(!guild) return rej("Couldn't get guild!");
			
			if(data.rows && data.rows[0]) {
				for(var i = 0; i < data.rows.length; i++) {
					var channel = guild.channels.resolve(channel);
					var msg = channel?.messages.fetch(message);
					if(!channel || !msg) {
						await this.delete(server, data.rows[i].channel, data.rows[i].message);
						data.rows[i] = "deleted";
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
								value: q
							}
						}),
						color: parseInt(post.form.color || 'ee8833', 16)
					}})
					var message = await user.send({embed: {
						title: post.form.name,
						description: post.form.description,
						fields: [{name: `Question 1${post.form.required?.includes(1) ? ' (required)' : ''}`, value: post.form.questions[0]}],
						color: parseInt(post.form.color || 'ee8833', 16),
						footer: {text: [
		                    'react with ✅ to finish early; ',
		                    'react with ❌ to cancel; ',
		                    'react with ➡️ to skip this question! ',
		                    'respective text keywords: submit, cancel, skip'
		                ].join("")}
					}});

					['✅','❌','➡️'].forEach(r => message.react(r));
					await this.bot.stores.openResponses.create(msg.guild.id, message.channel.id, message.id, {
						user_id: user.id,
						form: post.form.hid
					})
				} catch(e) {
					console.log(e);
					if(e.message) {
						var cfg = await this.bot.stores.configs.get(msg.guild.id);
						var channel = msg.guild.channels.find(c => form.channel_id ? c.id == form.channel_id : c.id == cfg.response_channel);
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