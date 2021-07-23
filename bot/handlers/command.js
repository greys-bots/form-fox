class CommandHandler {
	cooldowns = new Map();

	constructor(bot) {
		this.bot = bot;
	}

	async parse(str) {
		var args = str.split(" ");

		if(!args[0]) return undefined;
	
		var command = this.bot.commands.get(this.bot.aliases.get(args[0].toLowerCase()));
		console.log(this.bot.commands)
		if(!command) return {command, args};

		args.shift();

		if(args[0] && command.subcommands?.get(command.sub_aliases.get(args[0].toLowerCase()))) {
			command = command.subcommands.get(command.sub_aliases.get(args[0].toLowerCase()));
			args.shift();
		}
		if(command.groupArgs) args = this.groupArgs(args);

		return {command, args};
	}

	async handle(ctx) {
		var {command, args, msg} = ctx;
		if(command.guildOnly && !msg.guild) return "That command is guild only!";
		if(msg.guild) {
			var check = this.checkPerms(ctx);
			if(!check) return "You don't have permission to use that command!";
		}

		try {
			var res = await command.execute(this.bot, msg, args);
		} catch(e) {
			return Promise.reject(e.message);
		}

		return res;
	}

	checkPerms(ctx) {
		var {command: cmd, msg} = ctx;
		if(cmd.permissions) return msg.member.permissions.has(cmd.permissions);
		return true;
	}

	groupArgs(args) {
		if(typeof args == "object") args = args.join(" ");
		var nargs = [];
		var tmp;
		var regex = /[“”](.+?)[“”]|[‘’](.+?)[‘’]|"(.+?)"|'(.+?)'|(\S+)/gi;
		while(tmp = regex.exec(args)) {
			tmp.splice(1).forEach(m => { if(m) nargs.push(m); });
		}

		return nargs;
	}
}

module.exports = (bot) => new CommandHandler(bot);