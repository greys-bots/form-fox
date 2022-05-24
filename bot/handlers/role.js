const {
	events: EVENTS,
	qTypes: TYPES
} = require(__dirname + '/../../common/extras.js');

class RoleHandler {
	constructor(bot) {
		this.bot = bot;

		EVENTS.forEach(e => {
			this.bot.on(e.toUpperCase(), (data) => {
				this.addRoles({
					...data,
					client: this.bot
				}, e.toUpperCase())
			})
		})
	}

	async addRoles(ctx, event) {
		var { form, answers: ans } = ctx;
		var guild = await ctx.client.guilds.fetch(ctx.server_id);
		var member = await guild.members.fetch(ctx.user_id);

		var roles = form.roles
			?.filter(x => x.events.includes(event))
			.map(x => x.id);

		if(event == 'ACCEPT') {
			for(var i = 0; i < form.questions.length; i++) {
				var q = form.questions[i];
				if(!q.roles?.length) continue;

				var rls = TYPES[q.type].handleRoles(q, ans, i);
				roles = roles.concat(rls);
			}
		}

		try {
			if(roles.length) await member.roles.add(roles);
		} catch(e) {
			console.log(
				`Error adding roles for form ${form.hid}`,
				`server ${form.server_id}`,
				`user ${ctx.user_id}`,
				(e.message ?? e)
			);
		}
	}
}

module.exports = (bot) => new RoleHandler(bot);