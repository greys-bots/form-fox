const { clearBtns } = require('../../extras');

module.exports = {
	data: {
		name: 'autothread',
		description: "Sets whether to create a thread on each received response",
		options: [
			{
				name: 'value',
				description: 'The value to set',
				type: 5
			}
		]
	},
	usage: [
		"- View the current auto-threading status",
		"[value] - Set whether to automatically add threads to responses"
	],
	async execute(ctx) {
		var cfg = await ctx.client.stores.configs.get(ctx.guild.id);
		var val = ctx.options.getBoolean('value');

		if(val == null || val == undefined) {
			return `Auto-threads are currently **${cfg?.autothread ? "enabled" : "disabled"}**.`
		}

		if(!cfg) await ctx.client.stores.configs.create(ctx.guildId, {autothread: val});
		else await ctx.client.stores.configs.update(ctx.guildId, {autothread: val});
		return 'Config updated!';
	},
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}