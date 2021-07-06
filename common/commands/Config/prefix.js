const {confirmReacts: REACTS } = require('../../extras');

module.exports = {
	help: ()=> "Change the bot's prefix in your server",
	usage: ()=> [
		" - Views and optionally clears the current prefix",
		" [prefix] - Sets a new prefix"
	],
	execute: async (bot, msg, args) => {
		var cfg = await bot.stores.configs.get(msg.guild.id);
		if(!cfg) cfg = {prefix: "", new: true};

		if(!args[0]) {
			if(!cfg.prefix) return 'No prefix set!';

			var message = await msg.channel.send(`Current prefix: ${cfg.prefix}\nWould you like to clear it?`);
			REACTS.forEach(r => message.react(r));

			var conf = await bot.utils.getConfirmation(bot, message, msg.author);
			if(conf.msg) return conf.msg;

			await bot.stores.configs.update(msg.guild.id, { prefix: null });
			return 'Prefix reset!';
		}

		if(cfg.new) await bot.stores.configs.create(msg.guild.id, { prefix: args[0].toLowerCase() });
		else await bot.stores.configs.update(msg.guild.id, { prefix: args[0].toLowerCase() });

		return 'Prefix changed!';
	},
	guildOnly: true,
	permissions: ['MANAGE_GUILD']
}