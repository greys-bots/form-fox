const { clearBtns } = require('../../extras');

module.exports = {
	data: {
		name: 'roles',
		description: "Manage roles associated with specific questions",
		type: 2
	}
}

const opts = module.exports.options = [];

opts.push({
	data: {
		name: 'view',
		description: "View roles associated with questions on a form",
		type: 1,
		options: [
			{
				name: 'form',
				description: "The form to check roles on",
				type: 3,
				required: true
			},
			{
				name: 'question',
				description: "The question number to view roles of",
				type: 4,
				required: false
			}
		]
	},
	usage: [
		'[form] - View all roles attached to questions on the given form',
		'[form] [question] - View roles attached to a specific question on a form'
	],
	async execute(ctx) {
		var f = ctx.options.getString('form')?.toLowerCase().trim();
		var q = ctx.options.getInteger('question');

		var form = await ctx.client.stores.forms.get(ctx.guild.id, f);
		if(!form) return 'Form not found!';

		if(q === 0) q = 1;
		if(q > form.questions.length) q = form.questions.length;
		console.log(form.questions[3].roles);

		var questions = form.questions;
		if(q !== null) questions = [form.questions[q - 1]];
		questions = questions.filter(qu => qu?.choices?.length);
		if(!questions.length) return "No valid questions supplied!";

		var embeds = [];
		for(var qu of questions) {
			if(!qu.roles) {
				embeds.push({
					title: "Roles on form "+form.hid,
					description: "Question: "+qu.value,
					fields: {
						name: 'No roles',
						value: "Question has no roles attached"
					}
				});
				continue;
			}

			embeds.push({
				title: "Roles on form "+form.hid,
				description: "Question: "+qu.value,
				fields: qu.choices.map((c, i) => {
					var roles = qu.roles.filter(r => r.choice == c);
					return {
						name: c,
						value: roles.length ? roles.map(r => `<@&${r.id}>`).join(" ") : "(none)"
					}
				})
			})
		}

		if(embeds.length > 1) for(var i = 0; i < embeds.length; i++)
			embeds[i].title += ` ${i+1}/${embeds.length}`;

		return embeds;
	},
	ephemeral: true
})

opts.push({
	data: {
		name: 'add',
		description: "Attach roles to questions on a form",
		type: 1,
		options: [
			{
				name: 'form',
				description: "The form to change",
				type: 3,
				required: true
			},
			{
				name: 'question',
				description: "The question number to change",
				type: 4,
				required: true
			},
			{
				name: 'role',
				description: "The role to attach to the question",
				type: 8,
				required: true
			},
			{
				name: 'choice',
				description: "The choice number to attach a role to",
				type: 4,
				required: false
			}			
		]
	},
	usage: [
		"[form] [question] [role] - Open a menu to see the available choices and attach a role to one",
		"[form] [question] [role] [choice] - Skip the menu and attach a role to a specific chocie"
	],
	async execute(ctx) {
		var f = ctx.options.getString('form')?.toLowerCase().trim();
		var q = ctx.options.getInteger('question');
		var c = ctx.options.getInteger('choice');
		var r = ctx.options.getRole('role');

		var form = await ctx.client.stores.forms.get(ctx.guild.id, f);
		if(!form) return 'Form not found!';

		if(q === 0) q = 1;
		if(q > form.questions.length) q = form.questions.length;
		var question = form.questions[q - 1];
		if(!question.choices?.length)
			return "Invalid question! You can only attach roles to multiple choice and checkbox questions";

		var choice;
		if(c == null) {
			choice = await ctx.client.utils.awaitSelection(ctx, question.choices.map((e, i) => {
				return {label: e.slice(0, 100), value: `${i}`}
			}), "What choice do you want to attach this to?", {
				min_values: 1, max_values: 1,
				placeholder: 'Select choice'
			})
			if(typeof choice == 'string') return choice;

			c = parseInt(choice[0]);
			choice = question.choices[c];
		} else {
			if(c == 0) c = 1;
			else if(c > question.choices.length) c = question.choices.length;
			choice = question.choices[c - 1];
		}

		if(!question.roles) question.roles = [];
		if(!question.roles.find(rl => rl.id == r.id)) question.roles.push({choice, id: r.id});
		form.questions[q - 1] = question;

		await ctx.client.stores.forms.update(ctx.guild.id, form.hid, {questions: form.questions});
		return "Question updated!";
	}
})

opts.push({
	data: {
		name: 'remove',
		description: "Detach roles from questions on a form",
		type: 1,
		options: [
			{
				name: 'form',
				description: "The form to change",
				type: 3,
				required: true
			},
			{
				name: 'question',
				description: "The question number to change",
				type: 4,
				required: true
			},
			{
				name: 'role',
				description: "The role to detach from the question",
				type: 8,
				required: true
			},
			{
				name: 'choice',
				description: "The choice number to detach a role from",
				type: 4,
				required: false
			}			
		]
	},
	usage: [
		"[form] [question] [role] - Open a menu to see the available choices and detach a role from one",
		"[form] [question] [role] [choice] - Skip the menu and detach a role from a specific chocie"
	],
	async execute(ctx) {
		var f = ctx.options.getString('form')?.toLowerCase().trim();
		var q = ctx.options.getInteger('question');
		var c = ctx.options.getInteger('choice');
		var r = ctx.options.getRole('role');

		var form = await ctx.client.stores.forms.get(ctx.guild.id, f);
		if(!form) return 'Form not found!';

		if(q === 0) q = 1;
		if(q > form.questions.length) q = form.questions.length;
		var question = form.questions[q - 1];
		if(!question.choices?.length)
			return "Invalid question! You can only attach roles to multiple choice and checkbox questions";
		if(!question.roles?.length) return "Nothing attached to that question!";

		var choice;
		if(c == null) {
			choice = await ctx.client.utils.awaitSelection(ctx, question.choices.map((e, i) => {
				return {label: e.slice(0, 100), value: `${i}`}
			}), "What choice do you want to detach this from?", {
				min_values: 1, max_values: 1,
				placeholder: 'Select choice'
			})
			if(typeof choice == 'string') return choice;

			c = parseInt(choice[0]);
			choice = question.choices[c];
		} else {
			if(c == 0) c = 1;
			else if(c > question.choices.length) c = question.choices.length;
			choice = question.choices[c - 1];
		}

		if(choice) question.roles = question.roles.filter(rl => rl.choice !== choice || rl.id !== r.id);
		else question.roles = question.roles.filter(rl => rl.id !== r.id);
		form.questions[q - 1] = question;

		await ctx.client.stores.forms.update(ctx.guild.id, form.hid, {questions: form.questions});
		return "Question updated!";
	}
})

opts.push({
	data: {
		name: 'clear',
		description: "Clear all roles attached to questions on a form",
		type: 1,
		options: [
			{
				name: 'form',
				description: "The form to change",
				type: 3,
				required: true
			},
			{
				name: 'question',
				description: "The question number to clear roles from",
				type: 4,
				required: false
			}
		]
	},
	async execute(ctx) {
		var f = ctx.options.getString('form')?.toLowerCase().trim();
		var q = ctx.options.getInteger('question');

		var form = await ctx.client.stores.forms.get(ctx.guild.id, f);
		if(!form) return 'Form not found!';

		if(q === 0) q = 1;
		if(q > form.questions.length) q = form.questions.length;

		var content;
		if(q) content = "Are you sure you want to clear ALL roles on this question?";
		else content = "Are you sure you want to clear ALL roles on these questions?"
		var rdata = {
			content,
			components: [
				{
					type: 1,
					components: clearBtns
				}
			]
		}
		var reply = await ctx.reply({...rdata, fetchReply: true});
		var conf = await ctx.client.utils.getConfirmation(ctx.client, reply, ctx.user);
		var msg;
		if(conf.msg) {
			msg = conf.msg;
		} else {
			if(q == null) {
				form.questions = form.questions.map(qu => {
					qu.roles = [];
					return qu;
				})
			} else {
				q = q - 1;
				form.questions[q].roles = [];
			}
			await ctx.client.stores.forms.update(ctx.guild.id, form.hid, {questions: form.questions});
			msg = 'Roles cleared!';
		}

		if(conf.interaction) {
			await conf.interaction.update({
				content: msg,
				embeds: [],
				components: [{
					type: 1,
					components: clearBtns.map(b => {
						return {... b, disabled: true};
					})
				}]
			});
			return;
		}

		return {
			content: msg,
			embeds: [],
			components: [{
				type: 1,
				components: clearBtns.map(b => {
					return {... b, disabled: true};
				})
			}]
		}
	}
})