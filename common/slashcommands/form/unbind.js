module.exports = {
	name: 'unbind',
	description: "Unbind a form's apply react from a message",
	options: [
		{
			name: 'form_id',
			description: "The form's ID",
			type: 3,
			required: true
		},
		{
			name: 'msg_id',
			description: "The message to unbind from",
			type: 3,
			required: true
		},
		{
			name: 'channel',
			description: "The channel the message belongs to. Defaults to the command channel",
			type: 7,
			required: false
		}
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

		var post = await ctx.client.stores.formPosts.getBound(ctx.guildId, msg.id, form.hid);
		if(!post) return "That form isn't bound to that post!";

		var react = msg.reactions.cache.find(r => [r.emoji.name, r.emoji.identifier].includes(form.emoji || '📝'));
		react.remove();

		await ctx.client.stores.formPosts.delete(ctx.guildId, channel.id, msg.id);
		return 'Unbound!'
	}
}