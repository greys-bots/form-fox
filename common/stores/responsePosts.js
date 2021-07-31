const {Collection} = require("discord.js");

const VARIABLES = {
    '$USER': `user`,
    '$GUILD': `msg.guild.name`
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
    }

    async create(server, channel, message, data = {}) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`INSERT INTO response_posts (
                    server_id,
                    channel_id,
                    message_id,
                    response
                ) VALUES ($1,$2,$3,$4)`,
                [server, channel, message, data.response]);
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
                    response
                ) VALUES ($1,$2,$3,$4)`,
                [server, channel, message, data.response]);
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
                super.delete(`${server}-${channel}-${message}`)
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
        if(!msg.guild) return;

        var post = await this.get(msg.guild.id, msg.channel.id, msg.id);
        if(!post) return;

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

                try {
                    await this.delete(msg.guild.id, msg.channel.id, msg.id);
                    post.response = await this.bot.stores.responses.update(msg.guild.id, post.response.hid, {status: 'denied'});
                    await msg.edit({embeds: [embed]});
                    await msg.reactions.removeAll();

                    var user = await this.bot.users.fetch(post.response.user_id);
                    if(!user) return await msg.channel.send('ERR! Response denied, but couldn\'t fetch the user!');

                    await user.send({embeds: [{
                        title: 'Response denied!',
                        description: [
                            `Server: ${msg.guild.name} (${msg.guild.id})`,
                            `Form name: ${post.response.form.name}`,
                            `Form ID: ${post.response.form.hid}`,
                            `Response ID: ${post.response.hid}`
                        ].join("\n"),
                        fields: [{name: 'Reason', value: reason}],
                        color: parseInt('aa5555', 16),
                        timestamp: new Date().toISOString()
                    }]})
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

                try {
                    await this.delete(msg.guild.id, msg.channel.id, msg.id);
                    post.response = await this.bot.stores.responses.update(msg.guild.id, post.response.hid, {status: 'accepted'});
                    await msg.edit({embeds: [embed]});
                    await msg.reactions.removeAll();

                    var user = await this.bot.users.fetch(post.response.user_id);
                    if(!user) return await msg.channel.send('ERR! Response accepted, but couldn\'t fetch the user!');

                    var welc = post.response.form.message;
                    if(welc) {
                        for(var key of Object.keys(VARIABLES)) {
                            welc = welc.replace(key, eval(VARIABLES[key]));
                        }
                    }

                    await user.send({embeds: [{
                        title: 'Response accepted!',
                        description: welc,
                        fields: [
                        	{name: 'Server', value: `${msg.guild.name} (${msg.guild.id})`},
                        	{name: 'Form name', value: `${post.response.form.name}`},
                        	{name: 'Form ID', value: `${post.response.form.hid}`},
                        	{name: 'Response ID', value: `${post.response.hid}`}
                        ],
                        color: parseInt('55aa55', 16),
                        timestamp: new Date().toISOString()
                    }]});

                    if(post.response.form.roles?.[0]) {
                        var member = msg.guild.members.resolve(user.id);
                        try {
                            await member.roles.add(post.response.form.roles);
                        } catch(e) {
                            msg.channel.send('Err while adding roles: '+e.message);
                        }
                    }
                    this.bot.emit('ACCEPT', post.response);
                } catch(e) {
                    console.log(e);
                    return await msg.channel.send(`ERR! ${e.message || e}\n(Response still accepted!)`);
                }
                break;
            default:
                return;
                break;
        }
    }
}

module.exports = (bot, db) => new ResponsePostStore(bot, db);