module.exports = {
	data: {
		name: 'accept',
		description: '',
		type: 3
	},
	description: "Accept a response",
	usage: [
		'Right click a message -> `accept`'
	],
	async execute(ctx) {
		var msg = ctx.options.getMessage('message');
		var post = await ctx.client.stores.responsePosts.get(ctx.guild.id, msg.channel.id, msg.id);
		if(!post) return "Only use this for a pending response message!";

		var u2 = await ctx.client.users.fetch(post.response.user_id);
        if(!u2) return "ERR! Couldn't fetch that response's user!";

		var embed = msg.embeds[0];
        embed.color = parseInt('55aa55', 16);
        embed.footer = {text: 'Response accepted!'};
        embed.timestamp = new Date().toISOString();
        embed.author = {
        	name: `${ctx.user.username}#${ctx.user.discriminator}`,
        	iconURL: ctx.user.avatarURL()
        }

        try {
            await ctx.client.stores.responsePosts.delete(msg.channel.guild.id, msg.channel.id, msg.id);
            post.response = await ctx.client.stores.responses.update(msg.channel.guild.id, post.response.hid, {status: 'accepted'});
            await msg.edit({embeds: [embed], components: []});
            await msg.reactions.removeAll();

            var welc = post.response.form.message;
            if(welc) {
                for(var key of Object.keys(VARIABLES)) {
                    welc = welc.replace(key, eval(VARIABLES[key]));
                }
            }

            await u2.send({embeds: [{
                title: 'Response accepted!',
                description: welc,
                fields: [
                	{name: 'Server', value: `${msg.channel.guild.name} (${msg.channel.guild.id})`},
                	{name: 'Form name', value: `${post.response.form.name}`},
                	{name: 'Form ID', value: `${post.response.form.hid}`},
                	{name: 'Response ID', value: `${post.response.hid}`}
                ],
                color: parseInt('55aa55', 16),
                timestamp: new Date().toISOString()
            }]});

            ctx.client.emit('ACCEPT', post.response);
        } catch(e) {
            console.log(e);
            return `ERR! ${e.message || e}\n(Response still accepted!)`;
        }

		return "Response accepted!";
	},
	permissions: ['MANAGE_MESSAGES'],
	opPerms: ['MANAGE_RESPONSES']
}