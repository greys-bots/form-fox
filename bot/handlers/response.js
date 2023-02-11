const {
	qTypes: TYPES,
	qButtons: QBTNS,
	responseBtns: RESPBTNS,
	pageBtns: PGBTNS,
	submitBtns: SUBMIT,
	confBtns: CONF
} = require('../../common/extras');

class ResponseHandler {
	menus = new Set();
	constructor(bot) {
		this.bot = bot;

		bot.on('messageReactionAdd', async (...args) => {
			try {
				this.handleReactions(...args);
			} catch(e) {
				console.log(e.message || e);
			}
		})

		bot.on('messageReactionRemove', async (...args) => {
			try {
				this.handleReactionRemove(...args);
			} catch(e) {
				console.log(e.message || e);
			}
		})

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

		try {
			var existing = await this.bot.stores.openResponses.get(user.dmChannel?.id);
			if(existing?.id) return 'Please finish your current form before starting a new one!';

			if(form.cooldown && form.cooldown > 0) {
				var past = (await this.bot.stores.responses.getByUser(form.server_id, user.id))?.pop();
				if(past && past.status == 'denied') {
					var diff = this.bot.utils.dayDiff(new Date(), past.received.getTime() + (form.cooldown * 24 * 60 * 60 * 1000));
					if(diff > 0) return `Cooldown not up yet! You must wait ${diff} day${diff == 1 ? '' : 's'} to apply again`;
				}
			}
			
			if(cfg?.embed || form.embed) {
				var fembeds = await this.bot.utils.genEmbeds(this.bot, form.questions, (q, i) => {
					return {
						name: `Question ${i+1}${form.required?.includes(i+1) ? " (required)" : ""}`,
						value: q.value
					}
				}, {
					title: form.name,
					description: form.description,
					color: parseInt(form.color || 'ee8833', 16)
				})
				var fm = await user.send({embeds: [fembeds[0].embed]})
				if(fembeds[1]) {
					if(!this.bot.menus) this.bot.menus = {};
					this.bot.menus[fm.id] = {
						user: user.id,
						data: fembeds,
						index: 0,
						timeout: setTimeout(()=> {
							if(!this.bot.menus[fm.id]) return;
							try {
								fm.reactions.removeAll();
							} catch(e) {
								console.log(e);
							}
							delete this.bot.menus[fm.id];
						}, 900000),
						execute: this.bot.utils.paginateEmbeds
					};
					["⬅️", "➡️", "⏹️"].forEach(r => fm.react(r));
				}
			}

			var question = await this.handleQuestion(form, 0);
			var qemb = {
				embeds: [{
					title: form.name,
					description: form.description,
					fields: question.message,
					color: parseInt(form.color || 'ee8833', 16),
					footer: question.footer
				}],
				components: []
			}

			if(ctx.auto) {
				qemb.content =
					`**(This form was automatically sent from ` +
					`guild ${ctx.guild.name}!)**`;
			}

			if(question.buttons) {
				for(var i = 0; i < question.buttons.length; i += 5) {
					qemb.components.push({
						type: 1,
						components: question.buttons.slice(i, i+5)
					})
				}
			}

			var message = await user.send(qemb);
			
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
				return 'Please turn on Direct Messages from Server Members in your Privacy Settings at the top.';
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
		var question = await this.handleQuestion(response, response.answers.length);
		if(question) {
			var qemb = {
				embeds: [{
					title: response.form.name,
					description: response.form.description,
					fields: question.message,
					color: parseInt(response.form.color || 'ee8833', 16),
					footer: question.footer
				}],
				components: []
			}

			if(question.buttons) {
				for(var i = 0; i < question.buttons.length; i += 5) {
					qemb.components.push({
						type: 1,
						components: question.buttons.slice(i, i+5)
					})
				}
			}

			var msg = await message.channel.send(qemb);

			return msg;
		} else {
			var template = {
				title: response.form.name,
				description: response.form.description,
				fields: [],
				color: parseInt(response.form.color || 'ccaa55', 16),
				footer: {text: [
					'react with ✅ to finish; ',
					'react with ❌ to cancel. ',
					'respective keywords: submit, cancel'
				].join(' ')}
			};

			var embeds = this.buildResponseEmbeds(response, template);

			var content = {
				content: "How's this look?",
				embeds: [embeds[0]],
				components: [{ type: 1, components: SUBMIT }]
			}
			if(embeds.length > 1) {
				content.components.push({ type: 1, components: PGBTNS });
				response.page = 1;
				await response.update();
			}
			var msg = await message.channel.send(content);

			return msg;
		}
	}

	// TODO: optimize this better. maybe store page data (fields) in
	// 		 the store for the response instead of rebuilding on every react
	buildResponseEmbeds(response, template) {
		var questions = response.questions?.[0] ? response.questions : response.form.questions;
		var embeds = [];

		var fields = [];

		for(let i=0; i<response.questions.length; i++) {
			if(!response.answers[i]?.length) {
				fields.push({
					name: questions[i].value,
					value: '*(answer skipped)*'
				})
				continue;
			}

			var lines = response.answers[i].split("\n");
			var val = "";
			var n = 0;
			for(var j = 0; j < lines.length; j++) {
				if(!lines[j].length) { val += "\n"; continue; } // handle empty lines

				// if line is too big for the current val...
				if(val.length + (lines[j].length + 1) > 1023) {
					// if there isn't a val and the line is just too long...
					if(!val.length) {
						// split it up
						var chunks = lines[j].match(/(.|[\r\n]){1,1024}/gm);
						for(var k = 0; k < chunks.length; k++) {
							if(chunks[k].length > 1023) {
								fields.push({
									name: `${questions[i].value} ${k > 0 ? '(cont.)' : ''}`,
									value: chunks[k]
								})
								n++;
							} else {
								val = chunks[k] + "\n";
							}
						}
					} else {
						// otherwise just push the current val
						// and make the new val the current line
						fields.push({
							name: questions[i].value + (n > 0 ? ' (cont.)' : ''),
							value: val
						});
						val = lines[j] + "\n";
						n++;
					}

					continue;
				}

				val += lines[j] + "\n";
			}

			// still a value at the end? push it
			if(val.length) {
				fields.push({
					name: questions[i].value + (n > 0 ? ' (cont.)' : ''),
					value: val
				})
			}
		}

		if(fields.length <= 20) {
			embeds.push({
				...template,
				fields
			})
		} else {
			// slice up fields into proper embeds
			for(var i = 0; i < fields.length; i += 10) {
				var tmp = Object.assign({}, template);
				tmp.fields = fields.slice(i, i + 10);
				embeds.push(tmp);
			}
		}
			
		if(embeds.length > 1) for(var i = 0; i < embeds.length; i++)
			embeds[i].title += ` (page ${i+1}/${embeds.length})`;

		return embeds;
	}

	async sendResponse(response, message, user, config) {
		var questions = response.questions?.[0] ? response.questions : response.form.questions;

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
			this.bot.emit('SUBMIT', created);
			var template = {
				title: "Response",
				description: [
					`Form name: ${response.form.name}`,
					`Form ID: ${response.form.hid}`,
					`User: ${user.username}#${user.discriminator} (${user})`,
					`Response ID: ${created.hid}`
				].join('\n'),
				color: parseInt('ccaa55', 16),
				fields: [],
				timestamp: new Date().toISOString(),
				footer: {text: 'Awaiting acceptance/denial...'}
			}
			var embeds = this.buildResponseEmbeds(response, template);
			await prompt.edit(embeds[0])
			var guild = this.bot.guilds.resolve(response.server_id);
			if(!guild) return Promise.reject("ERR! Guild not found! Aborting!");
			var chan_id = response.form.channel_id || config?.response_channel;
			var channel = guild.channels.resolve(chan_id);
			if(!channel) return Promise.reject("ERR! Guild response channel missing! Aborting!");
			var toSend = {
				embeds: [embeds[0]],
				components: [{ type: 1, components: RESPBTNS }]
			}
			if(embeds.length > 1) toSend.components.push({ type: 1, components: PGBTNS });
			var rmsg = await channel.send(toSend);
			if(config?.autothread) await rmsg.startThread({name: `Response ${created.hid}`})

			await this.bot.stores.responsePosts.create({
				server_id: rmsg.channel.guild.id,
				channel_id: channel.id,
				message_id: rmsg.id,
				response: created.hid,
				page: 1
			})
			await this.bot.stores.forms.updateCount(rmsg.channel.guild.id, response.form.hid);
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
			await prompt.edit({embeds: [{
				title: "Response cancelled",
				description: "This form response has been cancelled!",
				color: parseInt('aa5555', 16),
				timestamp: new Date().toISOString()
			}]});
		} catch(e) {
			console.log(e);
			return Promise.reject('ERR! '+(e.message || e));
		}

		this.menus.delete(message.channel.id);
		return {msg: 'Response cancelled!', success: true};
	}

	async autoCancel(ctx) {
		var {channel, response} = ctx;

		var prompt = await channel.messages.fetch(response.message_id);
		try {
			await response.delete();
			if(!prompt) return;
			console.log(prompt)
			await prompt.edit({
				embeds: [{
					title: "Response cancelled",
					description: "Left the server; this form response has been automatically cancelled!",
					color: parseInt('aa5555', 16),
					timestamp: new Date().toISOString()
				}],
				components: []
			});
		} catch(e) {
			console.log(e);
			return Promise.reject('ERR! '+(e.message || e));
		}

		this.menus.delete(channel.id);
		return;
	}

	async skipQuestion(response, message, user) {
		var questions = response.questions?.[0] ? response.questions : response.form.questions;
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

	async handleQuestion(data, number) {
		var questions = data.questions?.[0] ? data.questions : data.form.questions;
		var current = questions[number];
		if(!current) return undefined;

		var question = {};
		var type = TYPES[current.type];

		question.message = [
			{
				name: `Question ${number + 1}${current.required ? ' (required)' : ''}`,
				value: current.value
			}
		];
		if(type.message) question.message = question.message.concat(type.message(current));

		question.buttons = [];
		if(type.buttons) question.buttons = type.buttons(current);
		question.buttons.push(QBTNS.cancel);

		question.footer = {text: 'react with ❌ or type "cancel" to cancel.'};
		if(type.text) question.footer.text = type.text + " " + question.footer.text;

		if(!current.required) {
			if(!questions.find((x, i) => x.required && i > number)) {
				question.footer.text += ' react with ✅ or type "submit" to finish early.';
				question.buttons.push(QBTNS.submit);
			}

			question.footer.text += ' react with ➡️ or type "skip" to skip this question!';
			question.buttons.push(QBTNS.skip);
		}

		return question;
	}

	async handleReactions(reaction, user) {
		if(this.bot.user.id == user.id) return;
		if(user.bot) return;

		var msg;
		if(reaction.message.partial) {
			try {
				msg = await reaction.message.fetch();
			} catch(e) {
				if(e.message.includes('Unknown')) return;
				else return Promise.reject(e);
			}
		} else msg = reaction.message;

		if(this.menus.has(msg.channel.id)) {
			return;
		}

		var response = await this.bot.stores.openResponses.get(msg.channel.id);
		if(!response?.id) return;
		if(response.message_id != msg.id) return;

		var questions = response.questions?.[0] ? response.questions : response.form.questions;
		if(!questions?.[0]) {
			await response.delete();
			return msg.channel.send("That form is invalid! This response is now closed");
		}

		var question = questions[response.answers.length]; // current question

		var config = await this.bot.stores.configs.get(response.server_id);

		var comps = msg.components[0].components.map(c => c.data);
		switch(reaction.emoji.name) {
			case '✅':
				this.menus.add(msg.channel.id);
				try {
					var res = await this.sendResponse(response, msg, user, config);
				} catch(e) {
					console.log(e);
					await msg.channel.send(e.message || e);
				}
				this.menus.delete(msg.channel.id);
				if(res.msg) await msg.channel.send(res.msg);
				if(res.success) await msg.edit({
					components: [{
						type: 1,
						components: comps.map(b => ({ ...b, disabled: true }))
					}]
				});
				return;
			case '❌':
				this.menus.add(msg.channel.id);
				try {
					var res = await this.cancelResponse(response, msg, user, config);
				} catch(e) {
					console.log(e);
					await msg.channel.send(e.message || e);
				}
				this.menus.delete(msg.channel.id);
				if(res.msg) await msg.channel.send(res.msg);
				if(res.success) await msg.edit({
					components: [{
						type: 1,
						components: comps.map(b => ({ ...b, disabled: true }))
					}]
				});
				return;
		}

		if(['⬅️', '➡️'].includes(reaction.emoji.name)) {
			if(!msg.content) {
				this.menus.add(msg.channel.id);
				try {
					var res = await this.skipQuestion(response, msg, user, config);
				} catch(e) {
					console.log(e);
					await msg.channel.send(e.message || e);
				}
				this.menus.delete(msg.channel.id);
				if(res.msg) await msg.channel.send(res.msg);
				if(res.success) await msg.edit({
					components: [{
						type: 1,
						components: comps.map(b => ({ ...b, disabled: true }))
					}]
				});
				return;
			}

			var template = {
				title: response.form.name,
				description: response.form.description,
				color: parseInt('ccaa55', 16),
				fields: [],
				footer: {text: 'react with ✅ to finish;  react with ❌ to cancel.  respective keywords: submit, cancel'}
			}

			var embeds = this.bot.handlers.response.buildResponseEmbeds(response, template);
			switch(reaction.emoji.name) {
				case '⬅️':
				if(response.page == 1) response.page = embeds.length;
				else response.page -= 1;
				break;
			case '➡️':
				if(response.page == embeds.length) response.page = 1;
				else response.page += 1;
				break;
			}

			await msg.edit({embeds: [embeds[response.page - 1]]});
            await response.save();
            return;
		}

		var type = TYPES[question.type];
		if(!type.handleReactAdd) return;

		var res2 = await type.handleReactAdd(msg, response, question, reaction);
		if(!res2) return;
		response = res2.response;

		if(res2.menu) this.menus.add(msg.channel.id);

		var message;
		if(res2.send) var message = await this.sendQuestion(response, msg);
		response.message_id = message?.id ?? msg.id;
		
		await response.save();

		if(message) await msg.edit({
			components: [{
				type: 1,
				components: comps.map(b => ({ ...b, disabled: true }))
			}]
		});
	}

	// for deselecting options
	async handleReactionRemove(reaction, user) {
		if(this.bot.user.id == user.id) return;
		if(user.bot) return;

		var msg;
		if(reaction.message.partial) msg = await reaction.message.fetch();
		else msg = reaction.message;

		if(this.menus.has(msg.channel.id)) {
			return;
		}

		var response = await this.bot.stores.openResponses.get(msg.channel.id);
		if(!response?.id) return;
		if(response.message_id != msg.id) return;

		var questions = response.questions?.[0] ? response.questions : response.form.questions;
		if(!questions?.[0]) {
			await response.delete();
			return msg.channel.send("That form is invalid! This response is now closed");
		}

		var question = questions[response.answers.length]; // current question
		if(!question) return;
		var type = TYPES[question.type];
		if(!type.handleReactRemove) return;

		var res = await type.handleReactRemove(msg, response, question, reaction);
		if(!res) return;
		response = res.response;

		await response.save();
	}

	async handleMessage(message) {
		if(this.bot.user.id == message.author.id) return;
		if(message.author.bot) return;
		if(message.content.toLowerCase().startsWith(this.bot.prefix)) return; //in case they're doing commands

		var response = await this.bot.stores.openResponses.get(message.channel.id);
		if(!response?.id) return;

		var questions = response.questions?.[0] ? response.questions : response.form.questions;
		if(!questions?.[0]) {
			await response.delete();
			return message.channel.send("That form is invalid! This response is now closed");
		}
		var question = questions[response.answers.length];
		var config = await this.bot.stores.configs.get(response.server_id);

		var msg;
		var prompt = await message.channel.messages.fetch(response.message_id);
		if(this.menus.has(message.channel.id)) {
			if(!response.selection?.includes('OTHER')) return;
			if(!question) return;

			var embed = prompt.embeds[0];

			if(message.content.toLowerCase() == 'cancel') {
				embed.fields[embed.fields.length - 1].value = 'Enter a custom response (react with 🅾️ or type "other")';
				await prompt.edit({embeds: [embed]});
				response.selection = response.selection.filter(x => x != 'OTHER');
				await response.save();
				this.menus.delete(message.channel.id);
				return;
			}

			response.selection[response.selection.indexOf('OTHER')] = message.content;
			embed.fields[embed.fields.length - 1].value = message.content;
			await prompt.edit({embeds: [embed]});
			this.menus.delete(message.channel.id);

			if(question.type == 'mc') {
				response.answers.push(message.content);
				response.selection = [];
				msg = await this.sendQuestion(response, message);
			}

			response.message_id = msg?.id ?? response.message_id;
			await response.save();
			return;
		}

		var comps = prompt.components[0].components.map(c => c.data);
		switch(message.content.toLowerCase()) {
			case 'submit':
				this.menus.add(message.channel.id);
				try {
					var res = await this.sendResponse(response, message, message.author, config);
				} catch(e) {
					console.log(e);
					await message.channel.send(e.message || e);
				}
				this.menus.delete(message.channel.id);
				if(res.msg) await message.channel.send(res.msg);
				if(res.success) await prompt.edit({
					components: [{
						type: 1,
						components: comps.map(b => ({ ...b, disabled: true }))
					}]
				});
				return;
			case 'cancel':
				this.menus.add(message.channel.id);
				try {
					var res = await this.cancelResponse(response, message, message.author, config);
				} catch(e) {
					console.log(e);
					await message.channel.send(e.message || e);
				}
				this.menus.delete(message.channel.id);
				if(res.msg) await message.channel.send(res.msg);
				if(res.success) await prompt.edit({
					components: [{
						type: 1,
						components: comps.map(b => ({ ...b, disabled: true }))
					}]
				});
				return;
			case 'skip':
				this.menus.add(message.channel.id);
				try {
					var res = await this.skipQuestion(response, message, message.author, config);
				} catch(e) {
					console.log(e);
					this.menus.delete(message.channel.id);
					await message.channel.send(e.message || e);
				}
				this.menus.delete(message.channel.id);
				if(res.msg) await message.channel.send(res.msg);
				if(res.success) await prompt.edit({
					components: [{
						type: 1,
						components: comps.map(b => ({ ...b, disabled: true }))
					}]
				});
				return;
		}

		if(questions.length < response.answers.length + 1) return;
		var type = TYPES[question.type];

		if(!type.handleMessage) return;

		var res2 = await type.handleMessage(message, response, question);
		if(!res2) return;
		response = res2.response;

		if(res2.menu) this.menus.add(message.channel.id);

		if(res2.send) msg = await this.sendQuestion(response, message);

		response.message_id = msg?.id ?? response.message_id;
		await response.save();

		if(msg) await prompt.edit({
			components: [{
				type: 1,
				components: comps.map(b => ({ ...b, disabled: true }))
			}]
		});
	}

	async handleInteractions(inter) {
		if(!inter.isButton()) return;
		var { user } = inter;
		if(this.bot.user.id == user.id) return;
		if(user.bot) return;

		if(this.menus.has(inter.channel.id)) {
			return;
		}

		var response = await this.bot.stores.openResponses.get(inter.message.channel.id);
		if(!response?.id) return;

		var questions = response.questions?.[0] ? response.questions : response.form.questions;
		if(!questions?.[0]) {
			await response.delete();
			return inter.reply("That form is invalid! This response is now closed");
		}

		var question = questions[response.answers.length]; // current question

		var config = await this.bot.stores.configs.get(response.server_id);

		await inter.deferUpdate();
		var comps = inter.message.components[0].components.map(c => c.data);
		switch(inter.customId) {
			case 'submit':
				this.menus.add(inter.message.channel.id);
				try {
					var res = await this.sendResponse(response, inter.message, user, config);
				} catch(e) {
					console.log(e);
					await inter.followUp(e.message || e);
				}
				this.menus.delete(inter.message.channel.id);
				if(res.msg) await inter.followUp(res.msg);
				if(res.success) await inter.message.edit({
					components: [{
						type: 1,
						components: comps.map(b => ({ ...b, disabled: true })).filter(x => x)
					}]
				});
				return;
			case 'cancel':
				this.menus.add(inter.message.channel.id);
				try {
					var res = await this.cancelResponse(response, inter.message, user, config);
				} catch(e) {
					console.log(e);
					await inter.followUp(e.message || e);
				}
				this.menus.delete(inter.message.channel.id);
				if(res.msg) await inter.followUp(res.msg);
				if(res.success) await inter.message.edit({
					components: [{
						type: 1,
						components: comps.map(b => ({ ...b, disabled: true }))
					}]
				});
				return;
			case 'skip':
				this.menus.add(inter.message.channel.id);
				try {
					var res = await this.skipQuestion(response, inter.message, user, config);
				} catch(e) {
					console.log(e);
					await inter.followUp(e.message || e);
				}
				this.menus.delete(inter.message.channel.id);
				if(res.msg) await inter.followUp(res.msg);
				if(res.success) await inter.message.edit({
					components: [{
						type: 1,
						components: comps.map(b => ({ ...b, disabled: true }))
					}]
				});
				return;
		}

		if(PGBTNS(1, 1).find(pg => pg.custom_id == inter.customId)) {
			await inter.deferUpdate();
			var template = {
				title: response.form.name,
				description: response.form.description,
				color: parseInt('ccaa55', 16),
				fields: [],
				footer: {text: 'react with ✅ to finish; react with ❌ to cancel. respective keywords: submit, cancel'}
			}

			var embeds = this.bot.handlers.response.buildResponseEmbeds(response, template);
			switch(inter.customId) {
				case 'first':
					response.page = 1;
					break;
				case 'prev':
					if(response.page == 1) response.page = embeds.length;
					else response.page -= 1;
					break;
				case 'next':
					if(response.page == embeds.length) response.page = 1;
					else response.page += 1;
					break;
				case 'last':
					response.page = embeds.length;
					break;
			}

			await inter.message.edit({embeds: [embeds[response.page - 1]]});
	        await response.save()
	        return;
		}

		var type = TYPES[question.type];
		if(!type.handleInteraction) return;

		var res2 = await type.handleInteraction(inter.message, response, question, inter);
		if(!res2) return;
		response = res2.response;

		if(res2.menu) this.menus.add(inter.message.channel.id);

		var message;
		if(res2.send) var message = await this.sendQuestion(response, inter.message);

		response.message_id = message?.id ?? inter.message.id;
		await response.save();

		if(message) await inter.message.edit({
			components: [{
				type: 1,
				components: comps.map(b => ({ ...b, disabled: true }))
			}]
		});
	}
}

module.exports = (bot) => new ResponseHandler(bot);