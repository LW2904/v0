const PATH = process.env.DATA || '../steamdata.json'

const fs = require('fs')
const rs = require('readline-sync')

const log = require('./logger')
const steam = require('./steam')

const Bot = require('./Bot')

let account = require(PATH).bot

steam.logOn(account)
.catch(err => {
  log.error(`something went wrong while logging on: ${err.message || err.msg || err}`)
  err.stack && log.debug(err.stack)
})
.then(client => {
  log.info(`logged on to steam.`)
  return new Bot(client)
})
.then(bot => {
  log.info(`bot initialized.`)
})
.catch(err => {
  log.error(`something went wrong: ${err.message || err.msg || err}`)
})
