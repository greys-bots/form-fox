require('dotenv').config();

const {
	GatewayIntentBits: Intents,
} = require("discord.js");

const {
	Handlers,
	FrameClient
} = require('frame');

const bot = new FrameClient({
	intents: [
		Intents.Guilds,
		Intents.GuildMessages,
		Intents.GuildMessageReactions,
		Intents.GuildMembers,
		Intents.DirectMessages,
		Intents.DirectMessageReactions
	],
});

async function setup() {
	var { db, stores } = await Handlers.DatabaseHandler(bot, __dirname + '/../common/stores');
	bot.db = db;
	bot.stores = stores;

	var forms = await bot.stores.forms.getEvery();

	for(var form of forms) {
		console.log(form.hid, form.questions);
		if(!form.questions?.length) continue;
		if(typeof form.questions[0] == 'number') continue;

		var qs = [];
		for(var q of form.questions) {
			console.log(q);

			var data = {
				server_id: form.server_id,
				form: form.hid,
				name: q.value,
				type: q.type,
				options: { }
			}

			if(q.choices) {
				data.options.choices = q.choices;
			}

			if(q.other)
				data.options.other = true;

			var created = await stores.questions.create(data);
			qs.push(created.id);

			if(q.roles) {
				for(var r of q.roles) {
					var adata = {
						server_id: form.server_id,
						form: form.hid,
						type: 'question:role:add',
						event: 'ACCEPT',
						data: {
							question: created.id,
							roles: [r.id],
							condition: { }
						},
						priority: 1
					}

					switch(q.type) {
						case 'mc':
						case 'cb':
							adata.data.condition = {
								choice: r.choice
							}
							break;
						case 'num':
						case 'text':
							adata.data.condition = {
								value: r.value,
								compare: r.action
							}
							break;
					}

					await stores.actions.create(adata)
				}
			}
		}

		form.questions = qs;
		await form.save(false);
	}
}

setup()
.then(() => process.exit(0))
.catch(e => { console.error(e); process.exit(1) })