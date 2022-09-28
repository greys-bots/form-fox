const OPTIONS = require(__dirname + '/../../extras').options;
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'copy',
			description: 'Copy a form and its data',
			options: [
				{
					name: 'form_id',
					description: 'The ID of the form to copy',
					type: 3,
					required: true,
					autocomplete: true
				}
			],
			usage: [
				"[form_id] - Runs a menu to copy a form"
			],
			permissions: ['ManageMessages'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var farg = ctx.options.get('form_id')?.value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, farg);
		if(!form.id) return 'Form not found!';

		var tocopy = await this.#bot.utils.awaitSelection(ctx, OPTIONS.map(o => {
				return {
					label: o.val,
					value: o.val,
					description: o.desc
				}
			}), "What would you like to copy?", {
			min_values: 1, max_values: OPTIONS.length,
			placeholder: 'Select what to copy'
		})
		if(typeof tocopy == 'string') return events;

		var data = {};
		tocopy.forEach(v => data[v] = form[v]);

		try {
			var created = await this.#stores.forms.create({
				server_id: ctx.guildId,
				...data
			});
		} catch(e) {
			return 'ERR! '+e;
		}

		await ctx.editReply({
			content: `Form copied! ID: ${created.hid}\n` +
					 `Use \`/channel ${created.hid}\` to change what channel this form's responses go to!\n` +
					 `See \`/help\` for more customization commands`
		});
		return;
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