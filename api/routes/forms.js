const Route = require('./_model');
const { auth } = require('../utils');
const { PermissionFlagsBits: FLAGS } = require('discord.js');

class FormRoutes extends Route {
	constructor(app, stores, manager) {
		super(app, stores, manager)
	}

	init() {

		// get all for a guild
		this.app.get('/forms/:guild', auth, async (req, res) => {
			var gid = req.params.guild;
			if(!gid?.length) return res.status(400).send();
			
			var forms = await this.stores.forms.getAll(gid);
			console.log(forms)
			return res.status(200).send(forms);
		})

		// get one for a guild
		this.app.get('/forms/:guild/:form', auth, async (req, res) => {
			var gid = req.params.guild;
			var fid = req.params.form;
			if(!gid?.length || !fid?.length) return res.status(400).send('Bad request.');
			
			var form = await this.stores.forms.get(gid, fid);
			if(!form?.id) return res.status(400).send();
			return res.status(200).send(form);
		})

		// create a form
		this.app.post('/forms/:guild', auth, async (req, res) => {
			var gid = req.params.guild;
			if(!gid?.length) return res.status(400).send();

			// check to make sure the guild exists
			// and that the user is in it
			// and that they have perms necessary
			try {
				var perms = await this.manager.getPerms(gid, req.user);
			} catch(e) {
				return res.status(400).send()
			}

			if(!perms.has(FLAGS.ManageMessages)) return res.status(401).send();

			var data = req.body;
			var form = await this.stores.forms.create(data);

			return res.status(200).send(form);
		})

		// update a form
		this.app.patch('/forms/:guild/:form', auth, async (req, res) => {
			var gid = req.params.guild;
			var fid = req.params.form;
			if(!gid?.length || !fid?.length) return res.status(400).send("Guild and form IDs required.");

			// check to make sure the guild exists
			// and that the user is in it
			// and that they have perms necessary
			try {
				var perms = await this.manager.getPerms(gid, req.user);
			} catch(e) {
				console.error(e)
				return res.status(400).send("Permissions couldn't be fetched.")
			}

			if(!perms.has(FLAGS.ManageMessages)) return res.status(401).send("You don't have permission to do that.");

			var form = await this.stores.forms.get(gid, fid);
			if(!form?.id) return res.status(404).send();

			var data = req.body;
			console.log(req.body)
			for(var k in data) {
				form[k] = data[k];
			}
			await form.save();

			return res.status(200).send(form);
		})

		// delete a form
		this.app.delete('/forms/:guild/:form', auth, async (req, res) => {
			var gid = req.params.guild;
			var fid = req.params.form;
			if(!gid?.length || !fid?.length) return res.status(400).send();

			// check to make sure the guild exists
			// and that the user is in it
			// and that they have perms necessary
			try {
				var perms = await this.manager.getPerms(gid, req.user);
			} catch(e) {
				return res.status(400).send()
			}

			if(!perms.has(FLAGS.ManageMessages)) return res.status(401).send();

			var form = await this.stores.forms.get(gid, fid);
			if(!form?.id) return res.status(404).send();

			await form.delete();

			return res.status(204).send();
		})
	}
}

module.exports = FormRoutes;