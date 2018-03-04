const WS_URL = 'wss://gateway.discord.gg/?v=6&encoding=json';

const WebSocket = require('ws');
const EventEmitter = require('events');
const debug = require('debug')('client');

const Client = exports.Client = class extends EventEmitter {
  constructor(token) {
    super();

    // All values which default to undefined may be set in the process 
    // of connecting, do not count on them being set at any point in time.

    this.socket;
    this.token = token;

    this.connection = {
      sequence: 0,
      ping: undefined,
      sessionID: undefined,
    }

    this.heartbeat = {
      last: 0,
      interval: 15000,
      maxDelay: 15000,
      timer: undefined,
      timeout: undefined,
    }
  }

  connect() { return new Promise((resolve, reject) => {
    debug('connecting');

    this.socket = new WebSocket(WS_URL);

    this.socket.on('ready', resolve);
    this.socket.on('message', (data) => this.handleSocket(data));
  })}

  handleSocket(raw) {
    debug('received message');

    const message = JSON.parse(raw);
    const data = message.d;

    debug(data);

    switch (message.op) {
      // Dispatch.
      case 0: this.sequence++;
        break;
      // Invalid session.
      case 9:
        debug('invalid session');

        this.connect.sequence = 0;
        this.connection.sessionID = null;

        this.socket.send(4000, 'Received an invalid session ID.')

        break;
      // Hello.
      case 10:
        debug('socket hello');

        if (this.sequence && this.sessionID) {
          debug('resuming');          

          // We were already connected before, resume connection.
          this.socket.send(this.payloads.resume());
        } else {
          debug('identifying %o', this.payloads.identify());

          // Initial connect, we have to identify ourselves.
          this.socket.send(this.payloads.identify());
        }

        if (this.heartbeat.timer) {
          // Clear the heartbeat timer if it exists.
          clearInterval(this.heartbeat.timer);
        }

        // Try to get the interval from sent data, fallback to default if 
        // it's not provided (rare).      
        if (data.heartbeat_interval) {
          this.heartbeat.interval = data.heartbeat_interval;
        }

        debug('sending heartbeats with %oms interval',
          this.heartbeat.interval);

        // Send periodic heartbeats.
        this.heartbeat.timer = setInterval(() => {
          this.heartbeat.last = Date.now(); // To measure our ping.

          // This will get cleared in the heartbeat ACK; if it doesn't, 
          // we've exceeded our ping limit and should close the connection.
          this.heartbeat.timeout = setTimeout(() => {
            this.socket.close(4000, 'No heartbeat received.');
          }, this.heartbeat.maxDelay);

          this.socket.send(this.payloads.heartbeat());
        }, this.heartbeat.interval)

        break;
      // Heartbeat acknowledgement.
      case 11:
        clearInterval(this.socket.timeout); // Clear the failure catch.

        // Calculate our ping.
        this.connection.ping = Date.now() - this.heartbeat.last;
        break;
      default: debug('unknown opcode: %o', message.op);
    }

    switch (message.t) {
      case 'READY':
        this.connection.sessionID = data.session_id;
        break;
      case 'MESSAGE_CREATE':
        // Data should be a message object, see: 
        // https://discordapp.com/developers/docs/resources/channel#message-object
        this.emit('message', data);
        break;
    }
  }
}

Client.prototype.payloads = {
  heartbeat: function() { JSON.stringify({
    op: 1,
    d: this.connection.sequence,
  })},
  identify: () => JSON.stringify({
    op: 2,
    d: {
      token: this.token,
      v: 6,
      properties: {
        $os: require('os').platform,
        $browser: 'd3test',
        $device: 'd3test',
        $referrer: '',
        $referring_domain: '',   
      }
    }
  }),
  resume: () => JSON.stringify({
    op: 6,
    d: {
      seq: this.sequence,
      token: this.token,
      session_id: this.connection.sessionID,
    }
  }),
}
