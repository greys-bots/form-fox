const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'status',
			description: "Check the status of a response",
			options: [
				{
					name: 'response_id',
					description: "The response's ID",
					type: 3,
					required: true
				},
				{
					name: 'guild_id',
					description: "The guild's ID",
					type: 3,
					required: false
				}
			],
			usage: [
				"[response_id] - See the status of a response",
				"[response_id] [guild_id] - See the status of a response from a specific guild"
			],
			ephemeral: true,
			permissions: []
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.getString('response_id').toLowerCase().trim();
		var gid = ctx.options.getString('guild_id', false);
		var resp = await this.#stores.responses.get(gid ?? ctx.guildId, id);;
		if(!resp) return 'Response not found!';

		var color;
		switch(resp.status) {
			case 'accepted':
				color = parseInt('55aa55', 16);
				break;
			case 'denied':
				color = parseInt('aa5555', 16);
				break;
			default:
				color = parseInt('ccaa55', 16)
		}

		return {embeds: [{
			title: 'Response Status',
			description: `Response ${resp.hid} ${['accepted', 'denied'].includes(resp.status) ? 'has been' : 'is currently'} **${resp.status}**!`,
			color
		}]}
	}
}

module.exports = (bot, stores) => new Command(bot, stores);