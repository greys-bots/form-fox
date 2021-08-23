const { Collection } = require('discord.js');
const fs 			 = require('fs');

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const recursivelyReadDirectory = (dir) => {
	var results = [];
	var files = fs.readdirSync(dir, {withFileTypes: true});
	for(file of files) {
		if(file.isDirectory()) {
			results = results.concat(recursivelyReadDirectory(dir+"/"+file.name));
		} else {
			results.push(dir+"/"+file.name);
		}
	}

	return results;
}

const loadCommands = (path) => {
	var modules = new Collection();
	var mod_aliases = new Collection();
	var commands = new Collection();
	var aliases = new Collection();

	var files = recursivelyReadDirectory(path);

	for(f of files) {
		var path_frags = f.replace(path, "").split(/(?:\\|\/)/);
		var mod = path_frags.length > 1 ? path_frags[path_frags.length - 2] : "Unsorted";
		var file = path_frags[path_frags.length - 1];
		if(!modules.get(mod.toLowerCase())) {
			var mod_info = require(file == "__mod.js" ? f : f.replace(file, "__mod.js"));
			modules.set(mod.toLowerCase(), {...mod_info, name: mod, commands: new Collection()})
			mod_aliases.set(mod.toLowerCase(), mod.toLowerCase());
			if(mod_info.alias) mod_info.alias.forEach(a => mod_aliases.set(a, mod.toLowerCase()));
		}
		if(file == "__mod.js") continue;

		mod = modules.get(mod.toLowerCase());
		if(!mod) {
			console.log("Whoopsies");
			continue;
		}

		var command = require(f);
		command.module = mod;
		command.name = file.slice(0, -3).toLowerCase();
		command = registerSubcommands(command, mod);
		commands.set(command.name, command);
		mod.commands.set(command.name, command);
		aliases.set(command.name, command.name);
		if(command.alias) command.alias.forEach(a => aliases.set(a, command.name));
	}

	return {modules, mod_aliases, commands, aliases};
}

const registerSubcommands = function(command, module, name) {	
	if(command.subcommands) {
		var subcommands = command.subcommands;
		command.subcommands = new Collection();
		Object.keys(subcommands).forEach(c => {
			var cmd = subcommands[c];
			cmd.name = `${command.name} ${c}`;
			cmd.parent = command;
			cmd.module = command.module;
			if(!command.sub_aliases) command.sub_aliases = new Collection();
			command.sub_aliases.set(c, c);
			if(cmd.alias) cmd.alias.forEach(a => command.sub_aliases.set(a, c));
			if(command.permissions && !cmd.permissions) cmd.permissions = command.permissions;
			if(command.guildOnly != undefined && cmd.guildOnly == undefined)
				cmd.guildOnly = command.guildOnly;
			command.subcommands.set(c, cmd);
		})
	}
	return command;
}

const genCode = function(table, num = 4) {
	var string = "";
	for(var i = 0; i < num; i++) {
		string += table[Math.floor(Math.random() * (table.length))];
	}

	return string;
}

module.exports = {
	recursivelyReadDirectory,
	loadCommands,
	registerSubcommands,
	genCode,

	dayDiff: (d1, d2) => {
    	d1 = new Date(d1);
    	d2 = new Date(d2);
    	return Math.ceil((d2.getTime() - d1.getTime()) / DAY);
    },
    checkUrl(string) {
    	// regex credit: https://stackoverflow.com/a/17773849
    	return string.match(/([0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/)
    }
}