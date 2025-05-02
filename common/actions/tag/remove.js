const { ChannelType } = require('discord.js');

module.exports = {
	name: 'remove',
	description: 'Remove tags from a response in a forum channel',
	events: ['ACCEPT', 'DENY'],
	priority: 0,

	async setup(ctx) {
		var data = { };
		var { channel, form, inter, client } = ctx;
		if(!channel || channel.type !== ChannelType.GuildForum)
			return { success: false, message: 'This action only applies to forms with response channels that are forums!' };

		if(!channel.availableTags?.length)
			return { success: false, message: "That channel has no tags to choose from!" };

		var tags = channel.availableTags.map(t => ({
			label: t.name,
			value: t.id,
			emoji: t.emoji
		}));

		var select = await client.utils.awaitSelection(inter, tags, "Select the tags you want to remove", {
			min_values: 0,
			max_values: tags.length,
			placeholder: "Select tags..."
		})
		console.log(select);
		if(!Array.isArray(select)) return { success: false, message: select };


		data.tags = select;
		return { success: true, data}
	},

	async handler(ctx) {
		var { thread, action } = ctx;

		if(!thread) return;
		var applied = (thread.appliedTags ?? [])
			.filter(x => !action.tags.includes(x.id))
			.map(x => x.id);

		await thread.setAppliedTags(applied);
	},

	transform(data, ctx) {
		var { channel } = ctx;
		data = data.data;

		var tags = [];
		if(channel.type == ChannelType.GuildForum) {
			tags = channel.availableTags.filter(x => data.tags.includes(x.id)).map(x => {
				var emoji;
				if(x.emoji.id) {
					emoji = `<:${x.emoji.name}:${x.emoji.id}>`
				} else emoji = x.emoji.name;
				return `${emoji} ${x.name}`
			});
		}

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
			content:
				`### Tags removed\n` +
				tags.join(", ")
		})

		return fields;
	}
}