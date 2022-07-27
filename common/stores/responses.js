const { Models: { DataStore, DataObject } } = require('frame');
const KEYS = {
	id: { },
	server_id: { },
	hid: { },
	user_id: { },
	form: { },
	questions: { },
	answers: { },
	status: { patch: true },
	received: { }
}

class Response extends DataObject {
	constructor(store, keys, data) {
		super(store, keys, data);
	}

	toJSON() {
		var {store, KEYS, old, ...rest} = this;

		return rest;
	}
}

class ResponseStore extends DataStore {
	constructor(bot, db) {
		super(bot, db);
	}

	async init() {
		await this.db.query(`
			CREATE TABLE IF NOT EXISTS responses (
				id 			SERIAL PRIMARY KEY,
				server_id 	TEXT,
				hid 		TEXT UNIQUE,
				user_id 	TEXT,
				form 		TEXT REFERENCES forms(hid) ON DELETE CASCADE,
				questions 	JSONB,
				answers 	TEXT[],
				status 		TEXT,
				received 	TIMESTAMPTZ
			);

			CREATE TABLE IF NOT EXISTS response_posts (
				id 			SERIAL PRIMARY KEY,
				server_id 	TEXT,
				channel_id 	TEXT,
				message_id 	TEXT,
				response 	TEXT REFERENCES responses(hid) ON DELETE CASCADE,
				page 		INTEGER
			)
		`)
	}

	async create(data = {}) {
		try {
			var resp = await this.db.query(`INSERT INTO responses (
				server_id,
				hid,
				user_id,
				form,
				questions,
				answers,
				status,
				received
			) VALUES ($1,find_unique('responses'),$2,$3,$4,$5,$6,$7)
			RETURNING *`,
			[data.server_id, data.user_id, data.form, data.questions || [],
			data.answers || [], data.status || 'pending', data.received || new Date()]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(resp.rows[0].id);
	}

	async index(server, data = {}) {
		try {
			await this.db.query(`INSERT INTO responses (
				server_id,
				hid,
				user_id,
				form,
				questions,
				answers,
				status,
				received
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			[server, data.hid, data.user_id, data.form, data.questions || [],
			data.answers || [], data.status || 'pending', data.received || new Date()]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM responses WHERE server_id = $1 AND hid = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			var resp = new Response(this, KEYS, data.rows[0])
			var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
			if(form) resp.form = form;
			
			return resp;
		} else return new Response(this, KEYS, { server_id: server });
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM responses WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			var resp = new Response(this, KEYS, data.rows[0])
			var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
			if(form) resp.form = form;
			
			return resp;
		} else return new Response(this, KEYS, { });
	}

	async getAll(server) {
		try {
			var data = await this.db.query(`SELECT * FROM responses WHERE server_id = $1`,[server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			var responses = [];
			var forms = {};
			for(var r of data.rows) {
				var resp = new Response(this, KEYS, r)
				var form = forms[r.form];
				if(!form) form = await this.bot.stores.forms.get(r.server_id, r.form);
				if(form) {
					resp.form = form;
					forms[form.hid] = form;
				}

				responses.push(resp);
			}
			
			return responses;
		} else return undefined;
	}

	async getByUser(server, user) {
		try {
			var data = await this.db.query(`SELECT * FROM responses WHERE server_id = $1 AND user_id = $2`,[server, user]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			var responses = [];
			var forms = {};
			for(var r of data.rows) {
				var resp = new Response(this, KEYS, r)
				var form = forms[r.form];
				if(!form) form = await this.bot.stores.forms.get(r.server_id, r.form);
				if(form) {
					resp.form = form;
					forms[form.hid] = form;
				}

				responses.push(resp);
			}
			
			return responses;
		} else return undefined;
	}

	async getByForm(server, hid) {
		try {
			var data = await this.db.query(`SELECT * FROM responses WHERE server_id = $1 AND form = $2`,[server, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			var form = await this.bot.stores.forms.get(server, hid);
            
			return data.rows.map( x => {
				var r = new Response(this, KEYS, x);
				r.form = form;
				return r;
			})
		} else return undefined;
	}

	async getByForms(server, ids) {
		try {
			var data = await this.db.query(`
				SELECT * FROM responses
				WHERE server_id = $1
			`, [server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		if(!data?.rows?.length) return undefined;
		if(ids) data.rows = data.rows.filter(x => ids.includes(x.form));
		
		var d = {};
		for(var r of data.rows) {
			var {
				form: f,
				id,
				server_id,
				questions,
				answers,
				...rest
			} = r;
			if(!d[f]) d[f] = [];
			
			var ans = [];
			for(var i = 0; i < questions.length; i++) {
				ans.push({
					question: questions[i],
					answer: answers[i]
				})
			}
			rest.answers = ans;
			d[f].push(rest)
		}

		return d;
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE responses SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM responses WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteAll(server) {
		try {
			await this.db.query(`DELETE FROM responses WHERE server_id = $1`, [server]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteByForm(server, form) {
		try {
			await this.db.query(`DELETE FROM responses WHERE server_id = $1 AND form = $2`, [server, form]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new ResponseStore(bot, db);