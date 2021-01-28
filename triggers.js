//OpusEncoder for voice
const {OpusEncoder} = require('@discordjs/opus');
// Specify 48kHz sampling rate and 2 channel size.
const encoder = new OpusEncoder(48000, 2);

// Encode and decode.
//const encoded = encoder.encode(buffer);
//const decoded = encoder.decode(encoded);
const fs = require('fs');

module.exports = {
	detectTrigger
};

function detectTrigger(message, serverConfig){
	const args = message.content.toLowerCase().split(" ");
	if (serverConfig.secretRoom.rooms.find(r => r.roomId == message.channel.id))
		triggerVoice(message,args[0]);
	else
		triggerImage(message, serverConfig, args);
}


//Voice Triggers
function triggerVoice(message,triggerWord){

	const getCommands = (fileList) => {
		const newList = [];
		for(let i =0;i < fileList.length; i++){
			const newWord = fileList[i].split(".")
			newList.push(newWord[0]);
		}
		return newList
	}

	const fileList = fs.readdirSync("audio/")
	const voiceCommands = getCommands(fileList)
	for(let i = 0; i < voiceCommands.length; i++)

	if(!voiceCommands.find(r => r === triggerWord))	return;
	
	message.member.voice.channel.join().
	then(r => {
		const dispatcher = r.play(`audio/${triggerWord}.mp3`)
		dispatcher.on('start', () => {});
		dispatcher.on('finish', () => { return; });
		dispatcher.on('error', console.error);
	})
}

function triggerImage(message, serverConfig, args){
	serverConfig.triggers.find(r => {
		for(let i = 0; i < args.length; i++){
			if (r.triggerWord === args[i])
				message.channel.send({files: [r.triggerLink]});
		}
	});
}