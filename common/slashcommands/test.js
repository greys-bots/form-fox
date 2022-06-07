module.exports = {
	data: {
		name: 'test',
		description: "Testing permissions"
	},
	usage: [
		'- Test stuff'
	],
	async execute(ctx) {
		return 'nya'
	},
	permissions: ['MANAGE_MESSAGES']
}