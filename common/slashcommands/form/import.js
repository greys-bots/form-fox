const fetch = require('node-fetch');
const { confBtns } = require(__dirname + '/../../extras');

module.exports = {
	data: {
		name: 'import',
		description: "Import forms",
		options: [{
			name: 'url',
			description: "The .json URL to import",
			type: 3,
			required: true
		}]
	},
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
		var conf = await ctx.client.utils.getConfirmation(ctx.client, reply, ctx.user);
		var msg;
		if(conf.msg) {
			msg = conf.msg;
		} else {
			if(conf.interaction) await conf.interaction.deferUpdate();
			var results = await ctx.client.stores.forms.import(ctx.guildId, data);
			msg = "Forms imported!\n" +
				  `Updated: ${results.updated}\n` +
				  `Created: ${results.created}\n` +
				  `Failed: ${results.failed?.length ?? 0}\n`;
			if(results.failed.length) msg += results.failed.join("\n");
		}

		if(conf.interaction) {
			await conf.interaction.editReply({
				content: msg,
				embeds: [],
				components: [{
					type: 1,
					components: confBtns.map(b => {
						return {... b, disabled: true};
					})
				}]
			})
		} else {
			await ctx.editReply({
				content: msg,
				embeds: [],
				components: [{
					type: 1,
					components: confBtns.map(b => {
						return {... b, disabled: true};
					})
				}]
			})
		}
	}
}