const fetch = require('node-fetch');
const { confBtns } = require(__dirname + '/../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'import',
			description: "Import forms",
			options: [{
				name: 'url',
				description: "The .json URL to import",
				type: 3,
				required: true
			}],
			usage: [
				"[url] - Import forms using the file provided"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var url = ctx.options.get('url').value.trim();
		var data;
		try {
			data = (await (await fetch(url)).json());
		} catch(e) {
			console.log(e);
			return "Please link a valid .json file!";
		}
		if(!data.length || !Array.isArray(data)) return "Data should be an array of forms!";
		if(data.length > 100) return "You can only import up to 100 forms at a time!";

		var rdata = {
			content: "WARNING: This will overwrite your existing data. Are you sure you want to import these forms?",
			components: [
				{
					type: 1,
					components: confBtns
				}
			]
		}
		var reply = await ctx.reply({...rdata, fetchReply: true});
		var conf = await this.#bot.utils.getConfirmation(this.#bot, reply, ctx.user);
		var msg;
		if(conf.msg) {
			msg = conf.msg;
		} else {
			var results = await this.#stores.forms.import(ctx.guild.id, data);
			msg = "Forms imported!\n" +
				  `Updated: ${results.updated}\n` +
				  `Created: ${results.created}\n` +
				  `Failed: ${results.failed?.length ?? 0}\n`;
			if(results.failed.length) msg += results.failed.join("\n");
		}

		return msg;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);