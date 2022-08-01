const { Models: { DataStore, DataObject } } = require('frame');

const KEYS = {
	id: { },
	server_id: { },
	channel_id: { },
	message_id: { },
	form: { },
	bound: { }
}

class FormPost extends DataObject {
	constructor(store, keys, data) {
		super(store, keys, data);
	}
}

class FormPostStore extends DataStore {
	constructor(bot, db) {
		super(bot, db);
	}

	async init() {		
		this.bot.on('messageReactionAdd', async (...args) => {
			try {
				this.handleReactions(...args);
			} catch(e) {
				console.log(e.message || e);
			}
		})

		this.bot.on('messageDelete', async ({channel, id}) => {
			try {
				await this.deleteByMessage(channel.guild.id, id);
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

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO form_posts (
				server_id,
				channel_id,
				message_id,
				form,
				bound
			) VALUES ($1,$2,$3,$4,$5)
			RETURNING id`,
			[data.server_id, data.channel_id, data.message_id, data.form, data.bound || false]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(server, channel, message, data = {}) {
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
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server, message) {
		try {
			var data = await this.db.query(`
				SELECT * FROM form_posts WHERE
				server_id = $1
				AND message_id = $2
				AND bound = FALSE
			`, [server, message]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			var guild = this.bot.guilds.resolve(server);
			if(!guild) return Promise.reject("Couldn't get guild!");
			guild = await guild.fetch();
			try {
				var chan = await guild.channels.fetch(data.rows[0].channel_id);
				var msg = await chan?.messages.fetch(message);
			} catch(e) { }
			if(!chan || !msg) {
				await this.delete(data.rows[0].id);
				return new FormPost(this, { server_id: server, message_id: message, bound: false });
			}

			var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
			if(form) data.rows[0].form = form;
			return new FormPost(this, KEYS, data.rows[0]);
		} else return new FormPost(this, KEYS, { server_id: server, message_id: message, bound: false });
	}

	async getBound(server, message, hid) {
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
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			var guild = this.bot.guilds.resolve(server);
			if(!guild) return Promise.reject("Couldn't get guild!");
			guild = await guild.fetch();
			try {
				var chan = await guild.channels.fetch(data.rows[0].channel_id);
				var msg = await chan?.messages.fetch(message);
			} catch(e) { }
			if(!chan || !msg) {
				await this.delete(data.rows[0].id);
				return new FormPost(this, { server_id: server, message_id: message, form: hid, bound: true });
			}

			var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
			if(form) data.rows[0].form = form;
			return new FormPost(this, KEYS, data.rows[0])
		} else return new FormPost(this, KEYS, { server_id: server, message_id: message, form: hid, bound: true });
	}

	async getByMessage(server, message) {
		try {
			var data = await this.db.query(`
				SELECT * FROM form_posts WHERE
				server_id = $1
				AND message_id = $2
			`,[server, message]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		var guild = this.bot.guilds.resolve(server);
		if(!guild) return Promise.reject("Couldn't get guild!");
		guild = await guild.fetch();
		
		if(data.rows?.[0]) {
			for(var i = 0; i < data.rows.length; i++) {
				var form = await this.bot.stores.forms.get(data.rows[i].server_id, data.rows[i].form);
				if(form) data.rows[i].form = form;
			}
			
			return data.rows.map(x => new FormPost(this, KEYS, x));
		} else return undefined;
	}

	async getByForm(server, form) {
		try {
			var data = await this.db.query(`
				SELECT * FROM form_posts WHERE
				server_id = $1
				AND form = $2
			`,[server, form]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		var form = await this.bot.stores.forms.get(server, form);
		if(data.rows?.[0]) {

			return data.rows.map(x => {
				var f = new FormPost(this, KEYS, x);
				f.form = form;
				return f;
			});
		} else return undefined;
	}

	async getID(id) {
		try {
			var data = await this.db.query(`
				SELECT * FROM form_posts WHERE
				id = $1
			`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(data.rows?.[0]) {
			var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
			if(form) data.rows[0].form = form;
			return new FormPost(this, KEYS, data.rows[0]);
		} else return new FormPost(this, KEYS, {});
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`
				UPDATE form_posts SET
				${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")}
				WHERE id = $1
			`, [id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`
				DELETE FROM form_posts
				WHERE id = $1
			`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteByMessage(server, message) {
		try {
			await this.db.query(`
				DELETE FROM form_posts
				WHERE server_id = $1 AND
				message_id = $2
			`, [server, message]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
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
		var post = posts.find(p => (p.form.emoji ?? '📝') == (reaction.emoji.id ? reaction.emoji.identifier : reaction.emoji.name));
		if(!post) return;

		var cfg = await this.bot.stores.configs.get(msg.channel.guild.id);
		if(cfg?.reacts || post.form.reacts) await reaction.users.remove(user.id);
		if(!post.form.open) return await user.send("That form isn't accepting responses!");

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

		var post = await this.get(intr.guildId, msg.id); // no reason to get all on the message, only unbound matters
		if(!post?.id) return;
		var id = button.customId.split('-')[0];
		if(!post.form.hid == id) return;
		if(!post.form.open) return await intr.reply({
			content: "That form isn't accepting responses!",
			ephemeral: true
		});

		var cfg = await this.bot.stores.configs.get(intr.guildId);

		if(!post.form.channel_id && !cfg?.response_channel)
			return await intr.reply({
				content: 'No response channel set for that form! Ask the mods to set one first!',
				ephemeral: true
			});

		var resp = await this.bot.handlers.response.startResponse({
			user,
			form: post.form,
			cfg
		})

		await intr.reply({content: resp, ephemeral: true});
	}
}

module.exports = (bot, db) => new FormPostStore(bot, db);
