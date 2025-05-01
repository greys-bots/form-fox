const {
	textVars: VARIABLES
} = require('../extras');
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
            opPerms: ['MANAGE_RESPONSES'],
            v2: true
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

        var embed = msg.components[0];
        embed.accent_color = parseInt('55aa55', 16);
        embed.components = embed.components.concat([
            {
                type: 14
            },
            {
                type: 10,
                content: `Response accepted <t:${Math.floor(new Date().getTime() / 1000)}:F>`
            },
            {
                type: 10,
                content: `Accepted by ${ctx.user} (${ctx.user.tag} | ${ctx.user.id})`
            }
        ])

        try {
            post.response.status = 'accepted';
            post.response = await post.response.save()
            await msg.edit({components: [embed]});
            await msg.reactions.removeAll();

            var welc = post.response.form.message;
            if(welc) {
                for(var key of Object.keys(VARIABLES)) {
                    welc = welc.replace(key, VARIABLES[key](u2, ctx.guild, post.response.form, post.response));
                }
            }

            await u2.send({
                flags: ['IsComponentsV2'],
                components: [{
                    type: 17,
                    accent_color: parseInt('55aa55', 16),
                    components: [
                        {
                            type: 10,
                            content: `## Response accepted!\n${welc ?? ''}`
                        },
                        {
                            type: 10,
                            content:
                                `**Server:** ${msg.channel.guild.name} (${msg.channel.guild.id})\n` +
                                `**Form:** ${post.response.form.name} (${post.response.form.hid})\n` +
                                `**Response ID:** ${post.response.hid}` 
                        },
                        {
                            type: 10,
                            content: `-# Received <t:${Math.floor(new Date().getTime() / 1000)}:F>`
                        }
                    ]
                }]
            });

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