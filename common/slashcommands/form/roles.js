const { clearBtns } = require(__dirname + '/../../extras');


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
			required: true
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
			description: form.roles.map(r => `<@&${r}>`).join("\n")
		}]}
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
				required: true
			},
			{
				name: 'roles',
				description: 'The roles you want. Use mentions here',
				type: 3,
				required: true
			}
		]
	},
	usage: [
		"[form_id] [roles] - Set the roles on a form"
	],
	async execute(ctx) {
		var roles = ctx.options.get('roles').value;
		roles = roles.match(/(\d)+/g);
		
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		var groles = await ctx.guild.roles.fetch();
		roles = roles.filter(x => groles.has(x));
		if(!roles) return "Please provide valid roles!";

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {roles});
		
		return 'Form updated!';
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
				required: true
			}, {
				name: 'role',
				description: "The role to add",
				type: 8,
				required: true
			}
		]
	},
	usage: [
		"[form_id] [role] - Add a role to a form"
	],
	async execute(ctx) {
		var role = ctx.options.getRole('role');
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!form.roles) form.roles = [];
		if(form.roles.includes(role.id)) return "Role already added!";
		form.roles.push(role.id);

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {roles: form.roles});
		return "Form updated!";
	}
})

opts.push({
	data: {
		name: 'remove',
		description: 'Remove a role from a form',
		type: 1,
		options: [
			{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: true
			}, {
				name: 'role',
				description: "The role to remove",
				type: 8,
				required: true
			}
		]
	},
	usage: [
		"[form_id] [role] - Remove a role from a form"
	],
	async execute(ctx) {
		var role = ctx.options.getRole('role');
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!form.roles?.[0]) return "No roles to remove!";
		form.roles = form.roles.filter(r => r !== role.id);

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {roles: form.roles});
		return "Form updated!";
	}
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
			required: true
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
			await ctx.client.stores.forms.update(ctx.guildId, form.hid, {roles: []});
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
	}
})