const {
	confirmVals: STRINGS,
	confirmReacts: REACTS,
	confirmBtns: BUTTONS,
	numbers: NUMBERS,
	qTypes: TYPES
} = require('../common/extras');

module.exports = {
	genEmbeds: async (bot, arr, genFunc, info = {}, fieldnum, extras = {}) => {
		return new Promise(async res => {
			var embeds = [];
			var current = { embed: {
				title: typeof info.title == "function" ?
								info.title(arr[0], 0) : info.title,
						description: typeof info.description == "function" ?
								info.description(arr[0], 0) : info.description,
				color: typeof info.color == "function" ?
						info.color(arr[0], 0) : info.color,
				footer: info.footer,
				fields: []
			}};
			
			for(let i=0; i<arr.length; i++) {
				if(current.embed.fields.length < (fieldnum || 10)) {
					current.embed.fields.push(await genFunc(arr[i], i, arr));
				} else {
					embeds.push(current);
					current = { embed: {
						title: typeof info.title == "function" ?
								info.title(arr[i], i) : info.title,
						description: typeof info.description == "function" ?
								info.description(arr[i], i) : info.description,
						color: typeof info.color == "function" ?
								info.color(arr[i], i) : info.color,
						footer: info.footer,
						fields: [await genFunc(arr[i], i, arr)]
					}};
				}
			}
			embeds.push(current);
			if(extras.order && extras.order == 1) {
				if(extras.map) embeds = embeds.map(extras.map);
				if(extras.filter) embeds = embeds.filter(extras.filter);
			} else {
				if(extras.filter) embeds = embeds.filter(extras.filter);
				if(extras.map) embeds = embeds.map(extras.map);
			}
			if(embeds.length > 1) {
				for(let i = 0; i < embeds.length; i++)
					embeds[i].embed.title += (extras.addition != null ? eval("`"+extras.addition+"`") : ` (page ${i+1}/${embeds.length}, ${arr.length} total)`);
			}
			res(embeds);
		})
	},

	paginateEmbeds: async function(bot, m, reaction) {
		switch(reaction.emoji.name) {
			case "⬅️":
				if(this.index == 0) {
					this.index = this.data.length-1;
				} else {
					this.index -= 1;
				}
				await m.edit({embeds: [this.data[this.index].embed ?? this.data[this.index]]});
				if(m.channel.type != "DM") await reaction.users.remove(this.user)
				bot.menus[m.id] = this;
				break;
			case "➡️":
				if(this.index == this.data.length-1) {
					this.index = 0;
				} else {
					this.index += 1;
				}
				await m.edit({embeds: [this.data[this.index].embed ?? this.data[this.index]]});
				if(m.channel.type != "DM") await reaction.users.remove(this.user)
				bot.menus[m.id] = this;
				break;
			case "⏹️":
				await m.delete();
				delete bot.menus[m.id];
				break;
		}
	},

	getConfirmation: async (bot, msg, user, choices) => {
		return new Promise(res => {

			function msgListener(message) {
				if(message.channel.id != msg.channel.id ||
				   message.author.id != user.id) return;

				clearTimeout(timeout);
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener)

				if(msg.components?.[0]) {
					msg.edit({
						components: [{
							type: 1,
							components: msg.components[0].components.map(({data: b}) => ({
								...b,
								disabled: true
							}))
						}]
					})
				}

				if(STRINGS[0].includes(message.content.toLowerCase())) return res({confirmed: true, message});
				else return res({confirmed: false, message, msg: 'Action cancelled!'});
			}

			function reactListener(react, ruser) {
				if(react.message.channel.id != msg.channel.id ||
				   ruser.id != user.id) return;

				clearTimeout(timeout);
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener)

				if(msg.components?.[0]) {
					msg.edit({
						components: [{
							type: 1,
							components: msg.components[0].components.map(({data: b}) => ({
								...b,
								disabled: true
							}))
						}]
					})
				}

				if(react.emoji.name == REACTS[0]) return res({confirmed: true, react});
				else return res({confirmed: false, react, msg: 'Action cancelled!'});
			}

			function intListener(intr) {
				if(!intr.isButton()) return;
				if(intr.channelId !== msg.channel.id ||
				   intr.user.id !== user.id) return;

				clearTimeout(timeout);
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener);

				intr.update({
					components: [{
						type: 1,
						components: intr.message.components[0].components.map(({data: b}) => ({
							...b,
							disabled: true
						}))
					}]
				})
				
				if(BUTTONS[0].includes(intr.customId)) return res({confirmed: true, interaction: intr});
				else return res({confirmed: false, interaction: intr, msg: 'Action cancelled!'});
			}

			const timeout = setTimeout(async () => {
				bot.removeListener('messageCreate', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				bot.removeListener('interactionCreate', intListener)
				res({confirmed: false, msg: 'ERR! Timed out!'})
			}, 30000);

			bot.on('messageCreate', msgListener);
			bot.on('messageReactionAdd', reactListener);
			bot.on('interactionCreate', intListener)
		})
	},

	getChoice: async (bot, msg, user, time, update = true) => {
		return new Promise(res => {
			function intListener(intr) {
				if(!intr.isButton()) return;
				if(intr.channelId !== msg.channel.id ||
				   intr.user.id !== user.id) return;

				clearTimeout(timeout);
				bot.removeListener('interactionCreate', intListener);

				if(update) {
					intr.update({
						components: [{
							type: 1,
							components: intr.message.components[0].components.map(({data: b}) => ({
								...b,
								disabled: true
							}))
						}]
					})
				} else {
					intr.message.edit({
						components: [{
							type: 1,
							components: intr.message.components[0].components.map(({data: b}) => ({
								...b,
								disabled: true
							}))
						}]	
					})
				}
				
				return res({choice: intr.customId, interaction: intr});
			}

			const timeout = setTimeout(async () => {
				bot.removeListener('interactionCreate', intListener)
				res({choice: undefined, msg: 'ERR! Timed out!'})
			}, time ?? 30_000);

			bot.on('interactionCreate', intListener)
		})
	},

	awaitMessage: async (bot, msg, user, time) => {
		return new Promise(res => {
			function msgListener(message) {
				if(message.channel.id != msg.channel.id ||
				   message.author.id != user.id) return;

				bot.removeListener('messageCreate', msgListener);
				clearTimeout(timeout);
				return res(message)
			}

			const timeout = setTimeout(async () => {
				bot.removeListener('messageCreate', msgListener);
				res('ERR! Timed out!')
			}, time ?? 30000);

			bot.on('messageCreate', msgListener);
		})
	},

	awaitSelection: async (ctx, choices, msg, options = {min_values: 1, max_values: 1, placeholder: '- - -'}) => {
		var components = [{
			type: 3,
			custom_id: 'selector',
			options: choices,
			...options
		}]

		var reply;
		if(ctx.replied || ctx.deferred) {
			reply = await ctx.followUp({
				content: msg,
				components: [{
					type: 1,
					components
				}]
			});
		} else {
			reply = await ctx.reply({
				content: msg,
				components: [{
					type: 1,
					components
				}],
				fetchReply: true
			});
		}

		try {
			var resp = await reply.awaitMessageComponent({
				filter: (intr) => intr.user.id == ctx.user.id && intr.customId == 'selector',
				time: 60000
			});
		} catch(e) { }
		if(!resp) return 'Nothing selected!';
		await resp.update({
			components: [{
				type: 1,
				components: components.map(c => ({
					...c,
					disabled: true,
					options: choices.map(ch => ({...ch, default: resp.values.includes(ch.value)}))
				}))
			}]
		});

		return resp.values;
	},

	async awaitModal(ctx, data, user, ephemeral = false, time = 30_000) {
		return new Promise(async res => {
			await ctx.showModal(data);
			
			async function modListener(m) {
				if(!m.isModalSubmit()) return;
				if(!(m.customId == data.custom_id &&
					m.user.id == user.id))
					return;

				clearTimeout(timeout);
				ctx.client.removeListener('interactionCreate', modListener);

				await m.deferReply({ephemeral});
				res(m);
			}

			ctx.client.on("interactionCreate", modListener);
			const timeout = setTimeout(async () => {
				ctx.client.removeListener('interactionCreate', modListener)
				res()
			}, time);
		})
	}
}
