let THOT;

const THOTUtils = require('../../THOTUtils/index.js');
const Jimp = require("jimp");
const imgurUploader = require('imgur-uploader');

function jpeg(msg) {
	let args = THOTUtils.parseParams(msg.content, ["", 0]);
	if(args.err) {msg.react('🇽'); msg.channel.send('Usage: !jpeg <Image URL> <Quality 1-100>'); return;}
	console.log(msg.embeds[0].thumbnail.url)

	Jimp.read(msg.embeds[0].thumbnail.url, function (err, image) {
		if(err) {msg.react('🇽'); msg.channel.send('Error: ' + err); return;}
		image.quality(args[1]);
		image.getBuffer( Jimp.MIME_JPEG, (err, buffer)=>{
			imgurUploader( buffer, {title: `THOT - JPEG by ${msg.author.username}`}).then(data => {
				msg.channel.send(data.link);
			});
		});
	});
}

function init(thot) {
	THOT = thot;
	THOT.on('!jpeg', jpeg);
}

module.exports = {
	init: init,
};
