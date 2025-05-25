const { clearBtns } = require('../../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'note',
			description: "Changes a form's response note. This appears at the top of every received response",
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
					name: 'note',
					description: 'The note or text to send when a new response is received',
					type: 3,
					required: false
				}
			],
			usage: [
				"[form_id] - View and optionally reset a form's note",
				"[form_id] [note] - Set a form's note"
			],
			extra: 
				"Variables available:\n" +
				"$USER - ping the user who opened the response\n" +
				"$USERTAG - insert the user's tag\n" +
				"$USERID - insert the user's ID\n" +
				"$GUILD - the guild's name\n" +
				"$COUNT - the guild's member count\n" +
				"$FORM - the form's name\n" +
				"$FORMID - the form's ID\n" +
				"$RESPONSE - the response's ID",
			permissions: ['ManageMessages'],
			guildOnly: true,
			v2: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		await ctx.deferReply();
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var n = ctx.options.get('note')?.value;
		var form = await this.#stores.forms.get(ctx.guild.id, id);;
		if(!form) return 'Form not found!';

		if(!n) {
			if(!form.note) return 'That form has no note set!';

			var rdata = {
				flags: ['IsComponentsV2'],
				components: [
					{
						type: 17,
						components: [{
							type: 10,
							content: `### Current note\n${form.note}`
						}]
					},
					{
						type: 1,
						components: clearBtns
					}
				]
			}
			await ctx.followUp(rdata);

			var reply = await ctx.fetchReply();
			var conf = await ctx.client.utils.getConfirmation(ctx.client, reply, ctx.user);
			if(conf.msg) return conf.msg;
			
			form.note = undefined;
			await form.save();
			return 'Note cleared!';
		}
		
		form.note = n;
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