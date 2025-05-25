const { ChannelType } = require('discord.js');

module.exports = {
	name: 'lock',
	description: 'Lock forum post for a response',
	events: ['ACCEPT', 'DENY'],
	priority: 1,

	async setup(ctx) {
		var data = { };
		var { channel } = ctx;
		if(!channel || channel.type !== ChannelType.GuildForum)
			return { success: false, message: 'This action only applies to forms with response channels that are forums!' };

		return { success: true, data}
	},

	async handler(ctx) {
		var { thread } = ctx;

		if(!thread) return;

		await thread.setLocked(true);
	},

	transform(data, ctx) {
		data = data.data;

		var fields = [];
		fields.push({
			type: 10,
			content: `### Type\n${data.type}`
		})

		fields.push({
			type: 10,
			content: `### Event\n${data.event}`
		})

		fields.push({
			type: 10,
			content: `### Result\nForum post will be locked`
		})

		return fields;
	}
}