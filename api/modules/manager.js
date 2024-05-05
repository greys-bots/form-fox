class Manager {
	constructor(bot) {
		this.bot = bot;
	}

	async getGuild(id) {
		try {
			var guild = await this.bot.guilds.fetch(id)
		} catch(e) {
			console.error(e);
			throw e;
		}

		return guild;
	}

	async getPerms(guild, user) {
		try {
			var guild = await this.bot.guilds.fetch(guild);
			var member = await guild.members.fetch(user);
		} catch(e) {
			console.error(e);
			throw e;
		}

		return member.permissions;
	}

	async getRoles(guild) {
		try {
			var guild = await this.bot.guilds.fetch(guild);
			var roles = await guild.roles.fetch();
		} catch(e) {
			console.error(e);
			throw e;
		}

		return roles;
	}

	async getRole(guild, role) {
		try {
			var guild = await this.bot.guilds.fetch(guild);
			var role = await guild.roles.fetch(role);
		} catch(e) {
			console.error(e);
			throw e;
		}

		return role;
	}

	async getChannels(guild) {
		try {
			var guild = await this.bot.guilds.fetch(guild);
			var channels = await guild.channels.fetch();
		} catch(e) {
			console.error(e);
			throw e;
		}

		return channels;
	}

	async getChannel(guild, channel) {
		try {
			var guild = await this.bot.guilds.fetch(guild);
			var channel = await guild.roles.fetch(channel);
		} catch(e) {
			console.error(e);
			throw e;
		}

		return channel;
	}
}

module.exports = (bot) => new Manager(bot);