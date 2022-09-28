const { clearBtns } = require('../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'message',
			description: "Changes a form's acceptance message",
			options: [
				{
					name: 'form_id',
					description: 'The form\'s ID',
					type: 3,
					required: true,
					autocomplete: true
				},
				{
					name: 'message',
					description: 'The new acceptance message. Omit to view/clear current value',
					type: 3,
					required: false
				}
			],
			usage: [
				"[form_id] - View and optionally clear a form's message",
				"[form_id] [message] - Set a form's message"
			],
			extra: 
				"Variables available:\n" +
				"$USER - ping the user who opened the response\n" +
				"$GUILD - the guild's name\n" +
				"$FORM - the form's name\n" +
				"$FORMID - the form's ID",
			permissions: ['ManageMessages'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var m = ctx.options.get('message')?.value;
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';

		if(!m) {
			if(!form.message) return 'Form has no message set!';

			var rdata = {
				embeds: [
					{
						title: 'Message',
						description: form.message
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
				form.message = null;
				await form.save()
				msg = 'Message reset!';
			}

			return msg;
		}

		if(m.length > 1000) return "Message length must be 1000 or less!"

		form.message = m;
		await form.save()
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