const { ChannelType } = require('discord.js');
const TYPES = require('../../../questions');
const {
	numbers: NUMS
} = require('../../../extras');

module.exports = {
	name: 'add',
	description: "Add roles to a member based on their response's answers",
	events: ['APPLY', 'SUBMIT', 'ACCEPT', 'DENY'],
	priority: 1,

	async setup(ctx) {
		var data = { };
		var { inter, client, form } = ctx;

		if(!form.resolved?.questions?.length) return { success: false, message: "Form has no questions to add roles to!" };

		var eligible = form.resolved.questions.filter(x => {
			var t = TYPES[x.type];
			return t.roleSetup;
		})
		if(!eligible?.length) return { success: false, message: 'Form has no eligible questions to apply roles to!' };

		var select;
		select = await client.utils.awaitSelection(inter, eligible.map((x, i) => ({ label: `Question ${i+1}`, description: x.name, value: x.id })), "Select the question to add a role to", {
			min_values: 1,
			max_values: 1,
			placeholder: "Select question..."
		})
		if(!Array.isArray(select)) return { success: false, message: select };

		var question = eligible.find(x => x.id == select[0]);

		select = await client.utils.awaitSelection(inter, question.options.choices.map((x, i) => ({ label: `Option ${i+1}`, description: x, value: i })), "Select the option to attach a role to", {
			min_values: 1,
			max_values: 1,
			placeholder: "Select option..."
		})
		if(!Array.isArray(select)) return { success: false, message: select };

		var option = question.options[select[0]];

		select = await client.utils.awaitRoleSelection(inter, [], "Select the roles you want to add to the user", {
			min_values: 0,
			max_values: 5,
			placeholder: "Select roles..."
		})
		if(!Array.isArray(select)) return { success: false, message: select };

		data.roles = select;
		data.condition = {
			question: question.id,
			option: option
		}
		console.log(data);

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
			name: 'Type',
			value: data.type
		})

		fields.push({
			name: 'Event',
			value: data.event
		})

		fields.push({
			name: 'Roles added',
			value: data.roles.map(x => `<@&${x}>`).join(", ")
		})

		fields.push({
			name: 'Condition',
			value: data.condition
		})

		return fields;
	}
}