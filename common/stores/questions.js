const { Models: { DataStore, DataObject } } = require('frame');
const TYPES = require('../questions');
const {
	qButtons: QBTNS,
	pageBtns: PGBTNS,
	submitBtns: SUBMIT,
	confBtns: CONF,
} = require('../extras');

const KEYS = {
	id: { },
	server_id: { },
	form: { },
	hid: { },
	type: { },
	name: { patch: true },
	required: { patch: true },
	options: { patch: true }
}

class Question extends DataObject {	
	constructor(store, keys, data) {
		super(store, keys, data);
	}

	async getForm() {
		var form = await this.store.bot.stores.forms.get(this.server_id, this.form);
		if(!this.resolved) this.resolved = {}
		this.resolved.form = form;
		return form;
	}

	async getEmbed() {
		if(!this.resolved?.form) await this.getForm();
		var type = TYPES[this.type];
		var tcomps = type.embed(this);

		var qcomps = [
			{
				type: 10,
				content: `-# ${this.resolved.form.name} (${this.form})`
			},
			{
				type: 10,
				content: `## ${this.name} ${this.required ? '(required)' : ''}`
			},
			...tcomps
		];

		var qemb = {
			type: 17,
			accent_color: parseInt(this.resolved.form.color || 'ee8833', 16),
			components: qcomps
		}

		return qemb;
	}
}

class QuestionStore extends DataStore {
	constructor(bot, db) {
		super(bot, db)
	}

	async init() {
		await this.db.query(`CREATE TABLE IF NOT EXISTS questions (
			id 					SERIAL PRIMARY KEY,
			server_id 			TEXT,
			form			 	TEXT references forms (hid) on delete cascade,
			hid		 			TEXT default find_unique('questions'),
			type 				TEXT,
			name 				TEXT,
			required			BOOLEAN,
			options 			JSONB
		)`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO questions (
				server_id,
				form,
				type,
				name,
				required,
				options
			) VALUES ($1,$2,$3,$4,$5,$6)
			RETURNING id`,
			[data.server_id, data.form,
			 data.type, data.name, data.required,
			 data.options]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO questions (
				server_id,
				form,
				type,
				name,
				required,
				options
			) VALUES ($1,$2,$3,$4,$5,$6)
			RETURNING id`,
			[data.server_id, data.form,
			 data.type, data.name, data.required,
			 data.options]);
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async get(server, form, hid) {
		try {
			var data = await this.db.query(`
				SELECT * FROM questions
				WHERE server_id = $1 AND form = $2 AND hid = $3
			`,[server, form, hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Question(this, KEYS, data.rows[0]);
		} else return new Question(this, KEYS, {server_id: server, form});
	}

	async getByForm(server, form) {
		try {
			var data = await this.db.query(`
				SELECT * FROM questions
				WHERE server_id = $1 AND form = $2
			`,[server, form]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		console.log(data.rows);
		if(data.rows?.[0]) {
			return data.rows.map(x => new Question(this, KEYS, x));
		} else return [];
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM questions WHERE id = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows?.[0]) {
			return new Question(this, KEYS, data.rows[0]);
		} else return new Question(this, KEYS, {});
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE questions SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM questions WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new QuestionStore(bot, db);