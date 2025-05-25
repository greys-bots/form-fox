const {
	qButtons: QBTNS,
	responseBtns: RESPBTNS,
	pageBtns: PGBTNS,
	submitBtns: SUBMIT,
	confBtns: CONF,
	textVars: VARIABLES
} = require('../../common/extras');
const TYPES = require('../../common/questions');

const {
	ChannelType
} = require('discord.js');

const ACTIONS = {
	'submit': ['submit', '✅'],
	'cancel': ['cancel', '❌'],
	'skip': ['skip', '➡️', '⬅️'],
	'first': ['first', '⏪'],
	'prev': ['back', '⬅️'],
	'next': ['next', '➡️'],
	'last': ['last', '⏩'],
	'answer': ['answer']
}

class ResponseHandler {
	menus = new Set();
	constructor(bot) {
		this.bot = bot;

		bot.on('messageCreate', async (...args) => {
			try {
				this.handleMessage(...args);
			} catch(e) {
				console.log(e.message || e);
			}
		})

		bot.on('interactionCreate', async (...args) => {
			try {
				this.handleInteractions(...args);
			} catch(e) {
				console.log(e.message || e);
			}
		})
	}

	async startResponse(ctx) {
		var {user, form, cfg} = ctx;

		if(!form.open)
			return "That form isn't accepting responses!";

		if(!form.channel_id && !cfg?.response_channel)
			return 'No response channel set for that form! Ask the mods to set one!';

		if(!form.questions?.[0]) return "That form has no questions! Ask the mods to add some first!";
		await form.getQuestions();

		try {
			var dm = await user.createDM();
			var existing = await this.bot.stores.openResponses.get(dm.id);
			if(existing?.id) return 'Please finish your current form before starting a new one!';

			if(form.cooldown && form.cooldown > 0) {
				var past = (await this.bot.stores.responses.getByUser(form.server_id, user.id))?.pop();
				if(past && past.status == 'denied') {
					var diff = this.bot.utils.dayDiff(new Date(), past.received.getTime() + (form.cooldown * 24 * 60 * 60 * 1000));
					if(diff > 0) return `Cooldown not up yet! You must wait ${diff} day${diff == 1 ? '' : 's'} to apply again`;
				}
			}
			
			if(cfg?.embed || form.embed) {
				var fcomps = await this.bot.utils.genComps(form.resolved.questions, (q, i) => {
					return {
						type: 10,
						content: 
							`**Question ${i+1}** ${form.required?.includes(i+1) ? " (required)" : ""}\n` +
							q.name
					}
				})
				var fembeds = fcomps.map( c => {
					let cmps = []
					if(form.post_icon) {
						cmps.push({
							type: 9,
							components: [{
								type: 10,
								content:
									`# ${form.name}\n` +
									form.description
							}],
							accessory: {
								type: 11,
								media: { url: form.post_icon }
							}
						})
					} else {
						cmps.push({
							type: 10,
							content:
								`# ${form.name}\n` +
								form.description
						})
					}

					if(form.post_banner) {
						cmps.push({
							type: 12,
							items: [{
								media: { url: form.post_banner ?? null }
							}]
						})
					}
					return {
						components: [{
							type: 17,
							accent_color: parseInt(form.color || 'ee8833', 16),
							components: [
								...cmps,
								...c
							]
						}]
					}
				})
				var fm;
				if(fembeds[1]) {
					fm = await user.send({
						flags: ['IsComponentsV2'],
						components: [
							...fembeds[0].components,
							PGBTNS(1, fembeds.length)
						]
					})
					if(!this.bot.menus) this.bot.menus = {};
					this.bot.menus[fm.id] = {
						user: user.id,
						data: fembeds,
						index: 0,
						timeout: setTimeout(()=> {
							if(!this.bot.menus[fm.id]) return;
							delete this.bot.menus[fm.id];
						}, 900000),
						execute: this.bot.utils.paginate
					};
				} else fm = await user.send({
					flags: ['IsComponentsV2'],
					...fembeds[0]
				})
			}

			var question = await this.handleQuestion(form, 0);
			if(ctx.auto) question.components[0].components.push({
				type: 10,
				content: `-# This form was automatically sent from guild ${ctx.guild.name}!`
			})

			var message = await user.send({
				flags: ['IsComponentsV2'],
				...question
			});
			
			await this.bot.stores.openResponses.create({
				server_id: form.server_id,
				channel_id: message.channel.id,
				message_id: message.id,
				user_id: user.id,
				form: form.hid,
				questions: JSON.stringify(form.questions)
			})
		} catch(e) {
			console.log(e);
			if (e.message === 'Cannot send messages to this user') {
				return 'Please turn on `Direct Messages from Server Members` in your Privacy Settings!';
			}
			return 'ERR! Couldn\'t start response process: '+(e.message || e);
		}

		this.bot.emit('APPLY', {
			server_id: form.server_id,
			user_id: user.id,
			form: form
		})
		return 'Application started! Check your DMs!';
	}

	async sendQuestion(response, message) {
		let { form } = response;
		var question = await this.handleQuestion(form, response.answers.length);
		if(question) {
			var msg = await message.channel.send({
				flags: ['IsComponentsV2'],
				...question
			});

			return msg;
		} else {
			var template = {
				components: [{
					type: 10,
					content: `# ${response.form.name}\n${response.form.description}`
				}],
				color: parseInt(response.form.color || 'ccaa55', 16)
			};

			var embeds = await this.buildResponseEmbeds(response, template);

			var content = {
				flags: ['IsComponentsV2'],
				components: [
					{
						type: 10,
						content: "How's this look?"
					},
					embeds[0],
					{ type: 1, components: SUBMIT }
				]
			}
			if(embeds.length > 1) {
				content.components.push({ type: 1, components: PGBTNS(0, embeds.length) });
				response.page = 1;
				await response.update();
			}
			var msg = await message.channel.send(content);

			return msg;
		}
	}

	// TODO: optimize this better. maybe store page data (fields) in
	// 		 the store for the response instead of rebuilding on every react
	async buildResponseEmbeds(response, template) {
		var questions = await response.form.getQuestions();
		var embeds = [];

		var comps = await this.bot.utils.genComps(questions, (q, i) => {
			let r = response.answers[i];
			return {
				type: 10,
				content:
					`### ${q.name}\n` +
					(r?.length ? r : '*(answer skipped)*')
			}
		}, 20)

		embeds = comps.map(c => {
			return {
				type: 17,
				accent_color: template?.color ?? parseInt(response.form.color || 'ccaa55', 16),
				components: [
					...(template?.components ?? []),
					...c,
					...(template?.footer ?? [])
				]
			}
		})

		return embeds;
	}

	async sendResponse(response, message, user, config) {
		var questions = await response.form.getQuestions();

		if(questions.find((q, i) => q.required && i+1 > response.answers.length))
			return 'You still have required questions to answer!';
		var prompt = await message.channel.messages.fetch(response.message_id);

		if(response.answers.length < questions.length) {
			var m = await message.channel.send({
				content: "You're not done with this form yet!\n" +
						 "Would you like to skip the rest of the questions?",
				components: [{ type: 1, components: CONF }]
			});

			var confirm = await this.bot.utils.getConfirmation(this.bot, message, user);
			await m.edit({
				components: [{
					type: 1, 
					components: CONF.map(b => ({...b, disabled: true}))
				}]
			});
			if(confirm.msg) return confirm;
		}

		try {
			var created = await this.bot.stores.responses.create({
				server_id: response.server_id,
				user_id: user.id,
				form: response.form.hid,
				questions: JSON.stringify(response.form.questions),
				answers: response.answers[0] ? response.answers :
						 new Array(questions.length).fill("*(answer skipped!)*"),
				status: 'pending'
			});

			var template = {
				components: [
					{
						type: 10,
						content:
							`# Response\n` +
							`**Form name:** ${response.form.name}\n` +
							`**Form ID:** ${response.form.hid}\n` +
							`**User:** ${user.username}#${user.discriminator} (${user})\n` +
							`**Response ID:** ${created.hid}`		
					}
				],
				color: parseInt('ccaa55', 16),
				footer: [{
					type: 10,
					content:
						`-# Received <t:${Math.floor(new Date().getTime() / 1000)}:F> | Status: pending`
				}]
			}
			var embeds = await this.buildResponseEmbeds(response, template);
			await prompt.edit({
				components: [embeds[0]]
			})

			var guild = this.bot.guilds.resolve(response.server_id);
			if(!guild) return Promise.reject("ERR! Guild not found! Aborting!");
			var chan_id = response.form.channel_id || config?.response_channel;
			var channel = guild.channels.resolve(chan_id);
			if(!channel) return Promise.reject("ERR! Guild response channel missing! Aborting!");
			var toSend = {
				flags: ['IsComponentsV2'],
				components: [
					embeds[0],
					{ type: 1, components: RESPBTNS }
				]
			}

			if(embeds.length > 1) toSend.components.push({ type: 1, components: PGBTNS });
			if(response.form.note?.length) toSend.components = [{type: 10, content: response.form.note}, ...toSend.components];
			var rmsg;
			if(channel.type == ChannelType.GuildForum) {
				var title;
				if(response.form.forum_title) {
					title = response.form.forum_title;
					for(var k in VARIABLES) {
						title = title.replace(k, VARIABLES[k](user, guild, response.form, created));
					}
				} else title = `Response ${created.hid} (${response.form.name})`;

				var tchan = await channel.threads.create({
					name: title,
					message: toSend,
					// appliedTags: response.form.forum_tags?.length ? response.form.forum_tags : []
				});
				rmsg = await tchan.fetchStarterMessage();
				await rmsg.pin();
			} else {
				var rmsg = await channel.send(toSend);
				if(config?.autothread) await rmsg.startThread({name: `Response ${created.hid}`})
			}

			await this.bot.stores.responsePosts.create({
				server_id: rmsg.channel.guild.id,
				channel_id: rmsg.channel.id,
				message_id: rmsg.id,
				response: created.hid,
				page: 1
			})
			await this.bot.stores.forms.updateCount(rmsg.channel.guild.id, response.form.hid);
			this.bot.emit('SUBMIT', created);
		} catch(e) {
			console.log(e);
			return Promise.reject('ERR! '+(e.message || e));
		}

		await response.delete();
		return {
			msg: 'Response sent! Response ID: '+created.hid +
				 '\nUse this code to make sure your response has been received',
			success: true
		}
	}

	async cancelResponse(response, message, user) {
		var prompt = await message.channel.messages.fetch(response.message_id);

		var m = await message.channel.send({
			content: 'Would you like to cancel your response?\n'+
				'WARNING: This will delete all your progress. '+
				'If you want to fill out this form, you\'ll have to start over',
			components: [{type: 1, components: CONF}]
		})

		var confirm = await this.bot.utils.getConfirmation(this.bot, message, user);
		await m.edit({
			components: [{
				type: 1, 
				components: CONF.map(b => ({...b, disabled: true}))
			}]
		});
		if(confirm.msg) return confirm;

		try {
			await response.delete();
			await prompt.edit({
				components: [{
					type: 17,
					accent_color: 0xaa5555,
					components: [{
						type: 10,
						content:
							`## Response cancelled\n` +
							`This response has been cancelled!\n` +
							`-# Cancelled <t:${Math.floor(new Date().getTime() / 1000)}:F>`
					}]
				}]
			});
		} catch(e) {
			console.log(e);
			return Promise.reject('ERR! '+(e.message || e));
		}

		this.menus.delete(message.channel.id);
		return {msg: 'Successfully cancelled!', success: true};
	}

	async autoCancel(ctx) {
		var {channel, response} = ctx;

		var prompt = await channel.messages.fetch(response.message_id);
		prompt = prompt?.first();
		try {
			await response.delete();
			if(!prompt) return;
			await prompt.edit({
				components: [{
					type: 17,
					accent_color: 0xaa5555,
					components: [{
						type: 10,
						content:
							`## Response cancelled\n` +
							`User has left the server.\n` +
							`-# Cancelled <t:${Math.floor(new Date().getTime() / 1000)}:F>`
					}]
				}]
			});
		} catch(e) {
			console.log(e);
			return Promise.reject('ERR! '+(e.message || e));
		}

		this.menus.delete(channel.id);
		return;
	}

	async skipQuestion(response, message, user) {
		var questions = await response.form.getQuestions();
		if(questions.length < response.answers.length + 1) return {};

		if(questions[response.answers.length].required)
			return {msg: 'This question can\'t be skipped!'};

		var m = await message.channel.send({
			content: 'Are you sure you want to skip this question? ' +
				"You can't go back to answer it!",
			components: [{type: 1, components: CONF}]
		});

		var confirm = await this.bot.utils.getConfirmation(this.bot, m, user);
		await m.edit({
			components: [{
				type: 1, 
				components: CONF.map(b => ({...b, disabled: true}))
			}]
		});
		if(confirm.msg) return {msg: confirm.msg};

		response.answers.push('*(answer skipped)*');
		var msg = await this.sendQuestion(response, message);
		response.message_id = msg.id;
		await response.save();

		return {success: true};
	}

	async handleQuestion(form, number) {
		var questions;
		if(!form.resolved?.questions) questions = await form.getQuestions();
		else questions = form.resolved.questions;

		var current = form.resolved.questions[number];
		if(!current) return undefined;

		var emb = await current.getEmbed();
		var buttons = [QBTNS.cancel];
		if(!current.required) {
			if(!questions.find((x, i) => x.required && i > number)) {
				buttons.push(QBTNS.submit);
			}

			buttons.push(QBTNS.skip);
		}

		return {
			components: [
				emb,
				{
					type: 1,
					components: buttons
				}
			]
		};
	}

	async handleAnswer(ctx) {
		var {
			user,
			message,
			interaction,
			prompt,
			form,
			response,
			question,
			config,
			action,
			data
		} = ctx;
		
		if(!message) message = interaction.message;
		else {
			if(this.bot.user.id == message?.author.id) return;
			if(message?.author.bot) return;
			if(message.content.toLowerCase().startsWith(this.bot.prefix)) return; //in case they're doing commands
		}

		if(this.menus.has(message.channel.id)) return;

		var template = {
			components: [{
				type: 10,
				content: `# ${form.name}\n${form.description}`
			}],
			color: parseInt('ccaa55', 16)
		}

		var res;
		var embed = prompt.components[0];
		var comps = prompt.components[1].components.map(c => ({ ...c.toJSON(), disabled: true }));
		switch(action) {
			case 'submit':
				this.menus.add(message.channel.id);
				try {
					res = await this.sendResponse(response, message, user, config);
				} catch(e) {
					console.log(e);
					await message.channel.send(e.message || e);
				}
				this.menus.delete(message.channel.id);
				break;
			case 'cancel':
				this.menus.add(message.channel.id);
				try {
					res = await this.cancelResponse(response, message, user, config);
				} catch(e) {
					console.log(e);
					await message.channel.send(e.message || e);
				}
				this.menus.delete(message.channel.id);
				break;
			case 'skip':
				this.menus.add(message.channel.id);
				try {
					res = await this.skipQuestion(response, message, user, config);
				} catch(e) {
					console.log(e);
					await message.channel.send(e.message || e);
				}
				this.menus.delete(message.channel.id);
				break;
			case 'first':
				var embeds = await this.bot.handlers.response.buildResponseEmbeds(response, template);
				response.page = 1;

				await prompt.edit({components: [embeds[response.page - 1]]});
		        await response.save()
		        return;
			case 'prev':
				var embeds = await this.bot.handlers.response.buildResponseEmbeds(response, template);
				if(response.page == 1) response.page = embeds.length;
				else response.page -= 1;

				await prompt.edit({components: [embeds[response.page - 1]]});
		        await response.save()
		        return;
			case 'next':
				var embeds = await this.bot.handlers.response.buildResponseEmbeds(response, template);
				if(response.page == embeds.length) response.page = 1;
				else response.page += 1;

				await prompt.edit({components: [embeds[response.page - 1]]});
		        await response.save()
		        return;
			case 'last':
				var embeds = await this.bot.handlers.response.buildResponseEmbeds(response, template);
				response.page = embeds.length;

				await prompt.edit({components: [embeds[response.page - 1]]});
		        await response.save()
		        return;
			case 'answer':
				var questions = form.resolved?.questions ?? await form.getQuestions();
				if(questions.length < response.answers.length + 1) return;
				var type = TYPES[question.type];

				var res2 = await type.handle({
					prompt,
					response,
					question,
					data
				});
				if(!res2) return;
				response = res2.response;

				if(res2.menu) this.menus.add(message.channel.id);
				if(res2.embed) embed = res2.embed;

				var msg;
				if(res2.send) msg = await this.sendQuestion(response, message);

				response.message_id = msg?.id ?? response.message_id;
				await response.save();

				if(msg) await prompt.edit({
					components: [
						embed,
						{
							type: 1,
							components: comps
						}
					]
				});
		        return;
		}

		if(res?.msg) {
			if(interaction) interaction.followUp(res.msg)
			else await message.channel.send(res.msg);
		}
	}

	async handleMessage(message) {
		if(this.bot.user.id == message.author.id) return;
		if(message.author.bot) return;
		if(message.content.toLowerCase().startsWith(this.bot.prefix)) return; //in case they're doing commands

		var response = await this.bot.stores.openResponses.get(message.channel.id);
		if(!response?.id) return;

		var questions = await response.form.getQuestions();
		if(!questions?.[0]) {
			await response.delete();
			return message.channel.send("That form is invalid! This response is now closed");
		}
		var question = questions[response.answers.length];
		var config = await this.bot.stores.configs.get(response.server_id);

		var msg;
		var prompt = await message.channel.messages.fetch(response.message_id);

		var content = message.content?.toLowerCase().trim();
		var act = Object.keys(ACTIONS).find(k => ACTIONS[k].includes(content));
		if(!act) act = 'answer';
		return await this.handleAnswer({
			user: message.author.user,
			message,
			prompt,
			response,
			form: response.form,
			question,
			config,
			action: act,
			data: ['att', 'img', 'text'].includes(question.type) ? message : message.content
		})
	}

	async handleInteractions(inter) {
		var { user } = inter;
		if(this.bot.user.id == user.id) return;
		if(user.bot) return;

		if(this.menus.has(inter.channel.id)) return;
		if(!inter.message) return;

		var response = await this.bot.stores.openResponses.get(inter.message?.channel?.id);
		if(!response?.id) return;

		var questions = await response.form.getQuestions();
		if(!questions?.[0]) {
			await response.delete();
			return inter.reply("That form is invalid! This response is now closed");
		}

		await inter.deferUpdate();

		var question = questions[response.answers.length]; // current question

		var config = await this.bot.stores.configs.get(response.server_id);
		var prompt = inter.message;

		var action = Object.keys(ACTIONS).find(k => ACTIONS[k].includes(inter.customId));
		var data;
		if(!action) {
			action = 'answer';

			if(inter.isStringSelectMenu()) data = inter.values;
			else data = inter.customId;
		}

		return await this.handleAnswer({
			user,
			interaction: inter,
			prompt,
			response,
			form: response.form,
			question,
			config,
			action,
			data
		})
	}
}

module.exports = (bot) => new ResponseHandler(bot);