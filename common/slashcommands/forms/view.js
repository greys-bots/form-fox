module.exports = {
	name: 'view',
	description: 'View a specific form, or see all forms',
	options: [{
		name: 'form_id',
		description: "The form's ID. Omit to see all forms",
		type: 3,
		required: false
	}],
	async execute(ctx) {

	},
	ephemeral: true
}