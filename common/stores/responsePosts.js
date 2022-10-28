const { Models: { DataStore, DataObject } } = require('frame');
const {
	pageBtns: PGBTNS,
	denyBtns: DENY
} = require('../extras');

const VARIABLES = {
	'$USER': (user, guild) => user,
	'$GUILD': (user, guild) => guild.name,
	'$FORM': (user, guild, form) => form.name,
	'$FORMID': (user, guild, form) => form.hid,
}

const MODALS = {
	DENY: (value) => ({
		title: "Deny reason",
		custom_id: 'deny_reason',
		components: [{
			type: 1,
			components: [{
				type: 4,
				custom_id: 'reason',
				style: 2,
				label: "Enter the reason below",
				min_length: 1,
				max_length: 1024,
				required: true,
				placeholder: "Big meanie :(",
				value
			}]
		}]
	})
}

const KEYS = {
	id: { },
	server_id: { },
	channel: { },
	message_id: { },
	response: { },
	page: { patch: true }
}

class ResponsePost extends DataObject {
	constructor(store, keys, data) {
		super(store, keys, data)
	}
}

class ResponsePostStore extends DataStore {
	constructor(bot, db) {
		super(bot, db);
	}

	async init() {
		this.bot.on('interactionCreate', async (...args) => {
			try {
				this.handleInteractions(...args);
			} catch(e) {
				console.log(e.message || e);
			}
		})

		this.bot.on('messageDelete', async ({ channel, id }) => {
			if(!channel.guild) return;
			await this.deleteByMessage(channel.guild.id, channel.id, id);
		})
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO response_posts (
				server_id,
				channel_id,
				message_id,
				response,
				page
			) VALUES ($1,$2,$3,$4,$5)
			RETURNING id`,
			[data.server_id, data.channel_id, data.message_id, 
			 data.response, data.page ?? 1]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(server, channel, message, data = {}) {
		try {
			await this.db.query(`INSERT INTO response_posts (
				server_id,
				channel_id,
				message_id,
				response,
				page
			) VALUES ($1,$2,$3,$4,$5)`,
			[server, channel, message, data.response, data.page ?? 1]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server, channel, message) {
		try {
			var data = await this.db.query(`
				SELECT * FROM response_posts WHERE
				server_id = $1
				AND channel_id = $2
				AND message_id = $3
			`, [server, channel, message]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			var post = new ResponsePost(this, KEYS, data.rows[0]);
			var response = await this.bot.stores.responses.get(data.rows[0].server_id, data.rows[0].response);
			if(response) post.response = response;
			
			return post;
		} else return new ResponsePost(this, KEYS, { server_id: server, channel_id: channel, message_id: message });
	}

	async getByResponse(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM response_posts WHERE server_id = $1 AND response = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			var post = new ResponsePost(this, KEYS, data.rows[0]);
			var response = await this.bot.stores.responses.get(data.rows[0].server_id, data.rows[0].response);
			if(response) post.response = response;
			
			return post;
		} else return new ResponsePost(this, KEYS, { server_id: server, response: hid });
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`
				UPDATE response_posts SET
				${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")}
				WHERE id = $1
			`, [id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id)
	}

	async delete(id) {
		try {
			await this.db.query(`
				DELETE FROM response_posts
				WHERE id = $1
			`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteByMessage(server, channel, message) {
		try {
			await this.db.query(`
				DELETE FROM response_posts
				WHERE server_id = $1
				AND channel_id = $2
				AND message_id = $3
			`, [server, channel, message]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async handleInteractions(ctx) {
		if(!ctx.isButton()) return;
		if(!ctx.guild) return;

		var post = await this.get(ctx.channel.guild.id, ctx.channel.id, ctx.message.id);
		if(!post?.id) return;

		var {message: msg, user} = ctx;

		var cfg = await this.bot.stores.configs.get(ctx.guild.id);
		var check = await this.bot.handlers.interaction.checkPerms(
			{
				permissions: ['ManageMessages'],
				opPerms: ['MANAGE_RESPONSES']
			},
			ctx, cfg
		)
		if(!check) return;

		var u2 = await this.bot.users.fetch(post.response.user_id);
		if(!u2) return await msg.channel.send("ERR! Couldn't fetch that response's user!");

		var ticket = await this.bot.stores.tickets.get(msg.guild.id, post.response.hid);
		var cmp = msg.components;
		switch(ctx.customId) {
			case 'deny':
				await ctx.deferUpdate();
				var reason;
				var m = await msg.channel.send({
					embeds: [{
						title: 'Would you like to give a denial reason?'
					}],
					components: DENY(false)
				});

				var resp = await this.bot.utils.getChoice(this.bot, m, user, 2 * 60 * 1000, false);
				if(!resp.choice) return await ctx.followUp({content: 'Err! Nothing selected!', ephemeral: true});
				switch(resp.choice) {
					case 'cancel':
						await m.delete()
						return resp.interaction.reply({content: 'Action cancelled!', ephemeral: true});
					case 'reason':
						var mod = await this.bot.utils.awaitModal(resp.interaction, MODALS.DENY(reason), user, true, 5 * 60_000);
						if(mod) reason = mod.fields.getTextInputValue('reason')?.trim();
						await mod.followUp("Modal received!");
						await m.edit({
							embeds: [{
								title: 'Denial reason',
								description: reason
							}]
						})
						break;
					case 'skip':
						await m.edit({
							embeds: [{
								title: 'Denial reason',
								description: reason
							}]
						})
						break;
				}

				await m.delete()

				var embed = msg.embeds[0].toJSON();
				embed.color = parseInt('aa5555', 16);
				embed.footer = {text: 'Response denied!'};
				embed.timestamp = new Date().toISOString();
				embed.author = {
					name: `${user.username}#${user.discriminator}`,
					iconURL: user.avatarURL()
				}
				embed.description += `\n\nReason: ${reason ?? "*(no reason given)*"}`;

				try {
					post.response.status = 'denied';
					post.response = await post.response.save();
					await msg.edit({
						embeds: [embed],
						components: []
					});
					await msg.reactions.removeAll();

					await u2.send({embeds: [{
						title: 'Response denied!',
						description: [
							`Server: ${msg.channel.guild.name} (${msg.channel.guild.id})`,
							`Form name: ${post.response.form.name}`,
							`Form ID: ${post.response.form.hid}`,
							`Response ID: ${post.response.hid}`
						].join("\n"),
						fields: [{name: 'Reason', value: reason ?? "*(no reason given)*"}],
						color: parseInt('aa5555', 16),
						timestamp: new Date().toISOString()
					}]})

					if(ticket?.id) {
						try {
							var tch = await ctx.guild.channels.fetch(ticket.channel_id);
							await tch?.delete();
						} catch(e) { }
					}

					this.bot.emit('DENY', post.response);
					await post.delete();
				} catch(e) {
					console.log(e);
					return await msg.channel.send('ERR! Response denied, but couldn\'t message the user!');
				}

				return await ctx.followUp({content: 'Response denied!', ephemeral: true});
			case 'accept':
				var embed = msg.embeds[0].toJSON();
				embed.color = parseInt('55aa55', 16);
				embed.footer = {text: 'Response accepted!'};
				embed.timestamp = new Date().toISOString();
				embed.author = {
					name: `${user.username}#${user.discriminator}`,
					iconURL: user.avatarURL()
				}

				try {
					post.response.status = 'accepted';
					post.response = await post.response.save();
					await msg.edit({
						embeds: [embed],
						components: []
					});
					await msg.reactions.removeAll();

					var welc = post.response.form.message;
					if(welc) {
						for(var key of Object.keys(VARIABLES)) {
							welc = welc.replace(key, VARIABLES[key](u2, msg.guild, post.response.form));
						}
					}

					await u2.send({embeds: [{
						title: 'Response accepted!',
						description: welc,
						fields: [
							{name: 'Server', value: `${msg.channel.guild.name} (${msg.channel.guild.id})`},
							{name: 'Form name', value: `${post.response.form.name}`},
							{name: 'Form ID', value: `${post.response.form.hid}`},
							{name: 'Response ID', value: `${post.response.hid}`}
						],
						color: parseInt('55aa55', 16),
						timestamp: new Date().toISOString()
					}]});

					if(ticket?.id) {
						try {
							var tch = await ctx.guild.channels.fetch(ticket.channel_id);
							await tch?.delete();
						} catch(e) { }
					}

					this.bot.emit('ACCEPT', post.response);
					await post.delete();
				} catch(e) {
					console.log(e);
					return await msg.channel.send(`ERR! ${e.message || e}\n(Response still accepted!)`);
				}
				break;
			case 'ticket':
				try {
					await ctx.deferReply({ephemeral: true});
					var ch_id = post.response.form.tickets_id ?? cfg?.ticket_category;
					if(!ch_id) return await ctx.followUp('No ticket category set!');
					var ch = msg.guild.channels.resolve(ch_id);
					if(!ch) return await ctx.followUp('Category not found!!');

					if(ticket?.id) return await ctx.followUp(`Channel already opened! Link: <#${ticket.channel_id}>`)

					var ch2 = await msg.guild.channels.create({
						name: `ticket-${post.response.hid}`,
						parent: ch.id,
						reason: 'Mod opened ticket for response '+post.response.hid
					})

					await ch2.lockPermissions(); //get perms from parent category
					await ch2.permissionOverwrites.edit(u2.id, {
						'ViewChannel': true,
						'SendMessages': true,
						'ReadMessageHistory': true
					})

					var tmsg = post.response.form.ticket_msg ?? cfg?.ticket_message;
					if(tmsg) {
						for(var key of Object.keys(VARIABLES)) {
							tmsg = tmsg.replace(key, VARIABLES[key](u2, msg.guild, post.response.form));
						}

						await ch2.send(tmsg);
					}

					cmp = cmp[0].components.map(x => x.toJSON());
					cmp[2].disabled = true;
					await msg.edit({
						components: [{
							type: 1,
							components: cmp
						}]
					})
					await this.bot.stores.tickets.create({
						server_id: msg.guild.id,
						channel_id: ch2.id,
						response_id: post.response.hid
					});
					await ctx.followUp(`Channel created! <#${ch2.id}>`);
					return;
				} catch(e) {
					return await msg.channel.send('ERR: '+e.message);
				}
		}

		if(PGBTNS(1,1).find(pg => pg.custom_id == ctx.customId)) {
			var template = {
				title: "Response",
				description: [
					`Form name: ${post.response.form.name}`,
					`Form ID: ${post.response.form.hid}`,
					`User: ${u2.username}#${u2.discriminator} (${u2})`,
					`Response ID: ${post.response.hid}`
				].join('\n'),
				color: parseInt('ccaa55', 16),
				fields: [],
				timestamp: post.response.received,
				footer: {text: 'Awaiting acceptance/denial...'}
			}

			var embeds = this.bot.handlers.response.buildResponseEmbeds(post.response, template);
			switch(ctx.customId) {
				case 'first':
					post.page = 1;
					break;
				case 'prev':
					if(post.page == 1) post.page = embeds.length;
					else post.page -= 1;
					break;
				case 'next':
					if(post.page == embeds.length) post.page = 1;
					else post.page += 1;
					break;
				case 'last':
					post.page = embeds.length;
					break;
			}

			await msg.edit({embeds: [embeds[post.page - 1]]});
			await post.save();
			return;
		}
	}
}

module.exports = (bot, db) => new ResponsePostStore(bot, db);