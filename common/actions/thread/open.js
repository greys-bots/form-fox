const { ChannelType } = require('discord.js');

const accepted = [
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement
]

module.exports = {
	name: 'open',
	description: 'Automatically open a thread on a submitted response',
	events: ['SUBMIT'],
	priority: 1,

	async setup(ctx) {
		var data = { };
		var { channel } = ctx;
		if(!channel || !accepted.includes(channel.type))
			return { success: false, message: 'This action only applies to forms with response channels that are non-thread/non-forum channels!' };

		return { success: true, data}
	},

	async handler(ctx) {
		var { channel, post, response } = ctx;

		if(!channel || !accepted.includes(channel.type)) return;
		if(!post) return;
		var message = await channel.messages.fetch(post.message_id);

		await message.startThread({name: `Response ${response.hid}`});
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
			value: "Thread will be opened"
		})

		return fields;
	}
}