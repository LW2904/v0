require('dotenv').config();

const debug = require('debug')('app');
const { Client } = require('discord.js');
const { createInterface } = require('readline');

const client = new Client();

const token = process.env.TOKEN;
client.login(token).catch(debug);

let lastMessage = {};

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: (line, callback) => {
    const dictionary = (client.user.friends || [])
      .map((friend) => friend.username);

    const hits = dictionary.filter((name) => name.startsWith(line));

    callback(null, [ hits, line ]);
  },
});

readline.on('line', (line) => {
  if (!client.user.friends) {
    return;
  }

  const message = line.slice(
    line.indexOf(line.includes('<') ? '<' : '^') + 1
  );

  const recipient = line.includes('<')
    ? client.user.friends.filterArray(
        (friend) => friend.username 
          === line.slice(0, line.indexOf('<')).trim()
      )[0]
    : line.includes('^')
      ? lastMessage.author
      : undefined

  if (!recipient) {
    debug('invalid recipient');
    return;
  }

  recipient.send(message);
});

client.on('ready', () => {
  debug('%o ready', client.user.tag);
});

client.on('error', debug);

client.on('message', (message) => {
  if (message.author.tag === client.user.tag) {
    debug('sent message');
    return;
  }

  lastMessage = message;

  debug('%o > %o', message.author.username, message.content);
});

