const {
	TACTIONS
} = require('../extras');

module.exports = {
	description: 'allows the user to freely type an answer',
	alias: ['text', 'free'],

	embed(data) {
		return [{
			type: 10,
			content: '-# Requires a text response'
		}];
	},

	async handle({ prompt, response, data }) {
		var answer = data.content;
		if(data.attachments.size > 0)
			answer += "\n\n**Attachments:**\n" + data.attachments.map(a => a.url).join("\n");

		var embed = prompt.components[0].toJSON();
		embed.components[embed.components.length - 1] = {
			type: 10,
			content: answer
		}

		response.answers.push(answer);
		return {response, send: true, embed};
	},

	async roleSetup({ctx, question, role}) {
		if(question.roles?.find(rl => rl.id == role.id))
			return "Role already attached to question!";
			
		var action = await ctx.client.utils.awaitSelection(ctx, TACTIONS.map((e) => {
			return e;
		}), "How do you want to compare the answer?", {
			min_values: 1, max_values: 1,
			placeholder: 'Select comparison'
		})
		if(typeof choice == 'string') return choice;

		await ctx.followUp("Enter the value you want to compare the answer to");
		var val = await ctx.client.utils.awaitMessage(ctx.client, ctx, ctx.user, 60000);
		if(typeof val == 'string') return val;
		val = val.content;

		if(!question.roles) question.roles = [];
		question.roles.push({
			id: role.id,
			action: action[0],
			value: val
		})

		return question;
	},

	async roleRemove({question, role}) {
		question.roles = question.roles.filter(r => r.id !== role.id);
		return question;
	},

	handleRoles(question, answers, index) {
		var roles = [];
		for(var r of question.roles) {
			switch(r.action) {
				case 'contains':
					if(answers[index].toLowerCase().includes(r.value.toLowerCase()))
						roles.push(r.id);
					break;
				case 'equals':
					if(answers[index].toLowerCase() == r.value.toLowerCase())
						roles.push(r.id);
					break;
			}
		}

		return roles;
	},
	
	showRoles(q) {
		return q.roles.map(r => {
			return {
				type: 10,
				content:
					`### ${r.action} | ${r.value}\n` +
					`<@&${r.id}>`
			}
		})
	}
}