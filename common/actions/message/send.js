const { ChannelType } = require('discord.js');
const {
	textVars: VARIABLES
} = require('../../extras');

const Selections = {
	target: [
		{
			label: 'User',
			value: 'user',
			description: 'Send a message to the user that applied to the form'	
		},
		{
			label: 'Channel',
			value: 'channel',
			description: 'Send a message to a specific channel'
		}
	]
}

const Components = {
	'modal': [{
		type: 2,
		style: 1,
		label: 'Input message',
		custom_id: 'modal-button'
	}]
}

const Modals = {
	'message': {
		title: "Message to send",
		custom_id: 'message_modal',
        components: [{
            type: 1,
            components: [{
                type: 4,
                custom_id: 'message',
                style: 2,
                label: "Enter the message to send",
                min_length: 1,
                max_length: 1024,
                required: true,
                placeholder: "Welcome to $GUILD, $USER!"
            }]
        }]
	}
}

module.exports = {
	name: 'send',
	description: 'Send a message to the user or a specific channel',
	events: ['APPLY', 'SUBMIT', 'ACCEPT', 'DENY'],
	priority: 1,

	async setup(ctx) {
		var { inter, client } = ctx;
		var data = { };

		var resp = await client.utils.awaitSelection(inter, Selections.target, "Where do you want to send the message?", {
			min_values: 1,
			max_values: 1,
			placeholder: 'Select a target type...'
		});
		if(!Array.isArray(resp)) return { success: false, message: resp };
		data.target = { }
		data.target.type = resp[0];

		if(resp[0] == 'channel') {
			var resp = await client.utils.awaitChannelSelection(inter, [], "Select a channel to send the message to:", {
				min_values: 1,
				max_values: 1,
				placeholder: 'Select a channel...'
			})
			if(!Array.isArray(resp)) return { success: false, message: resp };
			data.target.id = resp[0];
		}

		var msg = await inter.followUp({
			content: 'Click below to input the message to send!',
			components: [{
				type: 1,
				components: Components.modal
			}]
		})
		var intx = await msg.awaitMessageComponent({ time: 5 * 60_000 });
		if(!intx) return { success: false, message: "No message given to send!" };

		var mod = await client.utils.awaitModal(intx, Modals.message, inter.user, true, 5 * 60_000);
		if(!mod) return { success: false, message: mod ?? "No message given to send!" };
		data.message = mod.fields.getTextInputValue('message')?.trim();
		if(!data.message?.length) return { success: false, message: "Message given was invalid!" };

		return { success: true, data}
	},

	async handler(ctx) {
		var { guild, member, action, form, response } = ctx;
		var { message, target } = action.data;
		var { type, id } = target;

		var target;
		if(type == 'user') {
			target = member.user;
		} else {
			target = await guild.channels.fetch(id);
		}

		var mtmp = message;
		for(var k in VARIABLES) {
			mtmp = mtmp.replace(k, VARIABLES[k](member.user, guild, form, response ))
		}

		await target.send(mtmp);
	},

	transform(data, ctx) {
		data = data.data;

		var fields = [];
		fields.push({
			name: 'Type',
			value: data.type
		})

		fields.push({
			name: 'Event',
			value: data.event
		})

		fields.push({
			name: 'Result',
			value: "Forum post will be locked"
		})

		return fields;
	}
}