const { Collection } = require("discord.js");

var menus = [];

class OpenResponseStore extends Collection {
    /*
        Handles open forms
        Users shouldn't be able to open new forms
            unless they're finished with one already
        Doesn't utilize timeouts on message sends-
            instead handles incoming messages by checking
            to see if there's an open app and going from there
        Will send to a server or discard once done
    */

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

        this.bot.on('message', async (...args) => {
            try {
                this.handleMessage(...args);
            } catch(e) {
                console.log(e.message || e);
            }
        })
    }

    async create(server, channel, message, data = {}) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`INSERT INTO open_responses (
                    server_id,
                    channel_id,
                    message_id,
                    user_id,
                    form,
                    answers
                ) VALUES ($1,$2,$3,$4,$5,$6)`,
                [server, channel, message, data.user_id, data.form, data.answers || []]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            res(await this.get(channel));
        })
    }

    async index(server, channel, message, data = {}) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`INSERT INTO open_responses (
                    server_id,
                    channel_id,
                    message_id,
                    user_id,
                    form,
                    answers
                ) VALUES ($1,$2,$3,$4,$5,$6)`,
                [server, channel, message, data.user_id, data.form, data.answers || []]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            res();
        })
    }

    async get(channel, forceUpdate = false) {
        return new Promise(async (res, rej) => {
            if(!forceUpdate) {
                var response = super.get(`${channel}`);
                if(response) {
                    var form = await this.bot.stores.forms.get(response.server_id, response.form);
                    if(form) response.form = form;
                    return res(response);
                }
            }
            
            try {
                var data = await this.db.query(`SELECT * FROM open_responses WHERE channel_id = $1`,[channel]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            if(data.rows && data.rows[0]) {
                var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
                if(form) data.rows[0].form = form;
                this.set(`${channel}`, data.rows[0])
                res(data.rows[0])
            } else res(undefined);
        })
    }

    async getByMessage(channel, message) {
        return new Promise(async (res, rej) => {
            try {
                var data = await this.db.query(`SELECT * FROM open_responses WHERE channel_id = $1 AND message_id = $2`,[channel, message]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            if(data.rows && data.rows[0]) {
                var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
                if(form) data.rows[0].form = form;
                res(data.rows[0])
            } else res(undefined);
        })
    }

    async getByForm(server, hid) {
        return new Promise(async (res, rej) => {
            try {
                var data = await this.db.query(`SELECT * FROM open_responses WHERE server_id = $1 AND form = $2`,[server, hid]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            if(data.rows && data.rows[0]) {
                var form = await this.bot.stores.forms.get(server, hid);
                for(var i = 0; i < data.rows.length; i++) {
                    if(form) data.rows[i].form = form;
                }

                res(data.rows)
            } else res(undefined);
        })
    }

    async update(channel, data = {}) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`UPDATE open_responses SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE channel_id = $1`,[channel, ...Object.values(data)]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }

            res(await this.get(channel, true));
        })
    }

    async delete(channel) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`DELETE FROM open_responses WHERE channel_id = $1`, [channel]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            super.delete(`${channel}`);
            res();
        })
    }

    async deleteByForm(server, hid) {
        return new Promise(async (res, rej) => {
            try {
                var responses = await this.getByForm(server, hid);
                await this.db.query(`
                    DELETE FROM open_responses
                    WHERE server_id = $1
                    AND form = $2
                `, [server, hid]);
                if(responses)
                    for(var response of responses)
                        super.delete(response.channel_id);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            res();
        })
    }

    async sendResponse(response, message, user, config) {
        if(response.form.required?.find(n => n > response.answers.length))
            return 'You still have required questions to answer!';
        var prompt = await message.channel.messages.fetch(response.message_id);

        if(response.answers.length < response.form.questions.length) {
            var msg = await message.channel.send([
                "You're not done with this form yet!",
                "Would you like to skip the rest of the questions?"
            ].join("\n"));
        } else {
            var msg = await message.channel.send([
                "Are you sure you're ready to submit this form?"
            ].join('\n'));
        }

        ['✅','❌'].forEach(r => msg.react(r));

        var confirm = await this.bot.utils.getConfirmation(this.bot, message, user);
        if(confirm.msg) return Promise.resolve(confirm.msg);

        await prompt.edit({embed: {
            title: response.form.name,
            description: response.form.description,
            fields: response.form.questions.map((q, i) => {
                return {
                    name: q,
                    value: response.answers[i] || '*(answer skipped!)*'
                }
            }),
            color: parseInt(response.form.color || 'ee8833', 16),
            footer: {text: 'Awaiting acceptance/denial...'}
        }});

        var respembed = {embed: {
            title: "Response received!",
            description: [
                `Form name: ${response.form.name}`,
                `Form ID: ${response.form.hid}`,
                `User: ${user}`
            ].join('\n'),
            color: parseInt('ccaa00', 16),
            fields: [],
            timestamp: new Date().toISOString(),
            footer: {text: 'Awaiting acceptance/denial...'}
        }};

        for(var i = 0; i < response.form.questions.length; i++) {
            respembed.embed.fields.push({
                name: response.form.questions[i],
                value: response.answers[i] || "*(answer skipped!)*"
            })
        }

        try {
            var code = this.bot.utils.genCode(this.bot.chars);
            await this.bot.stores.responses.create(response.server_id, code, {
                user_id: user.id,
                form: response.form.hid,
                answers: response.answers[0] ? response.answers :
                         new Array(response.form.questions.length).fill("*(answer skipped!)*"),
                status: 'pending'
            });
            respembed.embed.description += `\nResponse ID: ${code}`;
            var guild = this.bot.guilds.resolve(response.server_id);
            if(!guild) return Promise.reject("ERR! Guild not found! Aborting!");
            var chan_id = response.form.channel_id || config?.response_channel;
            var channel = guild.channels.resolve(chan_id);
            if(!channel) return Promise.reject("ERR! Guild response channel missing! Aborting!");
            var rmsg = await channel.send(respembed);
            ['✅','❌'].forEach(r => rmsg.react(r));
            await this.bot.stores.responsePosts.create(rmsg.guild.id, channel.id, rmsg.id, {
                response: code
            })
            await this.bot.stores.forms.updateCount(rmsg.guild.id, response.form.hid);
        } catch(e) {
            console.log(e.message || e);
            return Promise.reject('ERR! '+(e.message || e));
        }

        await this.delete(response.channel_id);
        return Promise.resolve([
            'Response sent! Response ID: '+code,
            'Use this code to make sure your response has been received'
        ].join('\n'))
    }

    async cancelResponse(response, message, user, config) {
        var prompt = await message.channel.messages.fetch(response.message_id);

        var msg = await message.channel.send([
            'Would you like to cancel your response?\n',
            'WARNING: This will delete all your progress. ',
            'If you want to fill out this form, you\'ll have to start over'
        ].join(""));
        ['✅','❌'].forEach(r => msg.react(r));

        var confirm = await this.bot.utils.getConfirmation(this.bot, message, user);
        if(confirm.msg) return Promise.resolve(confirm.msg);

        try {
            await this.delete(response.channel_id);
            await prompt.edit({embed: {
                title: "Response cancelled",
                description: "This form response has been cancelled!",
                color: parseInt('aa5555', 16),
                timestamp: new Date().toISOString()
            }});
        } catch(e) {
            console.log(e);
            return Promise.reject('ERR! '+(e.message || e));
        }

        delete menus[message.channel.id];
        return Promise.resolve('Response cancelled!');
    }

    async skipQuestion(response, message, user, config) {
        if(response.form.required?.includes(response.answers.length + 1))
            return Promise.resolve('This question can\'t be skipped!');
        if(response.form.questions.length === response.answers.length)
            return Promise.resolve('Nothing to skip!');
        var prompt = await message.channel.messages.fetch(response.message_id);

        var msg = await message.channel.send([
            'Are you sure you want to skip this question? ',
            "You can't go back to answer it!"
        ].join(""));
        ['✅','❌'].forEach(r => msg.react(r));

        var confirm = await this.bot.utils.getConfirmation(this.bot, message, user);
        if(confirm.msg) return Promise.resolve(confirm.msg);

        if(response.form.questions.length > response.answers.length + 1) {
            response.answers.push('*(answer skipped)*');
            var msg = await message.channel.send({embed: {
                title: response.form.name,
                description: response.form.description,
                fields: [
                    {name: `Question ${response.answers.length + 1}${response.form.required?.includes(response.answers.length + 1) ? ' (required)' : ''}`,
                    value: response.form.questions[response.answers.length]
                }],
                color: parseInt(response.form.color || 'ee8833', 16),
                footer: {text: [
                    'react with ✅ to finish early; ',
                    'react with ❌ to cancel; ',
                    'react with ➡️ to skip this question! ',
                    'respective text keywords: submit, cancel, skip'
                ].join("")}
            }});

            ['✅','❌','➡️'].forEach(r => msg.react(r));
            
            await this.update(message.channel.id, {message_id: msg.id, answers: response.answers});
        } else if(response.form.questions.length == response.answers.length + 1) {
            response.answers.push('*(answer skipped)*');
            var content = {content: "How's this look?", embed: {
                title: response.form.name,
                description: response.form.description,
                fields: response.form.questions.map((q, i) => {
                    return {
                        name: q,
                        value: response.answers[i] || '*(answer skipped!)*'
                    }
                }),
                color: parseInt(response.form.color || 'ee8833', 16),
                footer: {text: [
                    'react with ✅ to finish; ',
                    'react with ❌ to cancel. ',
                    'respective keywords: submit, cancel'
                ].join(' ')}
            }};

            var msg = await message.channel.send(content);
            ['✅','❌'].forEach(r => msg.react(r));
            
            await this.update(message.channel.id, {message_id: msg.id, answers: response.answers});
        }
    }

    async handleReactions(reaction, user) {
        if(this.bot.user.id == user.id) return;
        if(user.bot) return;

        var msg;
        if(reaction.message.partial) msg = await reaction.message.fetch();
        else msg = reaction.message;

        if(menus[msg.channel.id]) {
            return;
            // try {
            //     var result = await menus[msg.channel.id].execute(reaction.emoji.name);
            // } catch(e) {
            //     console.log(e);
            //     return await msg.channel.send(e.message || e);
            // }

            // if(result) return await msg.channel.send(result);
            // return;
        }

        var response = await this.getByMessage(msg.channel.id, msg.id);
        if(!response) return;

        if(!response.form.questions) {
            await this.delete(msg.channel.id);
            return msg.channel.send("That form is invalid! This response is now closed");
        }

        var config = await this.bot.stores.configs.get(response.server_id);

        switch(reaction.emoji.name) {
            case '✅':
                menus.push(msg.channel.id);
                try {
                    var res = await this.sendResponse(response, msg, user, config);
                } catch(e) {
                    menus.splice(menus.findIndex(c => c == msg.channel.id), 1);
                    await msg.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == msg.channel.id), 1);
                await msg.channel.send(res);
                return;
                break;
            case '❌':
                menus.push(msg.channel.id);
                try {
                    var res = await this.cancelResponse(response, msg, user, config);
                } catch(e) {
                    menus.splice(menus.findIndex(c => c == msg.channel.id), 1);
                    await msg.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == msg.channel.id), 1);
                await msg.channel.send(res);
                return;
                break;
            case '➡️':
                menus.push(msg.channel.id);
                try {
                    var res = await this.skipQuestion(response, msg, user, config);
                } catch(e) {
                    menus.splice(menus.findIndex(c => c == msg.channel.id), 1);
                    await msg.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == msg.channel.id), 1);
                await msg.channel.send(res);
                return;
                break;
        }
    }

    async handleMessage(message) {
        if(this.bot.user.id == message.author.id) return;
        if(message.author.bot) return;
        if(message.content.toLowerCase().startsWith(this.bot.prefix)) return; //in case they're doing commands

        var response = await this.get(message.channel.id);
        if(!response) return;

        if(!response.form.questions) {
            await this.delete(message.channel.id);
            return message.channel.send("That form is invalid! This response is now closed");
        }

        var config = await this.bot.stores.configs.get(response.server_id);

        if(menus.includes(message.channel.id)) return;

        switch(message.content.toLowerCase()) {
            case 'submit':
                menus.push(message.channel.id);
                try {
                    var res = await this.sendResponse(response, message, message.author, config);
                } catch(e) {
                    menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                    await message.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                await message.channel.send(res);
                return;
                break;
            case 'cancel':
                menus.push(message.channel.id);
                try {
                    var res = await this.cancelResponse(response, message, message.author, config);
                } catch(e) {
                    menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                    await message.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                await message.channel.send(res);
                return;
                break;
            case 'skip':
                menus.push(message.channel.id);
                try {
                    var res = await this.skipQuestion(response, message, message.author, config);
                } catch(e) {
                    menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                    await message.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                if(res) await message.channel.send(res);
                return;
                break;
        }

        if(response.form.questions.length > response.answers.length + 1) {
            response.answers.push(message.content);
            var msg = await message.channel.send({embed: {
                title: response.form.name,
                description: response.form.description,
                fields: [
                    {name: `Question ${response.answers.length + 1}${response.form.required?.includes(response.answers.length + 1) ? ' (required)' : ''}`,
                    value: response.form.questions[response.answers.length]
                }],
                color: parseInt(response.form.color || 'ee8833', 16),
                footer: {text: [
                    'react with ✅ to finish early; ',
                    'react with ❌ to cancel; ',
                    'react with ➡️ to skip this question! ',
                    'respective text keywords: submit, cancel, skip'
                ].join("")}
            }});

            ['✅','❌','➡️'].forEach(r => msg.react(r));
            
            await this.update(message.channel.id, {message_id: msg.id, answers: response.answers});
        } else if(response.form.questions.length == response.answers.length + 1) {
            response.answers.push(message.content);
            var content = {content: "How's this look?", embed: {
                title: response.form.name,
                description: response.form.description,
                fields: response.form.questions.map((q, i) => {
                    return {
                        name: q,
                        value: response.answers[i] || '*(answer skipped!)*'
                    }
                }),
                color: parseInt(response.form.color || 'ee8833', 16),
                footer: {text: [
                    'react with ✅ to finish; ',
                    'react with ❌ to cancel. ',
                    'respective keywords: submit, cancel'
                ].join(' ')}
            }};

            var msg = await message.channel.send(content);
            ['✅','❌'].forEach(r => msg.react(r));
            
            await this.update(message.channel.id, {message_id: msg.id, answers: response.answers});
        }
    }
}

module.exports = (bot, db) => new OpenResponseStore(bot, db);