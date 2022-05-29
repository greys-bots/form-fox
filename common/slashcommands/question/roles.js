const { clearBtns, qTypes: TYPES } = require('../../extras');

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
				required: true,
				autocomplete: true
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
		if(!form.id) return 'Form not found!';
		
		if(q === 0) q = 1;
		if(q > form.questions.length) q = form.questions.length;
		
		var questions = form.questions;
		if(q !== null) questions = [form.questions[q - 1]];
		questions = questions.filter(qu => qu?.roles?.length);
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
				fields: TYPES[qu.type].showRoles(qu)
			})
		}

		if(embeds.length > 1) for(var i = 0; i < embeds.length; i++)
			embeds[i].title += ` ${i+1}/${embeds.length}`;

		return embeds;
	},
	async auto(ctx) {
		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
		var foc = ctx.options.getFocused();
		if(!foc) return forms.map(f => ({ name: f.name, value: f.hid }));
		foc = foc.toLowerCase()

		if(!forms?.length) return [];

		return forms.filter(f =>
			f.hid.includes(foc) ||
			f.name.toLowerCase().includes(foc) ||
			f.description.toLowerCase().includes(foc)
		).map(f => ({
			name: f.name,
			value: f.hid
		}))
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
				required: true,
				autocomplete: true
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
			}
		]
	},
	usage: [
		"[form] [question] [role] - Open a menu to see the available choices and attach a role to one",
		"[form] [question] [role] [choice] - Skip the menu and attach a role to a specific chocie"
	],
	extra: "Roles are added when the response is accepted",
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
		if(!TYPES[question.type].roleSetup)
			return "Invalid question! You can only attach roles to certain question types";

		question = await TYPES[question.type].roleSetup({
			ctx,
			question,
			role: r
		});
		if(typeof question == 'string') return question;
		form.questions[q - 1] = question;

		await form.save()
		return "Question updated!";
	},
	async auto(ctx) {
		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
		var foc = ctx.options.getFocused();
		if(!foc) return forms.map(f => ({ name: f.name, value: f.hid }));
		foc = foc.toLowerCase()

		if(!forms?.length) return [];

		return forms.filter(f =>
			f.hid.includes(foc) ||
			f.name.toLowerCase().includes(foc) ||
			f.description.toLowerCase().includes(foc)
		).map(f => ({
			name: f.name,
			value: f.hid
		}))
	},
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
				required: true,
				autocomplete: true
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
		if(!TYPES[question.type].roleSetup)
			return "Invalid question! You can only attach roles to certain question types";
		if(!question.roles?.length) return "Nothing attached to that question!";

		question = await TYPES[question.type].roleRemove({
			ctx,
			question,
			role: r
		})
		if(typeof question == 'string') return question;
		form.questions[q - 1] = question;

		await form.save()
		return "Question updated!";
	},
	async auto(ctx) {
		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
		var foc = ctx.options.getFocused();
		if(!foc) return forms.map(f => ({ name: f.name, value: f.hid }));
		foc = foc.toLowerCase()

		if(!forms?.length) return [];

		return forms.filter(f =>
			f.hid.includes(foc) ||
			f.name.toLowerCase().includes(foc) ||
			f.description.toLowerCase().includes(foc)
		).map(f => ({
			name: f.name,
			value: f.hid
		}))
	},
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
				required: true,
				autocomplete: true
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
			await form.save()
			msg = 'Roles cleared!';
		}

		return msg;
	},
	async auto(ctx) {
		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
		var foc = ctx.options.getFocused();
		if(!foc) return forms.map(f => ({ name: f.name, value: f.hid }));
		foc = foc.toLowerCase()

		if(!forms?.length) return [];

		return forms.filter(f =>
			f.hid.includes(foc) ||
			f.name.toLowerCase().includes(foc) ||
			f.description.toLowerCase().includes(foc)
		).map(f => ({
			name: f.name,
			value: f.hid
		}))
	},
})