const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			module,
			name: 'deny',
			description: "Manually deny a response, in case reactions aren't working",
			usage: [' [response ID] - Manually denies the response with the given ID'],
			alias: ['fail'],
			permissions: ['MANAGE_MESSAGES'],
			opPerms: ['MANAGE_RESPONSES'],
			guildOnly: true
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		if(!args[0]) return 'I need a response to deny!';

		var response = await this.#stores.responses.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!response.id) return 'Response not found!';

		var user = await this.#bot.users.fetch(response.user_id);
		if(!user) return "Couldn't get that response's user!";

		var post = await this.#stores.responsePosts.getByResponse(msg.channel.guild.id, response.hid);
		var chan = msg.channel.guild.channels.resolve(post?.channel_id);
		var message = await chan?.messages.fetch(post?.message_id);

		var reason;
		await msg.channel.send([
            'Would you like to give a denial reason?\n',
            'Type `skip` to skip adding one, or ',
            '`cancel` to cancel the denial!'
        ].join(''));
		var resp = await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, time: 2 * 60 * 1000, max: 1});
        if(!resp?.first()) return 'Err! Timed out!';
        resp = resp.first().content;
        if(resp.toLowerCase() == 'cancel') return 'Action cancelled!';
        if(resp.toLowerCase() == 'skip') reason = '*(no reason given)*';
        else reason = resp;

		if(message) {
			var embed = message.embeds[0];
			embed.color = parseInt('aa5555', 16);
			embed.footer = {text: 'Response denied!'};
			embed.timestamp = new Date().toISOString();
			try {
				await message.edit({embeds: [embed]});
				await message.reactions.removeAll();
			} catch(e) {
				return 'ERR! '+(e.message || e);
			}
		}

		try {
			response.status = 'denied';
			response = await response.save()
			await user.send({embeds: [{
				title: 'Response denied!',
				description: [
					`Server: ${msg.channel.guild.name} (${msg.channel.guild.id})`,
					`Form name: ${response.form.name}`,
					`Form ID: ${response.form.hid}`,
					`Response ID: ${response.hid}`
				].join("\n"),
				fields: [{name: 'Reason', value: reason}],
				color: parseInt('aa5555', 16),
				timestamp: new Date().toISOString()
			}]})
			this.#bot.emit('DENY', response)
			await post.delete()
		} catch(e) {
			console.log(e);
			return 'ERR! Response denied, but couldn\'t message the user!';
		}

		return 'Response denied!';
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);