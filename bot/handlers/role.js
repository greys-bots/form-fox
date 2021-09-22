const EVENTS = require(__dirname + '/../../common/extras.js').events;

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
			.filter(x => x.events.includes(event))
			.map(x => x.id);

		if(event == 'ACCEPT') {
			for(var i = 0; i < form.questions.length; i++) {
				var q = form.questions[i];
				if(!q.roles?.length) continue;

				for(var r of q.roles) {
					if(ans[i].split('\n').includes(r.choice))
						roles.push(r.id);
				}
			}
		}

		if(roles.length) await member.roles.add(roles);
	}
}

module.exports = (bot) => new RoleHandler(bot);