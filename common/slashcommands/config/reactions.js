const { clearBtns } = require('../../extras');

module.exports = {
	data: {
		name: 'reactions',
		description: "Sets whether forms will allow emoji reactions",
		options: [
			{
				name: 'value',
				description: 'The value to set',
				type: 5
			}
		]
	},
	usage: [
		"- View the allow emoji reactions status",
		"[value] - Sets whether forms will allow emoji reactions"
	],
	async execute(ctx) {
		var cfg = await ctx.client.stores.configs.get(ctx.guild.id);
		var val = ctx.options.getBoolean('value');

		if(val == null || val == undefined) {
			return `Reactions are currently **${cfg?.reactions ? "enabled" : "disabled"}**.`
		}

		cfg.reactions = val;
		await cfg.save();
		return 'Config updated!';
	},
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}