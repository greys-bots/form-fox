const {
	ChannelType,
	Collection
} = require('discord.js');

const {
	events: EVENTS,
	qTypes: TYPES
} = require(__dirname + '/../../common/extras.js');

const fs = require(fs);

// const ACTIONS = require(__dirname + '/../../common/actions');

class ActionHandler {
	constructor(bot, path) {
		this.bot = bot;

		EVENTS.forEach(e => {
			this.bot.on(e.toUpperCase(), (data) => {
				this.handleActions(data, e.toUpperCase())
			})
		})

		this.bot.once('ready', async () => {
			await this.load(path);
			console.log('Actions loaded');
		})
	}

	async load(path = (__dirname + '/../../common/actions')) {
		var actions = new Collection();

		var files = fs.readdirSync(path);
		for(var f of files) {
			var tmp = require(`${path}/${f}`);
			actions.set(tmp.type, tmp);
		}

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
			if(action.data.event !== event) continue;
			var item = ACTIONS.find(x => x.type == action.data.type);
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