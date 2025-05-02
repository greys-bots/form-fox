const { ChannelType } = require('discord.js');

module.exports = {
	name: 'add',
	description: 'Add roles to a member',
	events: ['APPLY', 'SUBMIT', 'ACCEPT', 'DENY'],
	priority: 1,

	async setup(ctx) {
		var data = { };
		var { inter, client } = ctx;

		var select = await client.utils.awaitRoleSelection(inter, [], "Select the roles you want to add to the user", {
			min_values: 0,
			max_values: 5,
			placeholder: "Select roles..."
		})
		if(!Array.isArray(select)) return { success: false, message: select };

		data.roles = select;
		console.log(data.roles);

		return { success: true, data}
	},

	async handler(ctx) {
		var { member, action } = ctx;

		await member.roles.add(action.data.roles);
	},

	transform(data, ctx) {
		var { channel } = ctx;
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
			content:
				`### Roles added\n` +
				data.roles.map(x => `<@&${x}>`).join(", ")
		})

		return fields;
	}
}