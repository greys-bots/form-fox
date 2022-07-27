const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'view',
			description: 'View existing forms',
			options: [
				{
					name: "form_id",
					description: "The form's ID",
					type: 3,
					required: false,
					autocomplete: true
				}
			],
			usage: [
				"- View all forms",
				"[form_id] - View a specific form"
			],
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var arg = ctx.options.get('form_id')?.value.toLowerCase().trim();
		if(!arg) {
			var forms = await this.#stores.forms.getAll(ctx.guildId);
			if(!forms?.[0]) return 'No forms available';

			var embeds = [];
			for(var f of forms) {
				console.log(f.roles)
				var responses = await this.#stores.responses.getByForm(ctx.guildId, f.hid);
				embeds.push({
					title: `${f.name} (${f.hid}) ` +
						   `${f.emoji?.includes(':') ? '<' + f.emoji + '>' : f.emoji || '📝'}`,
					description: f.description,
					fields: [
						{name: "Message", value: f.message || "*(not set)*"},
						{name: "Channel", value: f.channel_id ? `<#${f.channel_id}>` : '*(not set)*'},
						{name: "Response count", value: responses?.length.toString() || "0"},
						{name: "Roles", value: f.roles?.[0]? f.roles.map(r => `<@&${r.id}>`).join("\n") : "*(not set)*"}
					],
					color: parseInt(!f.open ? 'aa5555' : f.color || '55aa55', 16)
				})
			}

			if(embeds.length > 1) for(var i = 0; i < embeds.length; i++) embeds[i].title += ` (${i+1}/${embeds.length})`;
			return embeds;
		}

		var form = await this.#stores.forms.get(ctx.guildId, arg);
		if(!form.id) return 'Form not found!';
		console.log(form.roles)

		
		var responses = await this.#stores.responses.getByForm(ctx.guildId, form.hid);
		return {embeds: [{
			title: `${form.name} (${form.hid}) ` +
				   `${form.emoji?.includes(':') ? '<' + form.emoji + '>' : form.emoji || '📝'}`,
			description: form.description,
			fields: [
				{name: "Message", value: form.message || "*(not set)*"},
				{name: "Channel", value: form.channel_id ? `<#${form.channel_id}>` : '*(not set)*'},
				{name: "Response count", value: responses?.length.toString() || "0"},
				{name: "Roles", value: form.roles?.[0] ? form.roles.map(r => `<@&${r.id}>`).join("\n") : "*(not set)*"}
			],
			color: parseInt(!form.open ? 'aa5555' : form.color || '55aa55', 16)
		}]}
	}

	async auto(ctx) {
		var forms = await this.#stores.forms.getAll(ctx.guild.id);
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
	}
}

module.exports = (bot, stores) => new Command(bot, stores);