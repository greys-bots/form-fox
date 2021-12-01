const { events: EVENTS, clearBtns } = require(__dirname + '/../../extras');

module.exports = {data: {
	name: 'roles',
	description: 'Manage roles added to users when applying to forms',
	type: 2
}, options: []}

var opts = module.exports.options;

opts.push({
	data: {
		name: 'view',
		description: "View a form's set roles",
		type: 1,
		options: [{
			name: 'form_id',
			description: "The form's ID",
			type: 3,
			required: true,
			autocomplete: true
		}]
	},
	usage: [
		"[form_id] - View roles on a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!form.roles?.[0]) return "No roles for that form!";
		
		return {embeds: [{
			title: `${form.name} - Roles`,
			description: form.roles.map(r => `<@&${r.id}>`).join("\n")
		}]}
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
		name: 'set',
		description: "Set the roles for a form",
		type: 1,
		options: [
			{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: true,
				autocomplete: true
			},
			{
				name: 'roles',
				description: 'The roles you want. Use mentions here',
				type: 3,
				required: true
			},
			{
				name: 'event',
				description: "The event the roles should be added on",
				type: 3,
				required: true,
				choices: EVENTS.map(e => ({
					name: e,
					value: e.toUpperCase()
				}))
			}
		]
	},
	usage: [
		"[form_id] [roles] - Set the roles on a form"
	],
	async execute(ctx) {
		var roles = ctx.options.resolved.roles;
		if(!roles?.size) return "Please provide valid roles!";
		var event = ctx.options.getString('event');
		
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		roles = roles.map(r => ({id: r.id, events: [event]}));

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {roles: JSON.stringify(roles)});
		
		return 'Form updated!';
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
	guildOnly: true
})

opts.push({
	data: {
		name: 'add',
		description: 'Add a role to a form',
		type: 1,
		options: [
			{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: true,
				autocomplete: true
			},
			{
				name: 'roles',
				description: "The roles to add",
				type: 3,
				required: true
			},
			{
				name: 'event',
				description: "The event the roles should be added on",
				type: 3,
				required: true,
				choices: EVENTS.map(e => ({
					name: e,
					value: e.toUpperCase()
				}))
			}
		]
	},
	usage: [
		"[form_id] [roles] - Add roles to a form"
	],
	async execute(ctx) {
		var roles = ctx.options.resolved.roles;
		if(!roles?.size) return "Please provide at least one valid role!";
		var event = ctx.options.getString('event');
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!form.roles) form.roles = [];
		roles = roles.filter(r => !form.roles.find(x => x.id == r.id)).map(r => ({id: r.id, events: [event]}));
		form.roles = form.roles.concat(roles);

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {roles: JSON.stringify(form.roles)});
		return "Form updated!";
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
		description: 'Remove roles from a form',
		type: 1,
		options: [
			{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: true,
				autocomplete: true
			}, {
				name: 'roles',
				description: "The roles to remove",
				type: 3,
				required: true
			}
		]
	},
	usage: [
		"[form_id] [roles] - Remove roles from a form"
	],
	async execute(ctx) {
		var roles = ctx.options.resolved.roles;
		if(!roles?.size) return "Please provide at least one valid role!";
		roles = roles.map(r => r.id);
		
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!form.roles?.[0]) return "No roles to remove!";
		form.roles = form.roles.filter(r => !roles.includes(r.id));

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {roles: JSON.stringify(form.roles)});
		return "Form updated!";
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
		description: "Clear all roles on a form",
		type: 1,
		options: [{
			name: 'form_id',
			description: "The form's ID",
			type: 3,
			required: true,
			autocomplete: true
		}]
	},
	usage: [
		"[form_id] - Remove all roles from a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';
		
		var rdata = {
			content: "Are you sure you want to clear ALL roles on this form?",
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
			await ctx.client.stores.forms.update(ctx.guildId, form.hid, {roles: JSON.stringify([])});
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
			})
		} else {
			await ctx.editReply({
				content: msg,
				embeds: [],
				components: [{
					type: 1,
					components: clearBtns.map(b => {
						return {... b, disabled: true};
					})
				}]
			})
		}
		return;
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