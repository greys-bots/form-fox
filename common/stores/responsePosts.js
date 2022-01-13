const {Collection} = require("discord.js");
const {
    pageBtns: PGBTNS
} = require('../extras');

const VARIABLES = {
    '$USER': (user, guild) => user,
    '$GUILD': (user, guild) => guild.name,
    '$FORM': (user, guild, form) => form.name,
    '$FORMID': (user, guild, form) => form.id,
}

class ResponsePostStore extends Collection {
    constructor(bot, db) {
        super();

        this.db = db;
        this.bot = bot;
    };

    async init() {
        this.bot.on('messageReactionAdd', async (...args) => {
            try {
                this.handleReactions(...args);
            } catch(e) {
                console.log(e.message || e);
            }
        })

        this.bot.on('interactionCreate', async (...args) => {
            try {
                this.handleInteractions(...args);
            } catch(e) {
                console.log(e.message || e);
            }
        })
    }

    async create(server, channel, message, data = {}) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`INSERT INTO response_posts (
                    server_id,
                    channel_id,
                    message_id,
                    response,
                    page
                ) VALUES ($1,$2,$3,$4,$5)`,
                [server, channel, message, data.response, data.page ?? 1]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            res(await this.get(server, channel, message));
        })
    }

    async index(server, channel, message, data = {}) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`INSERT INTO response_posts (
                    server_id,
                    channel_id,
                    message_id,
                    response,
                    page
                ) VALUES ($1,$2,$3,$4,$5)`,
                [server, channel, message, data.response, data.page ?? 1]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            res();
        })
    }

    async get(server, channel, message, forceUpdate = false) {
        return new Promise(async (res, rej) => {
            if(!forceUpdate) {
                var post = super.get(`${server}-${channel}-${message}`);
                if(post) {
                    var form = await this.bot.stores.forms.get(post.server_id, post.form);
                    if(form) post.form = form;
                    return res(post);
                }
            }
            
            try {
                var data = await this.db.query(`
                    SELECT * FROM response_posts WHERE
                    server_id = $1
                    AND channel_id = $2
                    AND message_id = $3
                `, [server, channel, message]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            if(data.rows && data.rows[0]) {
                var response = await this.bot.stores.responses.get(data.rows[0].server_id, data.rows[0].response);
                if(response) data.rows[0].response = response;
                this.set(`${server}-${channel}-${message}`, data.rows[0])
                res(data.rows[0])
            } else res(undefined);
        })
    }

    async getByResponse(server, hid) {
        return new Promise(async (res, rej) => {
            try {
                var data = await this.db.query(`SELECT * FROM response_posts WHERE server_id = $1 AND response = $2`,[server, hid]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            if(data.rows && data.rows[0]) {
                var response = await this.bot.stores.responses.get(data.rows[0].server_id, data.rows[0].response);
                if(response) data.rows[0].response = response;
                res(data.rows[0])
            } else res(undefined);
        })
    }

    async update(server, channel, message, data = {}) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`
                    UPDATE response_posts SET
                    ${Object.keys(data).map((k, i) => k+"=$"+(i+4)).join(",")}
                    WHERE server_id = $1
                    AND channel_id = $2
                    AND message_id = $3
                `, [server, channel, message, ...Object.values(data)]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }

            res(await this.get(server, channel, message, true));
        })
    }

    async delete(server, channel, message) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`
                    DELETE FROM response_posts
                    WHERE server_id = $1
                    AND channel_id = $2
                    AND message_id = $3
                `, [server, channel, message]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            super.delete(`${server}-${channel}-${message}`);
            res();
        })
    }

    async deleteByResponse(server, hid) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`
                    DELETE FROM response_posts
                    WHERE server_id = $1
                    AND response = $2
                `, [server, hid]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            res();
        })
    }

    async handleReactions(reaction, user) {
        if(this.bot.user.id == user.id) return;
        if(user.bot) return;

        var msg;
        if(reaction.message.partial) msg = await reaction.message.fetch();
        else msg = reaction.message;
        if(!msg.channel.guild) return;

		var cfg = await this.bot.stores.configs.get(msg.guild.id);
        var mem = await msg.guild.members.fetch(user.id);
        var check = await this.bot.handlers.interaction.checkPerms(
        	{
        		permissions: ['MANAGE_MESSAGES'],
        		opPerms: ['MANAGE_RESPONSES']
        	},
        	{
        		member: mem,
        		user
        	},
        	cfg
        )
        if(!check) return;

        var post = await this.get(msg.channel.guild.id, msg.channel.id, msg.id);
        if(!post) return;

        if(!post.response?.user_id) {
        	await this.delete(msg.channel.guild.id, msg.channel.id, msg.id);

        	return msg.channel.send(
        		"Unfortunately, something went wrong and this " +
        		"response is unrecoverable. " +
        		"It cannot be accepted or denied\n" +
        		"Please have the user send in a new response, " +
        		"or manually handle this one\n" +
        		"We're very sorry for the inconvenience\n- (GS)"
        	)
        }

        var u2 = await this.bot.users.fetch(post.response.user_id);
        if(!u2) return await msg.channel.send("ERR! Couldn't fetch that response's user!");

        var template = {
            title: "Response",
            description: [
                `Form name: ${post.response.form.name}`,
                `Form ID: ${post.response.form.hid}`,
                `User: ${u2.username}#${u2.discriminator} (${u2})`,
                `Response ID: ${post.response.hid}`
            ].join('\n'),
            color: parseInt('ccaa55', 16),
            fields: [],
            timestamp: post.response.received,
            footer: {text: 'Awaiting acceptance/denial...'}
        }

        var embeds = this.bot.handlers.response.buildResponseEmbeds(post.response, template);

       	var ticket = await this.bot.stores.tickets.get(msg.guild.id, post.response.hid);
        switch(reaction.emoji.name) {
            case '❌':
                var reason;
                await msg.channel.send([
                    'Would you like to give a denial reason?\n',
                    'Type `skip` to skip adding one, or ',
                    '`cancel` to cancel the denial!'
                ].join(''));
                var resp = await msg.channel.awaitMessages({filter: m => m.author.id == user.id, time: 2 * 60 * 1000, max: 1});
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
                    name: `${user.username}#${user.discriminator}`,
                    iconURL: user.avatarURL()
                }

                try {
                    await this.delete(msg.channel.guild.id, msg.channel.id, msg.id);
                    post.response = await this.bot.stores.responses.update(msg.channel.guild.id, post.response.hid, {status: 'denied'});
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

                    if(ticket) {
			        	var tch = msg.guild.channels.resolve(ticket.channel_id);
			            tch.delete();
			        }

                    this.bot.emit('DENY', post.response);
                } catch(e) {
                    console.log(e);
                    return await msg.channel.send('ERR! Response denied, but couldn\'t message the user!');
                }

                return await msg.channel.send('Response denied!');
                break;
            case '✅':
                var embed = msg.embeds[0];
                embed.color = parseInt('55aa55', 16);
                embed.footer = {text: 'Response accepted!'};
                embed.timestamp = new Date().toISOString();
                embed.author = {
                    name: `${user.username}#${user.discriminator}`,
                    iconURL: user.avatarURL()
                }

                try {
                    await this.delete(msg.channel.guild.id, msg.channel.id, msg.id);
                    post.response = await this.bot.stores.responses.update(msg.channel.guild.id, post.response.hid, {status: 'accepted'});
                    await msg.edit({embeds: [embed], components: []});
                    await msg.reactions.removeAll();

                    var welc = post.response.form.message;
                    if(welc) {
                        for(var key of Object.keys(VARIABLES)) {
                            welc = welc.replace(key, VARIABLES[key](u2, msg.guild, post.response.form));
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

                    if(ticket) {
			        	var tch = msg.guild.channels.resolve(ticket.channel_id);
			            tch.delete();
			        }

                    this.bot.emit('ACCEPT', post.response);
                } catch(e) {
                    console.log(e);
                    return await msg.channel.send(`ERR! ${e.message || e}\n(Response still accepted!)`);
                }
                break;
            case '⬅️':
                if(post.page == 1) post.page = embeds.length;
                else post.page -= 1;

                await msg.edit({embeds: [embeds[post.page - 1]]});
                await reaction.users.remove(user)
                await this.update(msg.guild.id, msg.channel.id, msg.id, {page: post.page});
                break;
            case '➡️':
                if(post.page == embeds.length) post.page = 1;
                else post.page += 1;

                await msg.edit({embeds: [embeds[post.page - 1]]});
                await reaction.users.remove(user)
                await this.update(msg.guild.id, msg.channel.id, msg.id, {page: post.page});
                break;
            case '🎟️':
            	try {
                    var ch_id = post.response.form.tickets_id ?? cfg?.ticket_category;
                    if(!ch_id) return;
                    var ch = msg.guild.channels.resolve(ch_id);
                    if(!ch) return await msg.channel.send('No ticket category set!');

                    if(ticket) return await msg.channel.send(`Channel already opened! Link: <#${ticket.channel_id}>`)

                    var ch2 = await msg.guild.channels.create(`ticket-${post.response.hid}`, {
                        parent: ch.id,
                        reason: 'Mod opened ticket for response '+post.response.hid
                    })

                    await ch2.lockPermissions(); //get perms from parent category
                    await ch2.permissionOverwrites.edit(u2.id, {
                        'VIEW_CHANNEL': true,
                        'SEND_MESSAGES': true,
                        'READ_MESSAGE_HISTORY': true
                    });

                    var tmsg = post.response.form.ticket_msg ?? cfg?.ticket_message;
                    if(tmsg) {
                    	for(var key of Object.keys(VARIABLES)) {
                            tmsg = tmsg.replace(key, VARIABLES[key](u2, msg.guild, post.response.form));
                        }

                        await ch2.send(tmsg);
                    }

                    await this.bot.stores.tickets.create(msg.guild.id, ch2.id, post.response.hid);

                    msg.channel.send(`Channel created: <#${ch2.id}>`);
                } catch(e) {
                    return msg.channel.send('ERR: '+e.message);
                }
            	break;
            default:
                return;
                break;
        }
    }

    async handleInteractions(ctx) {
        if(!ctx.isButton()) return;
        if(!ctx.guild) return;

        var post = await this.get(ctx.channel.guild.id, ctx.channel.id, ctx.message.id);
        if(!post) return;

        var {message: msg, user} = ctx;
        await ctx.deferUpdate();

		var cfg = await this.bot.stores.configs.get(ctx.guild.id);
        var check = await this.bot.handlers.interaction.checkPerms(
        	{
        		permissions: ['MANAGE_MESSAGES'],
        		opPerms: ['MANAGE_RESPONSES']
        	},
        	ctx, cfg
        )
        if(!check) return;

        var u2 = await this.bot.users.fetch(post.response.user_id);
        if(!u2) return await msg.channel.send("ERR! Couldn't fetch that response's user!");

		var ticket = await this.bot.stores.tickets.get(msg.guild.id, post.response.hid);
		var cmp = msg.components;
        switch(ctx.customId) {
            case 'deny':
                var reason;
                await msg.channel.send([
                    'Would you like to give a denial reason?\n',
                    'Type `skip` to skip adding one, or ',
                    '`cancel` to cancel the denial!'
                ].join(''));
                var resp = await msg.channel.awaitMessages({filter: m => m.author.id == user.id, time: 2 * 60 * 1000, max: 1});
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
                    name: `${user.username}#${user.discriminator}`,
                    iconURL: user.avatarURL()
                }

                try {
                    await this.delete(msg.channel.guild.id, msg.channel.id, msg.id);
                    post.response = await this.bot.stores.responses.update(msg.channel.guild.id, post.response.hid, {status: 'denied'});
                    await msg.edit({
                    	embeds: [embed],
                    	components: []
                    });
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

                    if(ticket) {
			        	var tch = ctx.guild.channels.resolve(ticket.channel_id);
			            tch.delete();
			        }

                    this.bot.emit('DENY', post.response);
                } catch(e) {
                    console.log(e);
                    return await msg.channel.send('ERR! Response denied, but couldn\'t message the user!');
                }

                return await msg.channel.send('Response denied!');
                break;
            case 'accept':
                var embed = msg.embeds[0];
                embed.color = parseInt('55aa55', 16);
                embed.footer = {text: 'Response accepted!'};
                embed.timestamp = new Date().toISOString();
                embed.author = {
                    name: `${user.username}#${user.discriminator}`,
                    iconURL: user.avatarURL()
                }

                try {
                    await this.delete(msg.channel.guild.id, msg.channel.id, msg.id);
                    post.response = await this.bot.stores.responses.update(msg.channel.guild.id, post.response.hid, {status: 'accepted'});
                    await msg.edit({
                    	embeds: [embed],
                    	components: []
                    });
                    await msg.reactions.removeAll();

                    var welc = post.response.form.message;
                    if(welc) {
                        for(var key of Object.keys(VARIABLES)) {
                            welc = welc.replace(key, VARIABLES[key](u2, msg.guild, post.response.form));
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

                    if(ticket) {
			        	var tch = ctx.guild.channels.resolve(ticket.channel_id);
			            tch.delete();
			        }

                    this.bot.emit('ACCEPT', post.response);
                } catch(e) {
                    console.log(e);
                    return await msg.channel.send(`ERR! ${e.message || e}\n(Response still accepted!)`);
                }
                break;
            case 'ticket':
            	try {
                    var ch_id = post.response.form.tickets_id ?? cfg?.ticket_category;
                    if(!ch_id) return await msg.channel.send('No ticket category set!');
                    var ch = msg.guild.channels.resolve(ch_id);
                    if(!ch) return await msg.channel.send('Category not found!!');

                    if(ticket) return await msg.channel.send(`Channel already opened! Link: <#${ticket.channel_id}>`)

                    var ch2 = await msg.guild.channels.create(`ticket-${post.response.hid}`, {
                        parent: ch.id,
                        reason: 'Mod opened ticket for response '+post.response.hid
                    })

                    await ch2.lockPermissions(); //get perms from parent category
                    await ch2.permissionOverwrites.edit(u2.id, {
                        'VIEW_CHANNEL': true,
                        'SEND_MESSAGES': true,
                        'READ_MESSAGE_HISTORY': true
                    })

                    var tmsg = post.response.form.ticket_msg ?? cfg?.ticket_message;
                    if(tmsg) {
                    	for(var key of Object.keys(VARIABLES)) {
                            tmsg = tmsg.replace(key, VARIABLES[key](u2, msg.guild, post.response.form));
                        }

                        await ch2.send(tmsg);
                    }

					cmp[0].components[2].disabled = true;
					await msg.edit({
						components: cmp
					})
                    await this.bot.stores.tickets.create(msg.guild.id, ch2.id, post.response.hid);
                    await ctx.followUp(`Channel created! <#${ch2.id}>`);
                    return;
                } catch(e) {
                    return await msg.channel.send('ERR: '+e.message);
                }
            	break;
        }

        if(PGBTNS.find(pg => pg.custom_id == ctx.customId)) {
            var template = {
                title: "Response",
                description: [
                    `Form name: ${post.response.form.name}`,
                    `Form ID: ${post.response.form.hid}`,
                    `User: ${u2.username}#${u2.discriminator} (${u2})`,
                    `Response ID: ${post.response.hid}`
                ].join('\n'),
                color: parseInt('ccaa55', 16),
                fields: [],
                timestamp: post.response.received,
                footer: {text: 'Awaiting acceptance/denial...'}
            }

            var embeds = this.bot.handlers.response.buildResponseEmbeds(post.response, template);
            switch(ctx.customId) {
                case 'first':
                    post.page = 1;
                    break;
                case 'prev':
                    if(post.page == 1) post.page = embeds.length;
                    else post.page -= 1;
                    break;
                case 'next':
                    if(post.page == embeds.length) post.page = 1;
                    else post.page += 1;
                    break;
                case 'last':
                    post.page = embeds.length;
                    break;
            }

            await msg.edit({embeds: [embeds[post.page - 1]]});
            await this.update(ctx.guild.id, ctx.channel.id, ctx.message.id, {page: post.page});
            return;
        }
    }
}

module.exports = (bot, db) => new ResponsePostStore(bot, db);