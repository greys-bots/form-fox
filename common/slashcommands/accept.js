const VARIABLES = {
    '$USER': (user, guild) => user,
    '$GUILD': (user, guild) => guild.name,
    '$FORM': (user, guild, form) => form.name,
    '$FORMID': (user, guild, form) => form.id,
}
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
    #bot;
    #stores;

    constructor(bot, stores) {
        super({
            name: 'accept',
            description: "Accept a response",
            type: 3,
            usage: [
                'Right click a message -> `accept`'
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

        var embed = msg.embeds[0];
        embed.color = parseInt('55aa55', 16);
        embed.footer = {text: 'Response accepted!'};
        embed.timestamp = new Date().toISOString();
        embed.author = {
            name: `${ctx.user.username}#${ctx.user.discriminator}`,
            iconURL: ctx.user.avatarURL()
        }

        try {
            post.response.status = 'accepted';
            post.response = await post.response.save()
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

            this.#bot.emit('ACCEPT', post.response);
            await post.delete()
        } catch(e) {
            console.log(e);
            return `ERR! ${e.message || e}\n(Response still accepted!)`;
        }

        return "Response accepted!";
    }
}

module.exports = (bot, stores) => new Command(bot, stores);