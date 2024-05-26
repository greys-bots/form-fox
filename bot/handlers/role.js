const {
	events: EVENTS
} = require(__dirname + '/../../common/extras.js');
const TYPES = require(__dirname + '/../../common/questions');

class RoleHandler {
	constructor(bot) {
		this.bot = bot;

		EVENTS.forEach(e => {
			this.bot.on(e.toUpperCase(), (data) => {
				this.handleRoles({
					...data,
					client: this.bot
				}, e.toUpperCase())
			})
		})
	}

	async handleRoles(ctx, event) {
		var { form, answers: ans } = ctx;
		var guild = await ctx.client.guilds.fetch(ctx.server_id);
		var member = await guild.members.fetch(ctx.user_id);

		if(Array.isArray(form.roles)) await form.fixRoles();
		var tmp = form.roles?.[event] ?? [];
		var add = [];
		var remove = [];
		for(var r of tmp) {
			if(r.action == 'add') add.push(r.id);
			if(r.action == 'remove') remove.push(r.id);
		}

		if(event == 'ACCEPT') {
			for(var i = 0; i < form.questions.length; i++) {
				var q = form.questions[i];
				if(!q.roles?.length) continue;

				var rls = TYPES[q.type].handleRoles(q, ans, i);
				add = add.concat(rls);
			}
		}

		try {
			if(add.length) await member.roles.add(add);
			if(remove.length) await member.roles.remove(remove);
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