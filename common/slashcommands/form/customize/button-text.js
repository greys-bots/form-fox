const { clearBtns } = require('../../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'button-text',
			description: "Changes a form's button text",
			type: 1,
			options: [
				{
					name: 'form_id',
					description: 'The form\'s ID',
					type: 3,
					required: true,
					autocomplete: true
				},
				{
					name: 'text',
					description: 'The text to use for the button',
					type: 3,
					required: true
				}
			],
			usage: [
				"[form_id] [test] - Set a form's button text"
			],
			permissions: ['ManageMessages'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		await ctx.deferReply();
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var n = ctx.options.get('text')?.value;
		var form = await this.#stores.forms.get(ctx.guild.id, id);;
		if(!form) return 'Form not found!';

		if(!n) return "Text required!";
		if(n.length > 80) return "Button text must be 80 characters or less!"

		form.button_text = n;
		await form.save();
		return 'Form updated!';
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