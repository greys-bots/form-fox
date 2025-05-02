const { clearBtns } = require('../../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'ticket-format',
			description: "Changes a form's ticket channel name format",
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
					name: 'format',
					description: 'The format to use for ticket channel names',
					type: 3,
					required: false
				}
			],
			usage: [
				"[form_id] - View and optionally reset a form's ticket channel format",
				"[form_id] [format] - Set a form's ticket channel format"
			],
			extra: 
				"Variables available:\n" +
				"$USER - ping the user who opened the response\n" +
				"$USERTAG - insert the user's tag\n" +
				"$USERID - insert the user's ID\n" +
				"$COUNT - the guild's member count\n" +
				"$FORMID - the form's ID\n" +
				"$RESPONSE - the response's ID",
			permissions: ['ManageMessages'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		await ctx.deferReply();
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var n = ctx.options.get('format')?.value;
		var form = await this.#stores.forms.get(ctx.guild.id, id);;
		if(!form) return 'Form not found!';

		if(!n) {
			if(!form.ticket_format) return 'That form has no format set!';

			var rdata = {
				flags: ['IsComponentsV2'],
				components: [
					{
						type: 17,
						components: [{
							type: 10,
							content: `### Current format\n${form.ticket_format}`
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
			
			form.ticket_format = undefined;
			await form.save();
			return 'Note cleared!';
		}
		
		form.ticket_format = n;
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