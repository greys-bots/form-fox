module.exports = {
	name: "pong",
	description: "pong",
	type: 2,
	options: [],
	ephemeral: true
}

module.exports.options.push({
	name: 'ee',
	description: 'h',
	type: 1,
	options: [
		{
			name: 'one',
			description: 'a thing to say',
			type: 3,
			required: false
		}
	],
	async execute(ctx) {
		var arg = ctx.options.get('one');
		return arg?.value || "hhhh";
	}
})