let THOT
let streamOptions = { passes: 4, bitrate: 28000 }

const THOTUtils = require('../../THOTUtils')
const YouTube = require('youtube-node')
const ytdl = require('ytdl-core')

let yt = {}

const youTube = new YouTube()
youTube.setKey('AIzaSyCp0bWktjYaLcmrooSzlAxSuydt7zy2MEY')

function search (query, msg, amount = 2, cb) {
  youTube.search(query, amount, function (error, result) {
    if (error) {
      THOT.error(error)
      THOT.reply(msg, 'Music Error', 'An error occured.')
      return error
    } else {
      if (result.items[0] === undefined) {
        THOT.reply(msg, 'Music Error', `${query} was not found.`)
        return
      }
      if (amount > 2) {
        cb(msg, result.items)
      } else {
        cb(msg, result.items[0].id.videoId, result.items[0].snippet.title)
      }
    }
  })
}

function play (msg) {
  let id = msg.content.split(' ')[1]
  let skip = '0s'

  if (id === undefined) { msg.reply('Usage: **!play <search || id>**'); return }

  if (!msg.member.voiceChannel) { msg.reply('You need to join a voice channel first!'); return }

  console.log(THOT.isTurbo(msg))

  if (!THOT.isTurbo(msg)) {
    THOT.buyTurboMessage(msg)
    return
  }

  const vc = msg.member.voiceChannel

  if (yt[vc.id] === undefined) { yt[vc.id] = {vc: vc, queue: [], dispatcher: null} }

  if (id.indexOf('watch?v=') > -1) {
    id = id.split('watch?v=')[1]
    if (id.indexOf('&t=') > -1) {
      console.log('&t', id.split('&t=')[1])
      skip = id.split('&t=')[1]
      id = id.split('&t=')[0]
    }
  }
  if (id.indexOf('youtu.be/') > -1) {
    id = id.split('youtu.be/')[1]
    if (id.indexOf('?t=') > -1) {
      console.log('?t', id.split('?t=')[1])
      skip = id.split('?t=')[1]
      id = id.split('?t=')[0]
    }
  }

  if (!ytdl.validateID(id)) {
    let query = msg.content.split(' ')
    query.shift()
    query = query.join(' ')
    search(query, msg, 2, (msg, id, name) => {
      yt[vc.id].queue.push({ id, skip, name, requestedBy: msg.member.id })
      THOT.reply(msg, 'Music Queue', `Added [**${name}**](https://youtu.be/${id}) to the queue.`, 16711680)
      THOT.useTurbo(msg)
      if (yt[vc.id].queue.length === 1) {
        playQueue(vc, id, skip, name)
      }
    })
  } else {
    youTube.getById(id, function (error, result) {
      if (error) {
        THOT.reply(msg, 'Music Error', 'Invalid video.')
      } else {
        yt[vc.id].queue.push({ id, skip, name: result.items[0].snippet.title, requestedBy: msg.member.id })
        THOT.reply(msg, 'Music Queue', `Added [**${result.items[0].snippet.title}**](https://youtu.be/${id}) to the queue.`, 16711680)
        THOT.useTurbo(msg)
        if (yt[vc.id].queue.length === 1) {
          playQueue(vc, id, skip, result.items[0].snippet.title)
        }
      }
    })
  }
}

function youtube (msg) {
  let query = msg.content.split(' ')
  query.shift()
  query = query.join(' ')

  if (query === '') { msg.reply('Usage: **!yt <search query>**'); return }
  if (!msg.member.voiceChannel) { msg.reply('You need to join a voice channel first!'); return }

  let vc = msg.member.voiceChannel
  if (query.length > 1) {
    search(query, msg, 10, (msg, results) => {
      let emojis = [ '1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', '🔟' ]
      let str = ''

      results.forEach(result => {
        str += `${emojis[results.indexOf(result)]} ${result.snippet.title}\n`
      })

      THOT.reply(msg, 'Music Search', str, 16711680)
        .then(message => {
          let i = 0

          const react = () => {
            i++
            if (i > emojis.length) { return }
            message.react(emojis[i - 1]).then(react).catch(() => {})
          }

          react()

          const onReact = (reaction, user) => {
            console.log(reaction, user)
            if (user.id !== THOT.client.user.id) {
              if (reaction.message.id === message.id && user.id === msg.author.id) {
                if (emojis.indexOf(reaction.emoji.toString()) > -1) {
                  const index = emojis.indexOf(reaction.emoji.toString())

                  if (!ytdl.validateID(results[index].id.videoId)) { msg.reply('Oops, looks like that option didn\'t have a valid ID.'); return }

                  if (!THOT.isTurbo(msg)) {
                    THOT.buyTurboMessage(msg)
                    return
                  }

                  THOT.useTurbo(msg)

                  vc = msg.member.voiceChannel
                  if (yt[vc.id] === undefined) { yt[vc.id] = {vc: vc, queue: [], dispatcher: null} }

                  yt[vc.id].queue.push({id: results[index].id.videoId, skip: '0s', name: results[index].snippet.title, requestedBy: msg.member.id})
                  THOT.reply(msg, 'Music Queue', `Added [**${results[index].snippet.title}**](https://youtu.be/${results[index].id.videoId}) to the queue.`, 16711680)

                  if (yt[vc.id].queue.length === 1) {
                    playQueue(vc, results[index].id.videoId, '0s', results[index].snippet.title)
                  }

                  THOT.removeListener('THOTFunction_messageReactionAdd', onReact)
                  message.delete()
                }
              }
            }
          }

          THOT.on('THOTFunction_messageReactionAdd', onReact)
        })
        .catch(console.error)
    })
  } else {
    msg.react('🇽')
  }
}

function playQueue (vc, id, skip = '0s', name) {
  try {
    let msg = {channel: THOT.client.channels.get(THOT.config.servers[vc.guild.id].home)}
    THOT.reply(msg, 'Music Queue', `Playing [**${name}**](https://youtu.be/${id})`, 16711680)
    yt[vc.id].vc.join()
    .then(connection => { // Connection is an instance of VoiceConnection
      let stream
      if (skip !== '0s') {
        stream = ytdl(`https://www.youtube.com/watch?v=${id}`, { begin: skip })
      } else {
        stream = ytdl(`https://www.youtube.com/watch?v=${id}`, { filter: 'audioonly' })
      }
      yt[vc.id].dispatcher = connection.playStream(stream, streamOptions)
      yt[vc.id].dispatcher.on('end', () => {
        yt[vc.id].queue.shift()
        if (yt[vc.id].queue.length === 0) {
          yt[vc.id].vc.leave()
        } else {
          setTimeout(() => {
            playQueue(vc, yt[vc.id].queue[0].id, yt[vc.id].queue[0].skip, yt[vc.id].queue[0].name)
          }, 250)
        }
      })
    })
    .catch(THOT.error)
  } catch (e) {
    THOT.error(e)
    let msg = {channel: THOT.client.channels.get(THOT.config.home)}
    THOT.reply(msg, 'Music Queue', `Hmm, looks like [**${name}**](https://youtu.be/${id}) is not a valid video. It has been skipped.`, 16711680)
    yt[vc.id].queue.shift()
    if (yt[vc.id].queue.length === 0) {
      yt[vc.id].vc.leave()
    } else {
      setTimeout(() => {
        playQueue(vc, yt[vc.id].queue[0].id, yt[vc.id].queue[0].skip, yt[vc.id].queue[0].name)
      }, 250)
    }
  }
}

function skip (msg) {
  let vc = msg.member.voiceChannel
  if (vc === undefined) { return }

  if (yt[vc.id].queue[0].requestedBy === msg.member.id || THOT.isDaddy(msg)) {
    if (yt[vc.id].queue.length > 0) {
      THOT.reply(msg, 'Music Queue', `Skipped [**${yt[vc.id].queue[0].name}**](https://youtu.be/${yt[vc.id].queue[0].id})`)
      if (yt[vc.id].dispatcher) {
        yt[vc.id].dispatcher.end()
      }
    }
  } else {
    THOT.notMyDaddy(msg)
  }
}

function clear (msg) {
  let vc = msg.member.voiceChannel
  if (vc === undefined) { return }

  if (!THOT.isDaddy(msg)) {
    THOT.notMyDaddy(msg)
    return
  }
  if (yt[vc.id] && yt[vc.id].queue.length > 0) {
    yt[vc.id].queue = []
    if (yt[vc.id].dispatcher) {
      yt[vc.id].dispatcher.end()
    }
    THOT.reply(msg, 'Music Queue', '**Cleared the queue.**')
  }
}

/* function developerOptions (msg) {
  let args = THOTUtils.parseParams(msg.content, [0, 0])
  if (args.err) { THOT.reply(msg, 'Usage Error', 'Usage: !options <passes> <bitrate>') }
  if (THOT.isDaddy(msg)) {
    streamOptions = { passes: args[0], bitrate: args[1] }
    msg.react('✅')
  } else {
    THOT.notMyDaddy(msg)
  }
} */

function sendQueue (msg) {
  let vc = msg.member.voiceChannel
  if (vc === undefined) { return }
  let str = ``
  yt[vc.id].queue.forEach(song => {
    str += `**${song.name}**\n`
  })
  if (str.length > 0) {
    THOT.reply(msg, 'Music Queue', str)
  } else {
    THOT.reply(msg, 'Music Queue', '**There are no songs in the queue.**')
  }
}

function init (thot) {
  THOT = thot
  THOT.on('!play', play)
  THOT.on('!youtube', youtube)
  THOT.on('!yt', youtube)
  // THOT.on('!options', developerOptions)
  THOT.on('!queue', sendQueue)
  THOT.on('!clear', clear)
  THOT.on('!skip', skip)
  THOT.on('begone', clear)
}

module.exports = {
  init: init
}
