const {
	NACTIONS
} = require('../extras');

module.exports = {
	description: 'requires the user to enter only numbers',
	text: "valid number required.",
	alias: ['number', 'numbers', 'num'],

	async handleMessage(message, response) {
		if(isNaN(parseInt(message.content))) {
			await message.channel.send("Invalid response! Please provide a number value");
			return undefined;
		}

		response.answers.push(message.content);
		return {response, send: true};
	},

	async roleSetup({ctx, question, role}) {
		if(question.roles?.find(rl => rl.id == role.id))
			return "Role already attached to question!";
			
		var action = await ctx.client.utils.awaitSelection(ctx, NACTIONS.map((e) => {
			return e;
		}), "How do you want to compare the answer?", {
			min_values: 1, max_values: 1,
			placeholder: 'Select comparison'
		})
		if(typeof choice == 'string') return choice;

		await ctx.followUp("Enter the value you want to compare the answer to");
		var val = await ctx.client.utils.awaitMessage(ctx.client, ctx, ctx.user, 60000);
		if(typeof val == 'string') return val;
		val = parseInt(val.content);
		if(isNaN(val)) return "Valid number needed!";

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
		var int = parseInt(answers[index]);
		if(isNaN(int)) return roles;
		
		for(var r of question.roles) {
			switch(r.action) {
				case 'lt':
					if(int < r.value)
						roles.push(r.id);
					break;
				case 'lte':
					if(int <= r.value)
						roles.push(r.id);
					break;
				case 'gt':
					if(int > r.value)
						roles.push(r.id);
					break;
				case 'gte':
					if(int >= r.value)
						roles.push(r.id);
					break;
				case 'eq':
					if(int == r.value)
						roles.push(r.id);
					break;
			}
		}

		return roles;
	},
	
	showRoles(q) {
		return q.roles.map(r => {
			return {
				name: `${r.action} | ${r.value}`,
				value: `<@&${r.id}>`
			}
		})
	}
}