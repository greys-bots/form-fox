const tc = require('tinycolor2');

module.exports = {
	name: 'color',
	description: "Changes a form's color",
	options: [
		{
			name: 'form_id',
			description: 'The form\'s ID',
			type: 3,
			required: true
		},
		{
			name: 'color',
			description: 'The color you want. Omit to view/clear current color',
			type: 3,
			required: false
		}
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase();
		var c = ctx.options.get('color')?.value;
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!c) {
			if(!form.color) return 'Form has no color set!';

			var rdata = {
				content: `Current color: **#${form.color}.**`,
				ephemeral: true,
				components: [
					{
						type: 1,
						components: [
							{
								type: 2,
								style: 4,
								label: 'Clear',
								custom_id: 'clear',
								emoji: { name: '🗑'}
							}
						]
					}
				]
			}
			await ctx.reply(rdata);

			var reply = await ctx.editReply(rdata);
			var click = await reply.awaitMessageComponent({filter: (int) => int.customId == "clear" && int.user.id == ctx.user.id, time: 30000});
			if(!click) {
				await click.update({components: {type: 1, components: [{
					type: 2,
					style: 4,
					label: 'clear',
					custom_id: 'clear',
					emoji: {name: '🗑'},
					disabled: true
				}]}});

				return;
			}

			await ctx.client.stores.forms.update(ctx.guildId, form.hid, {color: undefined});
			await ctx.followUp('Color reset!');
			await click.update({components: [{type: 1, components: [{
				type: 2,
				style: 4,
				label: 'clear',
				custom_id: 'clear',
				emoji: {name: '🗑'},
				disabled: true
			}]}]});
			return;
		}
		
		var color = tc(c);
		if(!color.isValid()) return 'That color isn\'t valid!';

		color = color.toHex();
		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {color});
		return 'Form updated!';
	},
	perms: ['MANAGE_MESSAGES'],
	guildOnly: true
}