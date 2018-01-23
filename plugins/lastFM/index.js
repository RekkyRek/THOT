const request = require('request')
const JsonDB = require('node-json-db')
const THOTUtils = require('../../THOTUtils/index.js')

let db = new JsonDB('users', true, false);
let THOT

let api = "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=rj&api_key=8a3f54b3b37c3a5e0adda40da34af4fb&format=json"

function fmset(msg) {
    let args = THOTUtils.parseParams(msg.content, [""])
    if(args.err) { THOT.reply(msg, 'LastFM', 'Usage: !fmset <Username>', 12189696); return; }
    db.push(`/${msg.author.id}`, args[0])
    msg.react('✅');
}

function currentPlaying(msg) {
    try {
        var user = db.getData(`/${msg.author.id}`);
        request(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${user}&api_key=8a3f54b3b37c3a5e0adda40da34af4fb&format=json`, (err, res, body) => {
            if(err) {throw err; return;}
            let data = JSON.parse(body).recenttracks;
            if(data == null) {THOT.reply(msg, 'LastFM', 'Invalid username. Set it using !fmset <Username>', 12189696); return;}
            let str = `**${data.track[0].artist['#text']} - ${data.track[0].name}**\n${data.track[1].artist['#text']} - ${data.track[1].name}`;
            THOT.reply(msg, `${user}'s LastFM`, str, 12189696);
        });
    } catch(error) {
        THOT.reply(msg, 'LastFM', 'You need to set your lastfm username using !fmset <Username>', 12189696);
    }
}

function init(thot) {
    THOT = thot

    THOT.on('!fm', currentPlaying);
    THOT.on('!fmset', fmset);
}

module.exports = {
    init,
}