let THOT;
let streamOptions = { passes: 3, bitrate: 28000 };

const THOTUtils = require('../../THOTUtils');
const YouTube = require('youtube-node');
const ytdl = require('ytdl-core');

let yt = {};

const youTube = new YouTube();
youTube.setKey('AIzaSyCp0bWktjYaLcmrooSzlAxSuydt7zy2MEY');

function search(query, msg, cb) {
	youTube.search(query, 2, function(error, result) {
		if (error) {
			THOT.error(error);
			msg.react('🇽');
			msg.channel.send('An error occured.');
			return error;
		} else {
			if(result.items[0] == undefined) {
				msg.react('🇽');
				msg.channel.send(`${query} was not found.`);
				return;
			}
			cb(msg, result.items[0].id.videoId, result.items[0].snippet.title);
		}
	});
}

function play(msg) {
	let id = msg.content.split(' ')[1];
	let skip = "0s";

	if(!msg.member.voiceChannel) {msg.reply('You need to join a voice channel first!'); return;}
	
	const vc = msg.member.voiceChannel;

	if(yt[vc.id] == undefined) { yt[vc.id] = {vc: vc, queue: [], dispatcher: null}; }

	if(id.indexOf('watch?v=') > -1) {
		id = id.split('watch?v=')[1];
		if(id.indexOf('&t=') > -1) {
			console.log('&t', id.split('&t=')[1])
			skip = id.split('&t=')[1];
			id = id.split('&t=')[0];
		}
	}
	if(id.indexOf('youtu.be/') > -1) {
		id = id.split('youtu.be/')[1];
		if(id.indexOf('?t=') > -1) {
			console.log('?t', id.split('?t=')[1])
			skip = id.split('?t=')[1];
			id = id.split('?t=')[0];
		}
	}

	if(!ytdl.validateID(id)) {
		let query = msg.content.split(' ');
		query.shift();
		query = query.join(' ');
		search(query, msg, (msg, id, name)=>{
			yt[vc.id].queue.push({id, skip, name})
			msg.channel.send(`Added **${name}** to the queue.`)
			if(yt[vc.id].queue.length == 1) {
				playQueue(vc, id, skip, name);
			}
		});
	} else {
		youTube.getById(id, function(error, result) {
			if (error) {
				msg.react('🇽');
				msg.channel.send('Invalid video.');
				return;
			} else {
				yt[vc.id].queue.push({id, skip, name: result.items[0].snippet.title})
				msg.channel.send(`Added **${result.items[0].snippet.title}** to the queue.`)
				if(yt[vc.id].queue.length == 1) {
					playQueue(vc, id, skip, result.items[0].snippet.title);
				}
			}
		});
	}
}

function youtube(msg) {
	let query = msg.content.split(' ');
	query.shift();
	query = query.join(' ');
	if(query.length > 1) {
		search(query, msg, playAudio);
	} else {
		msg.react('🇽')
	}
}

function playQueue(vc, id, skip = "0s", name) {
	try {
		let channel = THOT.client.channels.get(THOT.config.home);
		channel.send(`Playing **${name}**`);
		let stream;
		if (skip != "0s") {
			stream = ytdl(`http://www.youtube.com/watch?v=${id}`, { begin: skip });
		} else {
			stream = ytdl(`http://www.youtube.com/watch?v=${id}`, { filter: 'audioonly' });
		}
		yt[vc.id].vc.join()
		.then(connection => { // Connection is an instance of VoiceConnection
			yt[vc.id].dispatcher = connection.playStream(stream, streamOptions);
			yt[vc.id].dispatcher.on('end', () => {
				yt[vc.id].queue.shift();
				if(yt[vc.id].queue.length == 0) {
					yt[vc.id].vc.leave();
				} else {
					setTimeout(()=>{
						playQueue(vc, yt[vc.id].queue[0].id, yt[vc.id].queue[0].skip, yt[vc.id].queue[0].name);
					}, 250);
				}
			});
		})
		.catch(THOT.error);
	} catch(e) {
		console.log(e)
	}
}

function begone(msg) {
	if (msg.member.voiceChannel) {
		msg.member.voiceChannel.leave();
	} else {
		msg.channel.send('but DADDY OwO');
	}
}

function skip(msg) {
	let vc = msg.member.voiceChannel;
	if(vc == undefined) {return;}
	if(!THOT.isDaddy(msg.author)) {
		msg.reply(`You're not my daddy :triumph: :raised_hand:`)
		msg.react('😤')
		msg.react('✋')
		return;
	}
	if(yt[vc.id].queue.length > 0) {
		if(yt[vc.id].dispatcher) {
			yt[vc.id].dispatcher.end();
		}
	}
}

function developerOptions(msg) {
	let args = THOTUtils.parseParams(msg.content, [0,0]);
	if (args.err) {msg.channel.send('usage: !options <passes> <bitrate>')}
	if(THOT.isDaddy(msg.author)) {
		streamOptions = { passes: args[0], bitrate: args[1] };
		msg.react('✅')
	} else {
		msg.reply(`You're not my daddy :triumph: :raised_hand:`)
		msg.react('😤')
		msg.react('✋')
	}
}

function sendQueue(msg) {
	let vc = msg.member.voiceChannel;
	if(vc == undefined) {return;}
	let str = ``;
	yt[vc.id].queue.forEach(song => {
		str += `**${song.name}**\n`;
	});
	if(str.length > 0) {
		msg.channel.send(str);
	} else {
		msg.channel.send('**There are no songs in the queue.**');		
	}
}

function init(thot) {
	THOT = thot;
	THOT.on('!play', play);
	THOT.on('!youtube', youtube);
	THOT.on('!yt', youtube);
	THOT.on('!options', developerOptions);
	THOT.on('!queue', sendQueue);
	THOT.on('!skip', skip);
	THOT.on('begone', begone);
}

module.exports = {
	init: init,
};
