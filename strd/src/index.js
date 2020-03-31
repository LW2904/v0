#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));
process.env.verbose = argv['v'] ? 1 : 0;

const Totp = require('steam-totp');
const User = require('steam-user');
const rls = require('readline-sync');
const Community = require('steamcommunity');
const TradeManager = require('steam-tradeoffer-manager');

const { log, verbose, readConfig, printTradeOffer } = require('./utils');

console.log(`
 :::::::: ::::::::::: :::::::::  :::::::::
:+:    :+:    :+:     :+:    :+: :+:    :+:
+:+           +:+     +:+    +:+ +:+    +:+
+#++:++#++    +#+     +#++:++#:  +#+    +:+
       +#+    +#+     +#+    +#+ +#+    +#+
#+#    #+#    #+#     #+#    #+# #+#    #+#
 ########     ###     ###    ### #########

           steam trade assistant
`);

if (argv['h']) {
    console.log(`Usage: strd [-hic]\n`
        + `    -h Displays usage information and exits.\n`
        + `    -c Location of the config file, can be absolute or relative. [~/.strd.json]\n`
        + `    -v Enables verbose logging.`
    );

    return;
}

const config = readConfig(argv['c']);
verbose('read config file');

const { name, password, idsec, shasec } = config;
if (!name || !password || !idsec || !shasec) {
    console.error('config file is missing required fields (name, password, '
        + 'idsec, shasec), exiting');

    return;
}

const client = new User();
const community = new Community();
const manager = new TradeManager({
    community,
    steam: client,
    language: 'en',
    domain: 'fsoc.space',
});

client.logOn({
    accountName: name,
    password,
    twoFactorCode: Totp.getAuthCode(shasec),
});

client.on('loggedOn', () => {
    log('logged onto steam');
});

client.on('steamGuard', (domain, cb, lastCodeWrong) => {
    if (domain) {
        log('steam requested an email code which is not supported, exiting');

        process.exit(1);
    }

    verbose('sending steam guard code (lastCodeWrong: %o)', lastCodeWrong);

    cb(Totp.generateAuthCode(shasec));
});

client.on('webSession', (sessionID, cookies) => {
    verbose('got a client session (%o)', sessionID);

	manager.setCookies(cookies, (err) => {
		if (err) {
			console.error(err);
			process.exit(1);
			return;
		}

        verbose('got api key (%o)', manager.apiKey);
        log('trade manager ready');
    });

	community.setCookies(cookies);
});

client.on('error', (err) => {
    log('a fatal error occurred: %o', User.EResult[err.eresult]);

    verbose(err);

    process.exit(1);
});

client.on('disconnected', (eresult, msg) => {
    verbose('got disconnected from steam: %o (%o)', User.EResult[eresult], msg);
});

manager.on('newOffer', (offer) => {
    if (offer.isGlitched()) {
        log('received a glitched offer, ignoring');
        return;
    }

    verbose(offer);

    community.getSteamUser(offer.partner, (err, user) => {
        if (err) {
            verbose('failed getting user profile: %o', err);

            printTradeOffer(offer, null);
        } else {
            printTradeOffer(offer, user);
        }

        if (rls.keyInYN(`\n               accept offer?`) !== true) {
            return;
        }

        offer.accept((err, status) => {
            if (err) {
                verbose(err);
                log('unable to accept offer: %o', err.message);
                return;
            }

            log('accepted trade offer, new status: %o', status);

            if (status === 'pending') {
                community.acceptConfirmationForObject(idsec, offer.id, (err) => {
                    if (err) {
                        verbose(err);
                        log('unable to confirm trade offer: %o', err.message);
                        return;
                    }

                    log(`confirmed trade offer #%o`, offer.id);
                });
            }
        });
    });
});

manager.on('receivedOfferChanged', (offer, oldState) => {
    log('offer #%o changed %o -> %o', offer.id, Manager.ETradeOfferState[oldState],
        Manager.ETradeOfferState[offer.state]);
});
