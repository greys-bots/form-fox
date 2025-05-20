module.exports = {
	description: 'requires the user to send an image',
	text: "image attachment required.",
	alias: ['image', 'img'],

	embed(data) {
		return [{
			type: 10,
			content: '-# Requires an image and optional text'
		}];
	},

	async handle({ prompt, response, data }) {
		if(data.attachments.size == 0) {
			await prompt.channel.send('Invalid response! Please add an image');
			return;
		}

		if(!data.attachments.find(a => a.height && a.width)) {
			await prompt.channel.send('Invalid response! Please attach a valid image');
			return;
		}

		var answer = data.content + "\n\n**Attachments:**\n" + data.attachments.map(a => a.url).join("\n")
		var embed = prompt.components[0].toJSON();
		embed.components[embed.components.length - 1] = {
			type: 10,
			content: answer
		}

		response.answers.push(answer);
		return {response, send: true, embed};
	}
}