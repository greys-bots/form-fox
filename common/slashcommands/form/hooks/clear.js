const { events: EVENTS, clearBtns } = require(__dirname + '/../../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
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
			],
			usage: [
				"[form_id] - Delete all hooks on a form"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';
		
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
		var conf = await this.#bot.utils.getConfirmation(this.#bot, reply, ctx.user);
		var msg;
		if(conf.msg) {
			msg = conf.msg;
		} else {
			await this.#stores.hooks.deleteByForm(ctx.guildId, form.hid);
			msg = 'Hooks cleared!';
		}

		return msg;
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