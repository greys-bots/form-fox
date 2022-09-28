const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'applychannel',
			description: "Set the proper channel for users to apply to a form if using commands",
			options: [
				{
					name: 'form_id',
					description: 'The form\'s ID',
					type: 3,
					required: true,
					autocomplete: true
				},
				{
					name: 'channel',
					description: 'The channel to set',
					type: 7,
					required: true,
					channel_types: [0, 5, 10, 11, 12]
				}
			],
			usage: [
				"[form_id] [channel] - Sets the apply channel for the given form"
			],
			permissions: ['ManageMessages'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var channel = ctx.options.getChannel('channel');
		var id = ctx.options.getString('form_id')?.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';

		if(!channel) {
			if(!form.apply_channel) return 'Form has no apply channel set!';

			var rdata = {
				embeds: [
					{
						description: `Current channel: <#${form.apply_channel}>`
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
				form.apply_channel = null;
				await form.save()
				msg = 'Apply channel reset!';
			}

			return msg;
		}

		var exists = await this.#stores.forms.getByApplyChannel(ctx.guild.id, channel.id);
		if(exists) return 'Another form already has that channel set!';

		form.apply_channel = channel.id;
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