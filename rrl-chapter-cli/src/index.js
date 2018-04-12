#!/usr/bin/env node

const marked = require('marked');
const { join } = require('path');
const { cwd } = require('process');
const program = require('commander');
const { RoyalRoadAPI } = require('@l1lly/royalroadl-api');
const { existsSync, readFile, writeFile } = require('fs');
const { question, password, keyInSelect } = require('readline-sync');

const api = new RoyalRoadAPI();

program.command('parse <file>', 'Parse a markdown file into RRL readable HTML.')
  .option('--out <path>', 'File to write parsed markdown to.')
  .action(async (file, opts) => {
    const html = parseMarkdown(await getFile(file));

    if (opts.out) {
      writeFile(join(cwd(), file), html, (err) => {
        if (err) {
          console.error('Failed to write file: ' + err.message);
        }
      });
    }

    process.stdout.write(html);
    process.stdout.end();

    process.exit(1);
  });

program.command('publish [file]')
  .option('-a, --ask', 'Prompt for required information.')
  .action(async (file, opts) => {
    const content = parseMarkdown(await getFile(file));

    let title, fiction, username, password;

    if (opts.ask) {
      title = title || question('Chapter title: ');
      username = username || question('Username: ');
      password = password || password('Password: ');
    }

    try {
      await api.user.login(username, password);
      
      const myFictions = await api.user.myFictions();
      const fiction = myFictions[
        keyInSelect(myFictions.map((fic) => fic.title))
      ].id;

      const res = await api.fiction.publishChapter(fiction, {
        title,
        content,
        preNote: '',
        postNote: '',
      });

      writeFile('res.html', res);
    } catch (err) {
      console.log('RRL API error: ' + err.message);
    }

    console.log('Published chapter.');
  });

program.version(require('../package.json').version);
program.parse(process.argv);

/**
 * Parses markdown into HTML that is readable by RRL.
 * TODO: Implement custom header handling logic.
 * 
 * @param {string} md 
 */
function parseMarkdown(md) {
  const html = marked(md);

  return html;
}

/**
 * Tries to read a file, either through the name argument or stdin.
 * 
 * @param {string} [name]
 * @return {Promise<string>} - Raw markdown.
 */
function getFile(name) { return new Promise((resolve, reject) => {
  if (name) {
    if (!existsSync(join(require('process').cwd(), name))) {
      return reject('File does not exist.');
    }

    readFile(join(cwd(), name), 'utf8', (err, file) => {
      if (err) {
        return reject('Failed to read file: ' + err.message);
      }

      resolve(file);
    })
  }

  process.stdin.setEncoding('utf8');
  
  let file = '';
  process.stdin.on('readable', () => {
    const chunk = process.stdin.read();
    if (chunk !== null) {
      file += chunk;
    }
  });

  process.stdin.on('end', () => {
    if (file.length !== 0) {
      return resolve(file);
    }
  });
})}