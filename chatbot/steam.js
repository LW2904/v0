const Steam = require('steam-user')
let client = new Steam()

client.setOption('promptSteamGuardCode', false)

const log = require('winston')

function logOn (account) {
  let a = account
  return new Promise((resolve, reject) => {
    client.logOn(account)

    client.on('error', e => {
      log.silly(`error event received.`)
      reject(e)
    })

    // TODO: This gets emitted even when creds are wrong, implement checks.
    client.on('loggedOn', details => {
      log.silly(`loggedOn event received.`)

      resolve(client)
    })

    client.on('webSession', (sessionID, cookies) => {
      log.silly(`webSession event received (${sessionID}).`)
    })

    client.on('steamGuard', (domain, callback) => {
      log.silly(`steamGuard event received.`)

      if (a.shasec) { require('steam-totp').getAuthCode(a.shasec, (e, code) => callback(code)) }
      else { callback(require('readline-sync').question(`${domain ? 'EMail' : 'Mobile'} code: `)) }
    })
  })
}

exports.logOn = logOn
