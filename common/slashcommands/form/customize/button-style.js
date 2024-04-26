const { clearBtns } = require('../../../extras');
const { Models: { SlashCommand } } = require('frame');

const COMPS = [
	{
		type: 1,
		components: [
			{
				type: 2,
				style: 1,
				label: "Button 1",
				custom_id: "style-1"
			},
			{
				type: 2,
				style: 2,
				label: "Button 2",
				custom_id: "style-2"
			},
			{
				type: 2,
				style: 3,
				label: "Button 3",
				custom_id: "style-3"
			},
			{
				type: 2,
				style: 4,
				label: "Button 4",
				custom_id: "style-4"
			}
		]
	}
]

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'button-style',
			description: "Changes a form's button style",
			type: 1,
			options: [
				{
					name: 'form_id',
					description: 'The form\'s ID',
					type: 3,
					required: true,
					autocomplete: true
				}
			],
			usage: [
				"[form_id] - Set a form's button style"
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
		var form = await this.#stores.forms.get(ctx.guild.id, id);;
		if(!form) return 'Form not found!';

		var m = await ctx.followUp({
			content: "Select your desired button style by pressing a button below!",
			components: COMPS,
			fetchReply: true
		})

		var rx;
		try{
			rx = await m.awaitMessageComponent({
				filter: (x) => x.user.id == ctx.user.id && x.customId.startsWith('style-'),
				time: 3 * 60 * 1000
			})

			await rx.update({
				components: [{
					type: 1,
					components: COMPS[0].components.map(x => {
						x.disabled = true;
						return x;
					})
				}]
			})
		} catch(e) {
			console.log(e.message ?? e);
			return "Err: Timed out";
		}

		form.button_style = parseInt(rx.customId.replace('style-', ''));
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