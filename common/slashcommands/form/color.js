const tc = require('tinycolor2');
const { clearBtns } = require('../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'color',
			description: "Changes a form's color",
			options: [
				{
					name: 'form_id',
					description: 'The form\'s ID',
					type: 3,
					required: true,
					autocomplete: true
				},
				{
					name: 'color',
					description: 'The color you want. Omit to view/clear current color',
					type: 3,
					required: false
				}
			],
			usage: [
				"[form_id] - View and optionally clear a form's color",
				"[form_id] [color] - Set a form's color"
			],
			permissions: ['ManageMessages'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var c = ctx.options.get('color')?.value;
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';

		if(!c) {
			if(!form.color) return 'Form has no color set!';

			var rdata = {
				embeds: [
					{
						description: `Current color: **#${form.color}.**`,
						color: parseInt(form.color, 16)
					}
				],
				components: [
					{
						type: 1,
						components: clearBtns
					}
				]
			}
			await ctx.reply(rdata);

			var reply = await ctx.fetchReply();
			var conf = await this.#bot.utils.getConfirmation(this.#bot, reply, ctx.user);
			var msg;
			if(conf.msg) {
				msg = conf.msg;
			} else {
				form.color = null;
				await form.save()
				msg = 'Color reset!';
			}

			return msg;
		}
		
		var color = tc(c);
		if(!color.isValid()) return 'That color isn\'t valid!';

		color = color.toHex();
		form.color = color;
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