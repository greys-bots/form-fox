const { Models: { SlashCommand } } = require('frame');
const {
    denyBtns: DENY
} = require('../extras');
const MODALS = {
    DENY: (value) => ({
        title: "Deny reason",
        custom_id: 'deny_reason',
        components: [{
            type: 1,
            components: [{
                type: 4,
                custom_id: 'reason',
                style: 2,
                label: "Enter the reason below",
                min_length: 1,
                max_length: 1024,
                required: true,
                placeholder: "Big meanie :(",
                value
            }]
        }]
    })
}

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

        var ticket = await this.#bot.stores.tickets.get(msg.guild.id, post.response.hid);

        var reason;
        var m = await ctx.reply({
            flags: ['IsComponentsV2'],
            components: [
                {
                    type: 17,
                    components: [{
                        type: 10,
                        content: 'Would you like to give a denial reason?'
                    }]
                },
                ...DENY(false)
            ],
            fetchReply: true
        });

        var resp = await this.#bot.utils.getChoice(this.#bot, m, ctx.user, 2 * 60 * 1000, false);
        if(!resp.choice) return {content: 'Err! Nothing selected!', ephemeral: true};
        switch(resp.choice) {
            case 'cancel':
                await m.delete()
                await resp.interaction.reply({content: 'Action cancelled!', ephemeral: true});
                return;
            case 'reason':
                var mod = await this.#bot.utils.awaitModal(resp.interaction, MODALS.DENY(reason), ctx.user, true, 5 * 60_000);
                if(mod) reason = mod.fields.getTextInputValue('reason')?.trim();
                await mod.followUp("Modal received!");
                await m.edit({
                    components: [{
                        type: 17,
                        components: [{
                            type: 10,
                            content: `## Denial Reason\n${reason}`
                        }]
                    }]
                })
                break;
            case 'skip':
                await m.edit({
                    components: [{
                        type: 17,
                        components: [{
                            type: 10,
                            content: `## Denial Reason\n${reason}`
                        }]
                    }]
                })
                break;
        }

        await m.delete()

        var embed = msg.components[0];
        embed.accent_color = parseInt('aa5555', 16);

        embed.components = embed.components.concat([
            {
                type: 14
            },
            {
                type: 10,
                content: `Response denied <t:${Math.floor(new Date().getTime() / 1000)}:F>`
            },
            {
                type: 10,
                content: `Denied by ${ctx.user} (${ctx.user.tag} | ${ctx.user.id})`
            }
        ])

        try {
            this.#bot.emit('DENY', post.response);
            if(ticket?.id) {
                try {
                    var tch = await ctx.guild.channels.fetch(ticket.channel_id);
                    await tch?.delete();
                } catch(e) { }
            }

            post.response.status = 'denied';
            post.response = await post.response.save();
            await msg.edit({
                components: [embed]
            });
            await msg.reactions.removeAll();

            await post.delete();

            await u2.send({
                flags: ['IsComponentsV2'],
                components: [{
                    type: 17,
                    accent_color: parseInt('aa5555', 16),
                    components: [
                        {
                            type: 10,
                            content: `## Response denied!\n${reason ?? '*(no reason given)*'}`
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
        } catch(e) {
            console.log(e);
            return await msg.channel.send('ERR! Response denied, but couldn\'t message the user!');
        }

        return {content: 'Response denied!', ephemeral: true};
    }
}

module.exports = (bot, stores) => new Command(bot, stores);