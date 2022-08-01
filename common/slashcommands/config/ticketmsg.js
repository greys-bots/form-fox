const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'ticketmsg',
			description: 'Set a message to send in created ticket channels',
			options: [
				{
					name: 'message',
					description: 'The message to set',
					type: 3,
					required: true
				},
				{
					name: 'form_id',
					description: "ID of a form to change",
					type: 3,
					required: false,
					autocomplete: true
				}
			],
			usage: [
				"[message] - Set the default ticket message for all forms",
				"[channel] [form_id] - Set the ticket message for a form"
			],
			extra: 
				"Variables available:\n" +
				"$USER - ping the user who opened the response\n" +
				"$GUILD - the guild's name\n" +
				"$FORM - the form's name\n" +
				"$FORMID - the form's ID\n" +
				"Example message: `Hello $USER! This ticket " +
				"has been opened to discuss your response to " +
				"form $FORMID ($FORM)`",
			guildOnly: true
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var farg = ctx.options.getString('form_id')?.toLowerCase().trim();
		var tmsg = ctx.options.getString('message');

		if(farg) {
			var form = await this.#stores.forms.get(ctx.guildId, farg);
			if(!form.id) return 'Form not found!';

			form.ticket_msg = tmsg;
			await form.save()
			return "Form updated!";
		}

		var cfg = await this.#stores.configs.get(ctx.guildId);
		cfg.ticket_message = tmsg;
		await cfg.save()
		
		return "Config updated!";
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