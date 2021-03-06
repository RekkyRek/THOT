const fs = require('fs')
const THOTUtils = require('../../THOTUtils/index.js')

let THOT

function setDaddy (msg) {
  require('./functions/setdaddy.js')(msg, THOT.config, THOT)
}

function plugins (msg) {
  require('./functions/plugins.js')(msg, THOT.plugins, THOT.reply)
}

function help (msg) {
  require('./functions/help.js')(msg, THOT.plugins, THOT.reply)
}

function helpall (msg) {
  require('./functions/helpall.js')(msg, THOT)
}

function setHome (msg) {
  if (!this.isDaddy(msg)) {
    this.notMyDaddy(msg)
    return
  }
  THOT.setServerData(msg.guild.id, 'home', msg.channel.id)
  msg.react('✅')
}

function setDefaultRole (msg) {
  if (!this.isDaddy(msg)) {
    this.notMyDaddy(msg)
    return
  }
  if (msg.content.split(' ')[1] === undefined) {
    msg.channel.send('Usage: !setDefaultRole <Role Name>')
    return
  }
  if (THOT.client.guilds.get(msg.guild.id).roles.find('name', msg.content.split(' ')[1]) === null) {
    msg.channel.send(`Sorry but i couldn't find ${msg.content.split(' ')[1]}`)
    return
  }

  THOT.setServerData(msg.guild.id, 'defaultRole', msg.content.split(' ')[1])
  msg.react('✅')
}

function memberAdd (member) {
  console.log(member)
  let role = THOT.client.guilds.get(member.guild.id).roles.find('name', THOT.getServerData(member.guild.id, 'defaultRole'))
  if (role !== undefined) {
    member.addRole(role).catch(THOT.error)
  }
}

function guildCreate (server) {
  const defaultChannel = THOTUtils.getDefaultChannel(server)

  let cserver = {
    daddy: {},
    triggers: {},
    enabled: 'true',
    home: defaultChannel.id,
    defaultRole: null
  }

  cserver.daddy[server.owner.user.id] = 'true'

  THOT.setServerData(server.id, '...', cserver)

  defaultChannel.send('Hi there! My name is THOT and i enjoy **pleasing daddy** :weary:\nUse `!sethome` to select which channel i should spam my messages in.\nYou can also use `!help` to get a list of my commands.')
}

function init (thot) {
  THOT = thot

  THOT.on('!setdaddy', setDaddy)
  THOT.on('!plugins', plugins)
  THOT.on('!help', help)
  THOT.on('!helpall', helpall)
  THOT.on('!sethome', setHome)
  THOT.on('!setdefaultrole', setDefaultRole)

  THOT.on('THOTFunction_guildMemberAdd', memberAdd)
  THOT.on('THOTFunction_guildCreate', guildCreate)
}

module.exports = {
  init
}
