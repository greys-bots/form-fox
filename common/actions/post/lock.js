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
			name: 'Type',
			value: data.type
		})

		fields.push({
			name: 'Event',
			value: data.event
		})

		fields.push({
			name: 'Result',
			value: "Forum post will be closed"
		})

		return fields;
	}
}