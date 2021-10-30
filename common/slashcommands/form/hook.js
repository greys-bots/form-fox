const { events: EVENTS, clearBtns } = require(__dirname + '/../../extras');

module.exports = {data: {
	name: 'hook',
	description: 'Commands for handling form hooks',
	type: 2
}, options: []}

var opts = module.exports.options;

opts.push({
	data: {
		name: 'view',
		description: "View a form's existing hooks",
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
		"[form_id] - View hooks on a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		var hooks = await ctx.client.stores.hooks.getByForm(ctx.guildId, form.hid);
		if(!hooks?.[0]) return "No hooks for that form!";

		return hooks.map(h => {
			return {
				title: `Hook ${h.hid}`,
				description: `Belongs to form ${form.hid}`,
				fields: [
					{name: 'URL', value: h.url},
					{name: 'Events', value: h.events.join(', ')}
				]
			}
		})
	},
	async auto(ctx) {
		var foc = ctx.options.getFocused();
		if(!foc) return;
		foc = foc.toLowerCase()

		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
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
		description: 'Set a hook for a form',
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
				name: 'url',
				description: "The hook's URL",
				type: 3,
				required: true
			}
		]
	},
	usage: [
		"[form_id] [url] - Delete all other hooks and set a new one on a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		var url = ctx.options.get('url').value;
		if(!ctx.client.utils.checkUrl(url)) return "I need a valid URL!";

		var events = await ctx.client.utils.awaitSelection(ctx, EVENTS.map(e => {
			return {label: e, value: e}
		}), "What events do you want this hook to fire on?", {
			min_values: 1, max_values: EVENTS.length,
			placeholder: 'Select events'
		})
		if(typeof events == 'string') return events;
		
		await ctx.client.stores.hooks.deleteByForm(ctx.guildId, form.hid);
		var hook = await ctx.client.stores.hooks.create(ctx.guildId, form.hid, {
			url,
			events
		});

		return `Hook created! ID: ${hook.hid}`;
	},
	async auto(ctx) {
		var foc = ctx.options.getFocused();
		if(!foc) return;
		foc = foc.toLowerCase()

		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
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
		name: 'add',
		description: 'Add a hook to a form',
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
				name: 'url',
				description: "The hook's URL",
				type: 3,
				required: true
			}
		]
	},
	usage: [
		"[form_id] [url] - Add a new hook to a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		var url = ctx.options.get('url').value;
		if(!ctx.client.utils.checkUrl(url)) return "I need a valid URL!";

		var events = await ctx.client.utils.awaitSelection(ctx, EVENTS.map(e => {
			return {label: e, value: e}
		}), "What events do you want this hook to fire on?", {
			min_values: 1, max_values: EVENTS.length,
			placeholder: 'Select events'
		})
		if(typeof events == 'string') return events;
		
		var hook = await ctx.client.stores.hooks.create(ctx.guildId, form.hid, {
			url,
			events
		});

		return `Hook created! ID: ${hook.hid}`;
	},
	async auto(ctx) {
		var foc = ctx.options.getFocused();
		if(!foc) return;
		foc = foc.toLowerCase()

		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
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
		name: 'delete',
		description: "Delete an existing hook",
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
				name: 'hook_id',
				description: "The hook's ID",
				type: 3,
				required: true
			},
		]
	},
	usage: [
		"[form_id] [hook_id] - Delete a hook on a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';
		
		var hid = ctx.options.get('hook_id').value.toLowerCase().trim();
		var hook = await ctx.client.stores.hooks.get(ctx.guildId, form.hid, hid);
		if(!hook) return "Hook not found!";

		await ctx.client.stores.hooks.delete(ctx.guildId, form.hid, hook.hid);

		return 'Hook deleted!'
	},
	async auto(ctx) {
		var foc = ctx.options.getFocused();
		if(!foc) return;
		foc = foc.toLowerCase()

		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
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
		description: "Delete ALL of a form's existing hooks",
		type: 1,
		options: [
			{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: true,
				autocomplete: true
			}
		]
	},
	usage: [
		"[form_id] - Delete all hooks on a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';
		
		var rdata = {
			content: "Are you sure you want to delete ALL hooks on this form?",
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
			await ctx.client.stores.hooks.deleteByForm(ctx.guildId, form.hid);
			msg = 'Hooks cleared!';
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
		var foc = ctx.options.getFocused();
		if(!foc) return;
		foc = foc.toLowerCase()

		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
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