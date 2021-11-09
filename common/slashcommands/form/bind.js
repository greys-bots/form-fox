module.exports = {
	data: {
		name: 'bind',
		description: "Bind a form's apply react to a message",
		options: [
			{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: true,
				autocomplete: true
			},
			{
				name: 'msg_id',
				description: "The message to bind to",
				type: 3,
				required: true
			},
			{
				name: 'channel',
				description: "The channel the message belongs to. Defaults to the command channel",
				type: 7,
				required: false,
				channel_types: [0, 5, 10, 11, 12]
			}
		]
	},
	usage: [
		"[form_id] [msg_id] - Bind a form react to a message in the same channel",
		"[form_id] [msg_id] [channel] - Bind a form react to a message in another channel"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		var channel;
		var ch = ctx.options.getChannel('channel');
		if(ch && ['GUILD_TEXT', 'GUILD_NEWS'].includes(ch.type)) channel = ch;
		else channel = ctx.channel;

		var mid = ctx.options.get('msg_id').value.trim();
		var msg;
		try {
			msg = await channel.messages.fetch(mid);
		} catch(e) {
			return 'Message not found!';
		}

		var post = await ctx.client.stores.formPosts.get(ctx.guildId, channel.id, msg.id);
		if(post && !post.bound) return 'That is a dedicated post and cannot be bound to!';

		post = (await ctx.client.stores.formPosts.getByMessage(ctx.guildId, msg.id))
			?.find(p => p.form.emoji == form.emoji);
		if(post) return 'Form with that emoji already bound to that message!';

		await ctx.client.stores.formPosts.create(ctx.guildId, channel.id, msg.id, {
			form: form.hid,
			bound: true
		});
		msg.react(form.emoji || '📝');

		return 'Bound!'
	},
	async auto(ctx) {
		var foc = ctx.options.getFocused();
		if(!foc) return;
		foc = foc.toLowerCase()

		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
		if(!forms?.length) return [];

		return forms.filter(f =>
			f.hid.includes(foc) ||
			f.name.toLowerCase().includes(foc) ||
			f.description.toLowerCase().includes(foc)
		).map(f => ({
			name: f.name,
			value: f.hid
		}))
	},
	epphemeral: true
}