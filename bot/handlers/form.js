const {
	qTypes: TYPES,
	pageBtns: PGBTNS,
	confBtns: CONF,
	createButtons: CRT
} = require('../../common/extras');
const {
	ComponentType: CT,
	TextInputStyle: TIS,
	InteractionType: IT
} = require('discord.js');

const MODALS = {
	formDetails: (ctx) => ({
		title: 'Create a form',
		custom_id: `${ctx.guild.id}-${ctx.user.id}`,
		components: [
			{
				type: CT.ActionRow,
				components: [{
					type: CT.TextInput,
					custom_id: 'name',
					label: 'Form Name',
					style: TIS.Short,
					min_length: 1,
					max_length: 100
				}]
			},
			{
				type: CT.ActionRow,
				components: [{
					type: CT.TextInput,
					custom_id: 'description',
					label: 'Form Description',
					style: TIS.Paragraph,
					min_length: 1,
					max_length: 2000
				}]
			}
		]
	}),
	addSection: (ctx) => ({
		title: 'Add a new section',
		custom_id: `${ctx.guild.id}-${ctx.user.id}`,
		components: [
			{
				type: CT.ActionRow,
				components: [{
					type: CT.TextInput,
					custom_id: 'name',
					label: 'Section Name',
					style: TIS.Short,
					min_length: 1,
					max_length: 100
				}]
			},
			{
				type: CT.ActionRow,
				components: [{
					type: CT.TextInput,
					custom_id: 'description',
					label: 'Section Description',
					style: TIS.Paragraph,
					min_length: 1,
					max_length: 2000
				}]
			}
		]
	}),
	addQuestion: (ctx) => ({
		title: 'Add a new question',
		custom_id: `${ctx.guild.id}-${ctx.user.id}`,
		components: [
			{
				type: CT.ActionRow,
				components: [{
					type: CT.TextInput,
					custom_id: 'name',
					label: 'Question Value',
					style: TIS.Short,
					min_length: 1,
					max_length: 100,
					placeholder: "What's your favorite color?"
				}]
			}
		]
	})
}

const EMBEDS = {
	form: (f) => ({
		title: f.name,
		description: f.description,
		fields: (
			f.questions.length ?
			f.questions.map(transform) :
			[]
		),
		footer: { text: `Form ID: ${f.hid}` },
		color: 0xee8833
	}),
	section: (s) => ({
		title: s.name,
		description: s.description,
		fields: (
			s.questions.length ?
			s.questions.map(transform) :
			[]
		),
		footer: { text: `Section ID: ${s.hid}` },
		color: 0xee8833
	}),
}

function transform(q, i) {
	var text;
	if(!['mc', 'cb'].includes(q.type)) {
		text = "Type: " + TYPES[q.type].alias[0];
	} else {
		text = (q.choices ? `**Choices:**\n${q.choices.join("\n")}\n\n` : '') +
			   (q.other ? 'This question has an "other" option!' : '')
	}

	var name = `${NUMS[i + 1]} **${q.value}**`;
	if(q.required) name += " :exclamation:";

	switch(q.type) {
		case 'mc':
			name += " :radio_button:";
			break;
		case 'cb':
			name += " :white_check_mark:";
			break;
		case 'text':
			name += " :pencil:";
			break;
		case 'dt':
			name += " :calendar:";
			break;
		case 'num':
			name += " :1234:";
			break;
		case 'img':
			name += " :frame_photo:";
			break;
		case 'att':
			name += " :link:"
			break;
	}

	return {
		name,
		value: text
	}
}

function buildSelect(data, selected) {
	return {
		type: 3,
		custom_id: 'select',
		options: data.map((o, i) => ({
			label: o.name ?? o.label,
			value: o.value ?? i.toString(),
			description: o.description?.slice(0, 100),
			emoji: o.emoji,
			default: (
				selected != undefined ?
				selected == i :
				false
			)
		}))
	}
}

class FormHandler {
	menus = new Map();
	
	constructor(bot) {
		this.bot = bot;
		this.stores = bot.stores;

		bot.on('interactionCreate', async intr => {
			if(intr.type !== IT.MessageComponent) return;

			var menu = this.menus.get(intr.message.id);
			if(menu?.user.id == intr.user.id) return;

			await menu.handle(intr)
		})
	}

	async handleCreate(ctx) {
		var m = await this.bot.utils.awaitModal(
			ctx,
			MODALS.formDetails(ctx),
			ctx.user,
			false,
			5 * 60_000
		)
		if(!m) return "No data given!";
		var name = m.fields.getField('name').value.trim();
		var description = m.fields.getField('description').value.trim();

		var form = await this.stores.forms.create({
			server_id: ctx.guildId,
			name,
			description,
			questions: []
		});

		var message = await m.followUp({
			embeds: [EMBEDS.form(form)],
			components: [
				{
					type: 1,
					components: [{
						type: 3,
						custom_id: 'select',
						options: [{
							label: 'Add new section',
							emoji: '➕',
							value: 'new'
						}]
					}]
				},
				{
					type: 1,
					components: CRT
				}
			],
			fetchReply: true
		})

		this.menus.set(message.id, new Menu(this.bot, {
			form,
			sections: [],
			questions: [],
			message,
			user: ctx.user,
			timeout: setTimeout(async () => {
				await message.edit({
					components: []
				})
				this.menus.delete(message.id)
			}, 3 * 60_000)
		}))
		
		return;
	}
}

class Menu {
	constructor(bot, data) {
		this.bot = bot;
		for(var k in data)
			this[k] = data[k];
	}

	async handle(ctx) {
		var { customId } = ctx;
		switch(customId) {
			case 'select':
				var val = ctx.values[0];
				if(val == 'new') {
					var m = await this.bot.awaitModal(
						ctx,
						MODALS.addSection(ctx),
						ctx.user,
						true,
						5 * 60_000
					)

					if(!m) return await m.followUp(
						"No data received! (Menu still accessible)"
					)

					this.sections.push({
						name: m.fields.getField('name').value().trim(),
						description: m.fields.getField('description').value().trim(),
						questions: []
					})
					this.selected = this.sections.length - 1;

					await m.followUp('Data received!');
				} else {
					val = parseInt(val);
					this.selected = val;
					
				}
				break;
			case 'add':
				await this.addQuestion(ctx)
				break;
			case 'end':
				await form.save();
				for(var s of this.sections)
					await s.save();
				return ctx.followUp("Form saved!");
				break;
		}

		var embeds = [
			EMBEDS.form(this.form)
		]
		if(this.selected)
			embeds.push(EMBEDS.section(this.sections[this.selected]))
		await this.message.edit({
			embeds,
			components: [
				{
					type: 1,
					components: [
						buildSelect([
							...this.sections,
							{
								label: 'Add new section',
								emoji: '➕',
								value: 'new'
							}
						], this.selected)
					]
				},
				{
					type: 1,
					components: CRT
				}
			]
		})
	}

	async addQuestion(ctx) {
		var target = (
			this.selected != undefined ?
			this.sections[this.selected] :
			this.form
		)

		return;
	}
}

module.exports = (bot) => new FormHandler(bot);