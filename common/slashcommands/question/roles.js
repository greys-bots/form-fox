const { numbers: NUMS } = require('../../extras');
const TYPES = require('../../questions');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'roles',
			description: "Add roles to a question",
			ephemeral: true,
			guildOnly: true,
			permissions: ['ManageMessages'],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		return "This command has moved to `/actions add`! Please use that command and select the `question:role:add` action type"
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