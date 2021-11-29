const { numbers: NUMBERS, qTypes: TYPES } = require('../extras');
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
    
    async create(server, channel, message, data = {}) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`INSERT INTO open_responses (
                    server_id,
                    channel_id,
                    message_id,
                    user_id,
                    form,
                    questions,
                    answers
                ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [server, channel, message, data.user_id, data.form, data.questions || [], data.answers || []]);
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
                    questions,
                    answers
                ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [server, channel, message, data.user_id, data.form, data.questions || [], data.answers || []]);
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
                if(!responses?.[0]) return res();
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
}

module.exports = (bot, db) => new OpenResponseStore(bot, db);
