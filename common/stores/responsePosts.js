const { Models: { DataStore, DataObject } } = require('frame');
const {
    pageBtns: PGBTNS
} = require('../extras');

const VARIABLES = {
    '$USER': (user, guild) => user,
    '$GUILD': (user, guild) => guild.name,
    '$FORM': (user, guild, form) => form.name,
    '$FORMID': (user, guild, form) => form.id,
}

const KEYS = {
    id: { },
    server_id: { },
    channel: { },
    message_id: { },
    response: { },
    page: { patch: true }
}

class ResponsePost extends DataObject {
    #store;

    constructor(store, keys, data) {
        super(store, keys, data)
        this.#store = store;
    }
}

class ResponsePostStore extends DataStore {
	#db;
	#bot;

    constructor(bot, db) {
        super();
        this.#db = db;
        this.#bot = bot;
    }

    async init() {
    	await this.#db.query(`CREATE TABLE IF NOT EXISTS response_posts (
			id 			SERIAL PRIMARY KEY,
			server_id 	TEXT,
			channel_id 	TEXT,
			message_id 	TEXT,
			response 	TEXT REFERENCES responses(hid) ON DELETE CASCADE,
			page 		INTEGER
		)`)
		
        this.#bot.on('messageReactionAdd', async (...args) => {
            try {
                this.handleReactions(...args);
            } catch(e) {
                console.log(e.message || e);
            }
        })

        this.#bot.on('interactionCreate', async (...args) => {
            try {
                this.handleInteractions(...args);
            } catch(e) {
                console.log(e.message || e);
            }
        })

        this.#bot.on('messageDelete', async ({ channel, id }) => {
            if(!channel.guild) return;
            await this.deleteByMessage(channel.guild.id, channel.id, id);
        })
    }

    async create(data = {}) {
        try {
            var c = await this.#db.query(`INSERT INTO response_posts (
                server_id,
                channel_id,
                message_id,
                response,
                page
            ) VALUES ($1,$2,$3,$4,$5)
            RETURNING id`,
            [data.server_id, data.channel_id, data.message_id, 
             data.response, data.page ?? 1]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        return await this.getID(c.rows[0].id);
    }

    async index(server, channel, message, data = {}) {
        try {
            await this.#db.query(`INSERT INTO response_posts (
                server_id,
                channel_id,
                message_id,
                response,
                page
            ) VALUES ($1,$2,$3,$4,$5)`,
            [server, channel, message, data.response, data.page ?? 1]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        return;
    }

    async get(server, channel, message) {
        try {
            var data = await this.#db.query(`
                SELECT * FROM response_posts WHERE
                server_id = $1
                AND channel_id = $2
                AND message_id = $3
            `, [server, channel, message]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        if(data.rows?.[0]) {
            var post = new ResponsePost(this, KEYS, data.rows[0]);
            var response = await this.#bot.stores.responses.get(data.rows[0].server_id, data.rows[0].response);
            if(response) post.response = response;
            
            return post;
        } else return new ResponsePost(this, KEYS, { server_id: server, channel_id: channel, message_id: message });
    }

    async getByResponse(server, hid) {
        try {
            var data = await this.#db.query(`SELECT * FROM response_posts WHERE server_id = $1 AND response = $2`,[server, hid]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        if(data.rows?.[0]) {
            var post = new ResponsePost(this, KEYS, data.rows[0]);
            var response = await this.#bot.stores.responses.get(data.rows[0].server_id, data.rows[0].response);
            if(response) post.response = response;
            
            return post;
        } else return new ResponsePost(this, KEYS, { server_id: server, response: hid });
    }

    async update(id, data = {}) {
        try {
            await this.#db.query(`
                UPDATE response_posts SET
                ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")}
                WHERE id = $1
            `, [id, ...Object.values(data)]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }

        return await this.getID(id)
    }

    async delete(id) {
        try {
            await this.#db.query(`
                DELETE FROM response_posts
                WHERE id = $1
            `, [id]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        return;
    }

    async deleteByMessage(server, channel, message) {
        try {
            await this.#db.query(`
                DELETE FROM response_posts
                WHERE server_id = $1
                AND channel_id = $2
                AND message_id = $3
            `, [server, channel, message]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        return;
    }

    async handleReactions(reaction, user) {
        if(this.#bot.user.id == user.id) return;
        if(user.bot) return;

        var msg;
        if(reaction.message.partial) msg = await reaction.message.fetch();
        else msg = reaction.message;
        if(!msg.channel.guild) return;

		var cfg = await this.#bot.stores.configs.get(msg.guild.id);
        var mem = await msg.guild.members.fetch(user.id);
        var check = await this.#bot.handlers.interaction.checkPerms(
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
        if(!post?.id) return;

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

        var u2 = await this.#bot.users.fetch(post.response.user_id);
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

        var embeds = this.#bot.handlers.response.buildResponseEmbeds(post.response, template);

       	var ticket = await this.#bot.stores.tickets.get(msg.guild.id, post.response.hid);
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

                    if(ticket?.id) {
			        	var tch = msg.guild.channels.resolve(ticket.channel_id);
			            tch.delete();
			        }

                    this.#bot.emit('DENY', post.response);
                    await post.delete();
                } catch(e) {
                    console.log(e);
                    return await msg.channel.send('ERR! Response denied, but couldn\'t message the user!');
                }

                return await msg.channel.send('Response denied!');
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
                	post.response.status = 'accepted';
                    post.response = await post.response.save();
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

                    if(ticket?.id) {
			        	var tch = msg.guild.channels.resolve(ticket.channel_id);
			            tch.delete();
			        }

                    this.#bot.emit('ACCEPT', post.response);
                    await post.delete();
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
                await post.save();
                break;
            case '➡️':
                if(post.page == embeds.length) post.page = 1;
                else post.page += 1;

                await msg.edit({embeds: [embeds[post.page - 1]]});
                await reaction.users.remove(user)
                await post.save();
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

                    await this.#bot.stores.tickets.create(msg.guild.id, ch2.id, post.response.hid);

                    msg.channel.send(`Channel created: <#${ch2.id}>`);
                } catch(e) {
                    return msg.channel.send('ERR: '+e.message);
                }
            	break;
            default:
                return;
        }
    }

    async handleInteractions(ctx) {
        if(!ctx.isButton()) return;
        if(!ctx.guild) return;

        var post = await this.get(ctx.channel.guild.id, ctx.channel.id, ctx.message.id);
        if(!post?.id) return;

        var {message: msg, user} = ctx;

		var cfg = await this.#bot.stores.configs.get(ctx.guild.id);
        var check = await this.#bot.handlers.interaction.checkPerms(
        	{
        		permissions: ['MANAGE_MESSAGES'],
        		opPerms: ['MANAGE_RESPONSES']
        	},
        	ctx, cfg
        )
        if(!check) return;

        var u2 = await this.#bot.users.fetch(post.response.user_id);
        if(!u2) return await msg.channel.send("ERR! Couldn't fetch that response's user!");

		var ticket = await this.#bot.stores.tickets.get(msg.guild.id, post.response.hid);
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
                	post.response.status = 'denied';
                    post.response = await post.response.save();
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

                    if(ticket?.id) {
			        	var tch = ctx.guild.channels.resolve(ticket.channel_id);
			            tch?.delete();
			        }

                    this.#bot.emit('DENY', post.response);
                    await post.delete();
                } catch(e) {
                    console.log(e);
                    return await msg.channel.send('ERR! Response denied, but couldn\'t message the user!');
                }

                return await msg.channel.send('Response denied!');
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
                	post.response.status = 'accepted';
                	post.response = await post.response.save();
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

                    if(ticket?.id) {
			        	var tch = ctx.guild.channels.resolve(ticket.channel_id);
			            tch?.delete();
			        }

                    this.#bot.emit('ACCEPT', post.response);
                    await post.delete();
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

                    if(ticket?.id) return await msg.channel.send(`Channel already opened! Link: <#${ticket.channel_id}>`)

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
                    await this.#bot.stores.tickets.create(msg.guild.id, ch2.id, post.response.hid);
                    await ctx.followUp(`Channel created! <#${ch2.id}>`);
                    return;
                } catch(e) {
                    return await msg.channel.send('ERR: '+e.message);
                }
        }

        if(PGBTNS(1,1).find(pg => pg.custom_id == ctx.customId)) {
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

            var embeds = this.#bot.handlers.response.buildResponseEmbeds(post.response, template);
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
            await post.save();
            return;
        }
    }
}

module.exports = (bot, db) => new ResponsePostStore(bot, db);