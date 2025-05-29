const { ChannelType } = require('discord.js');
const TYPES = require('../../../questions');
const {
	numbers: NUMS
} = require('../../../extras');

const CONDMAP = {
	'gt': 'is greater than',
	'lt': 'is less than',
	'gte': 'is greater than or equal to',
	'lte': 'is less than or equal to',
	'eq': 'is equal to',
	'contains': 'contains text',
}

const CONDS = {
	'gt': (a, b) => a > b,
	'lt': (a, b) => a < b,
	'gte': (a, b) => a >= b,
	'lte': (a, b) => a <= b,
	'eq': (a, b) => (typeof a == 'string' ? a.toLowerCase() == b.toLowerCase() : a == b),
	'contains': (a, b) => a.toLowerCase().includes(b.toLowerCase()),
	'choice': (a, b) => a.toLowerCase() == b.toLowerCase()
}

function genCond(c) {
	if(c.choice) {
		return `Selected answer is "${c.choice}"`;
	} else if(c.value) {
		return `Answer ${CONDMAP[c.compare]} "${c.value}"`;
	}
}

module.exports = {
	name: 'add',
	description: "Add roles to a member based on their response's answers",
	events: ['APPLY', 'SUBMIT', 'ACCEPT', 'DENY'],
	priority: 1,

	async setup(ctx) {
		var data = { };
		var { inter, client, form } = ctx;
		
		if(!form.questions?.length) return { success: false, message: "Form has no questions to add roles to!" };

		var eligible = form.resolved.questions.filter(x => {
			var t = TYPES[x.type];
			return t.roleSetup ? true : false;
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
		var condition = await TYPES[question.type].roleSetup({ ctx: inter, question });
		if(typeof condition == 'string') return { success: false, message: condition };

		select = await client.utils.awaitRoleSelection(inter, [], "Select the roles you want to add to the user", {
			min_values: 0,
			max_values: 5,
			placeholder: "Select roles..."
		})
		if(!Array.isArray(select)) return { success: false, message: select };

		data.roles = select;
		data.condition = {
			question: question.id,
			name: question.name,
			...condition
		}
		console.log(data);

		return { success: true, data}
	},

	async handler(ctx) {
		var { member, action, question, response, form } = ctx;
		var { choice, compare, value, question } = action.data.condition;
		var index = form.questions.indexOf(question);
		var answer = response.answers?.[index];
		if(!answer) return;

		if(choice) {
			if(!CONDS['choice'](answer, choice)) return;
		} else if(compare) {
			if(!CONDS[compare](answer, value)) return;
		} else return;

		await member.roles.add(action.data.roles);
		return;
	},

	transform(data, ctx) {
		var { channel } = ctx;
		data = {...data, ...data.data };

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

		fields.push({
			type: 10,
			content: `### Question\n${data.condition.name}`
		})

		fields.push({
			type: 10,
			content: `### Condition\n${genCond(data.condition)}`
		})

		return fields;
	}
}