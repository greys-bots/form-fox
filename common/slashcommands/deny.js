const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
    #bot;
    #stores;

    constructor(bot, stores) {
        super({
            name: 'deny',
            description: "Deny a response",
            type: 3,
            usage: [
                'Right click a message -> `deny`'
            ],
            permissions: ['ManageMessages'],
            opPerms: ['MANAGE_RESPONSES']
        })
        this.#bot = bot;
        this.#stores = stores;
    }

    async execute(ctx) {
        var msg = ctx.options.getMessage('message');
        var post = await this.#stores.responsePosts.get(ctx.guild.id, msg.channel.id, msg.id);
        if(!post) return "Only use this for a pending response message!";

        var u2 = await this.#bot.users.fetch(post.response.user_id);
        if(!u2) return "ERR! Couldn't fetch that response's user!";

        var reason;
        await ctx.reply([
            'Would you like to give a denial reason?\n',
            'Type `skip` to skip adding one, or ',
            '`cancel` to cancel the denial!'
        ].join(''));
        var resp = await msg.channel.awaitMessages({filter: m => m.author.id == ctx.user.id, time: 2 * 60 * 1000, max: 1});
        if(!resp?.first()) return await msg.channel.send('Err! Timed out!');
        resp = resp.first().content;
        if(resp.toLowerCase() == 'cancel') return await msg.channel.send('Action cancelled!');
        if(resp.toLowerCase() == 'skip') reason = '*(no reason given)*';
        else reason = resp;

        var embed = msg.embeds[0];
        embed.color = parseInt('aa5555', 16);
        embed.footer = {text: 'Response denied!'};
        embed.timestamp = new Date().toISOString();
        embed.author = {
            name: `${ctx.user.username}#${ctx.user.discriminator}`,
            iconURL: ctx.user.avatarURL()
        }

        try {
            post.response.status = 'denied';
            post.response = await post.response.save();
            await msg.edit({embeds: [embed], components: []});
            await msg.reactions.removeAll();

            await u2.send({embeds: [{
                title: 'Response denied!',
                description: [
                    `Server: ${msg.channel.guild.name} (${msg.channel.guild.id})`,
                    `Form name: ${post.response.form.name}`,
                    `Form ID: ${post.response.form.hid}`,
                    `Response ID: ${post.response.hid}`
                ].join("\n"),
                fields: [{name: 'Reason', value: reason}],
                color: parseInt('aa5555', 16),
                timestamp: new Date().toISOString()
            }]})

            this.#bot.emit('DENY', post.response);
            await post.delete();
        } catch(e) {
            console.log(e);
            return 'ERR! Response denied, but couldn\'t message the user!';
        }

        return "Response denied!";
    }
}

module.exports = (bot, stores) => new Command(bot, stores);