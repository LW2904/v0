const EventEmitter = require('events');

const Steam = require('steam-user');
const Community = require('steamcommunity');
const Manager = require('steam-tradeoffer-manager');

const { question } = require('readline-sync');
const { generateAuthCode } = require('steam-totp');
const { writeFile, existsSync, readFileSync } = require('fs');

const debug = require('debug')('trader');

const Trader = exports.Trader = class extends EventEmitter {
  /**
   * Construct a new trader.
   * 
   * @param {object} account - An account object.
   * @param {string} account.accountName - The username of the account.
   * @param {string} account.password - The plaintext password of the account.
   * @param {string} [account.shasec] - The shared secret of the account.
   * @param {string} [account.idsec] - The identity secret of the account.
   * @param {object} [options] - An options object.
   * @param {boolean} autostart=false - Start login upon construction.
   * @param {boolean} queryCode=false - Ask the user for their steam guard code.
   * @param {number} confirmationInterval=15000 - The interval at which trades should be confirmed.
   */
  constructor(account, options = {}) {
    super();

    this.account = account;

    this.options = Object.assign({
      autostart: false,
      queryCode: false,
      confirmationInterval: 15000,
    }, options);

    this.client = new Steam();
    this.community = new Community();
    this.manager = new Manager({
      language: 'en',
      steam: this.client,
      pollInterval: 5000,
      domain: process.env.DOMAIN || 'example.com',
    });

    this.client.setOption('promptSteamGuardCode', false);

    if (existsSync('polldata.json')) {
      manager.pollData = JSON.parse(readFileSync('polldata.json', 'utf8'));
    }

    this.manager.on('polldata', (data) => {
      debug('got polldata');

      writeFile('polldata.json', JSON.stringify(data));
    });

    this.client.on('error', this.handleClientError);
    this.client.on('steamGuard', this.handleSteamGuard);
    this.client.on('webSession', this.handleWebSession);

    if (this.options.autostart) {
      this.client.logOn(account);
    }
  }

  /**
   * Log on to steam and kick off the initialisation.
   * 
   * @returns {Promise} - Resolved when the trader is ready.
   * @public
   */
  initialise() {
    return new Promise((resolve, reject) => {
      if (client.publicIP) {
        resolve();
      }

      this.client.logOn(account);

      this.on('ready', resolve);
    });
  }

  /**
   * @param {Error} err
   * @param {number} [err.eresult] - A steam EResult.
   * @private
   */
  handleClientError(err) {
    debug('client error (%o / %o)', err.message, err.eresult);

    this.emit('clientError', {
      err,
      message: err.eresult ? Steam.EResult[err.eresult] : null,
    });
  }

  /** 
   * @param {boolean} domain - Email code required.
   * @param {Function} callback - To call with the obtained Steam Guard code.
   * @private
   */
  handleSteamGuard(domain, callback) {
    debug('steam guard event (%o)', domain ? 'email' : 'mobile');

    const code = this.account.shasec ? (
      generateAuthCode(this.account.shasec)
    ) : this.options.queryCode ? (
      question(`${domain ? 'Email' : 'Mobile'} code: `)
    ) : undefined;

    if (!code) {
      return console.log('Failed to obtain Steam Guard code.');
    }

    return callback(code);
  }

  /**
   * @param {string} sessionID 
   * @param {object} cookies
   * @private
   */
  handleWebSession(sessionID, cookies) {
    debug('websession obtained');

    this.manager.setCookies(cookies, (err) => {
      if (err) {
        return this.emit('managerError', {
          err,
          message: 'Failed to obtain API key.',
        });
      }

      return this.emit('ready');
    });

    this.community.setCookies(cookies);

    if (this.account.idsec) {
      this.community.startConfirmationChecker(
        this.confirmationInterval, this.account.idsec
      )

      debug('set up confirmation checker at a %oms interval',
        this.confirmationInterval);
    }
  }
}