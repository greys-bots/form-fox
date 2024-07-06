const { ChannelType } = require('discord.js');

module.exports = {
	type: 'post:close',
	description: 'Close forum post for a response',
	events: ['ACCEPT', 'DENY'],

	async setup(ctx) {
		var data = { };
		var { channel, form, inter, client } = ctx;
		if(!channel || channel.type !== ChannelType.GuildForum)
			return { success: false, message: 'This action only applies to forms with response channels that are forums!' };

		return { success: true, data}
	},

	async handler(ctx) {
		var { client, form, thread, action } = ctx;

		if(!thread) return;

		await thread.setArchived(true);
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