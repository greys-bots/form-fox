module.exports = {
	description: 'requires the user to send an image',
	text: "image attachment required.",
	alias: ['image', 'img'],

	async handleMessage(message, response) {
		if(message.attachments.size == 0) {
			await message.channel.send('Invalid response! Please attach an image');
			return undefined;
		}
		if(!message.attachments.find(a => a.height && a.width)) {
			await message.channel.send('Invalid response! Please attach a valid image');
			return undefined;
		}
		response.answers.push(message.content);
		response.answers[response.answers.length - 1] += "\n\n**Attachments:**\n" + message.attachments.map(a => a.url).join("\n");
		return {response, send: true};
	}
}