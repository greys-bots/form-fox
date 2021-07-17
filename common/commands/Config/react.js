const { confirmReacts: REACTS } = require('../../extras');
const VALS = ["1", "true", "y", "yes", "enable", "✅"];

module.exports = {
	help: () => "Set if the bot should remove form reacts",
	usage: () =>[
		" - Views and optically clears current value",
		" [true|false] - Sets the value"
	],
	execute: async (bot, msg, args) => {
		var cfg = await bot.stores.configs.get(msg.guild.id);
		if(!cfg) cfg = {};

		if(!args[0]) {
			if(!cfg.reacts && cfg.reacts != false)
				return "Value isn't set!";

			var message = await msg.channel.send("Current value: ${cfg.reacts}\nDo you want to clear it?");
			REACTS.forEach(r => message.react(r));
			var conf = await bot.utils.getConfirmation(bot, message, msg.author);
			if(conf.msg) return conf.msg;

			await bot.stores.configs.update(msg.guild.id, {reacts: true});
			return "Config reset!";
		}

		var val;
		if(VALS.t.includes(args[0].toLowerCase())) val = true;
		else val = false;

		if(!cfg.server_id) await bot.stores.configs.create(msg.guild.id, {reacts: val});
		else await bot.stores.configs.update(msg.guild.id, {reacts: val});

		return "Config updated!"
	}
}