const {
	ChannelType,
	Collection
} = require('discord.js');

const {
	events: EVENTS,
	qTypes: TYPES
} = require(__dirname + '/../../common/extras.js');

const fs = require('fs');

class ActionHandler {
	constructor(bot, path = (__dirname + '/../../common/actions')) {
		this.bot = bot;
		this.path = path;

		EVENTS.forEach(e => {
			this.bot.on(e.toUpperCase(), (data) => {
				this.handleActions(data, e.toUpperCase())
			})
		})

		this.bot.once('ready', async () => {
			await this.load();
			console.log('Actions loaded');
		})
	}

	async load() {
		var actions = new Collection();

		// adapted from command loading code
		var files = this.bot.utils.recursivelyReadDirectory(this.path);
		for(var f of files) {
			var path_frags = f.replace(this.path, "").split(/(?:\\|\/)/); // get fragments of path to slice up
			var mods = path_frags.slice(1, -1); // the module names (folders SHOULD = mod name)
			var file = path_frags[path_frags.length - 1]; // the actual file name
			delete require.cache[require.resolve(f)]; // for reloading
			
			var action = require(f); // again, full command data

			// if the commands are part of modules,
			// then we need to nest them into those modules for parsing
			if(mods.length) {
				action.type = mods.join(':') + `:${action.name}`;
				actions.set(action.type, action);
			} else {
				// no mods? just make it top-level
				action.type = command.name;
				
				actions.set(action.name, action);
			}
		}

		console.log(actions);
		this.Types = actions;
	}

	async handleActions(ctx, event) {
		var { form: fid } = ctx;
		var config = await this.bot.stores.configs.get(ctx.server_id);
		var form;
		if(typeof fid == 'string') form = await this.bot.stores.forms.get(ctx.server_id, fid);
		else form = fid;
		var guild = await this.bot.guilds.fetch(ctx.server_id);
		var channel = await guild.channels.fetch(form.channel_id ?? config?.response_channel);
		var member = await guild.members.fetch(ctx.user_id);

		var thread;
		var post = ctx.post;
		if(!post && (ctx.response || ctx.hid)) {
			post = await this.bot.stores.responsePosts.getByResponse(ctx.server_id, ctx.response?.hid ?? ctx.hid);
		}

		if(post && channel.type == ChannelType.GuildForum) {
			thread = await channel.threads.fetch(post.channel_id);
		}

		var actions = await this.bot.stores.actions.getByForm(ctx.server_id, form.hid);
		if(!actions?.length) return;

		for(var action of actions) {
			if(action.data?.event !== event) continue;
			var item = this.Types.find(x => x.type == action.data.type);
			if(!item) continue;

			try {
				item.handler({
					config,
					form,
					channel,
					guild,
					member,
					action,
					client: this.bot,
					post,
					thread,
					response: ctx.response ?? ctx
				})
			} catch(e) {
				console.error(
					'ACTION ERROR',
					{
						type: item.type,
						message: e.message ?? e,
						guild: guild.id,
						form: form.hid
					}
				)
			}
		}
	}
}

module.exports = (bot) => new ActionHandler(bot);