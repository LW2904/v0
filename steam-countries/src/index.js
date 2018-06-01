require('dotenv').config();

const r = require('rethinkdbdash')();
const log = require('./logger')('index');

const { getFriends, getCountry } = require('./steam');

let tn = 0;
let lastFinished = true;

/**
 * End tick, logging a final status and setting it to finished.
 */
const endTick = (msg, obj = {}) => {
    if (typeof msg === 'string') {
        obj.msg = msg;
    } else { obj = msg; }

    obj.tick = tn;

    log.info(obj);

    lastFinished = true;
};

const tick = async () => {
    tn++;

    log.trace({ tick: tn }, 'starting tick');

    const pool = r.db('steam').table('id_pool');
    const countries = r.db('steam').table('countries');

    if (!lastFinished) {
        return endTick('last unfinished, skipping');
    }

    lastFinished = false;

    const subpool = await pool.filter({ open: true }).limit(1);
    const active = subpool[0];

    log.trace('fetched subpool');

    // No open ID found, refill pool.
    if (!active) {
        // Fetch a random ID to use as base.
        const sample = (await pool.sample(1))[0];
        // If pool is empty use fallback ID.
        const base = sample ? sample.id : process.env.FALLBACK_ID;

        log.debug({ base }, 'rebuilding pool');

        let ids;
        try {
            ids = (await getFriends(base))
                .map((id) => ({ id, ts: Date.now(), open: true }));
        } catch (err) {
            // Will retry on next tick.
            return endTick('failed fetching ids', err);
        }

        // The ID is already in the database, leave unchanged.
        const conflict = (id, od) => {
            log.trace('id insertion conflict');
            return od;
        };

        let res;
        try {
            res = await pool.insert(ids, { conflict });
        } catch (err) {
            return endTick('failed inserting ids', err);
        }

        return endTick('inserted new ids', res);
    }

    log.debug(active, 'processing id');

    const country = (await getCountry(active.id)) || 'zz';
    const exists = (await countries.get(country)) !== null;

    let cUpd;
    if (!exists) {
        log.trace('found country entry, incrementing');
        cUpd = await countries.get(country).update({
            occ: r.row('occ').add(1).default(1),
        });
    } else {
        log.trace('no country entry found, inserting');
        cUpd = await countries.insert({ id: country, occ: 1 });
    }

    // Close the id and update the timestamp.
    const pUpd = await pool.get(active.id).update({
        open: false,
        ts: Date.now(),
    });

    log.trace(pUpd, 'closed id in pool');

    return endTick('updated country', cUpd);
};

/**
 * Build the given database structure.
 * 
 * Structure example: { db1: [ table1, table2 ], db2: [ table3 ] }
 */
const setup = async (structure) => {
    for (const db of Object.keys(structure)) {
        log.trace('creating %s', db);

        try { await r.dbCreate(db); } catch (err) {
            log.trace(err.msg || err.message);            
        }

        for (const table of structure[db]) {
            log.trace('creating %s.%s', db, table);

            try { await r.db(db).tableCreate(table); } catch (err) {
                log.trace(err.msg || err.message);
            }
        }
    }
};

(async () => {

    await setup({
        steam: [ 'id_pool', 'countries' ],
    });

    const interval = process.env.INTERVAL || 60 * 1000;
    tick().catch((err) => log.warn(err));
    setInterval(() => {
        tick().catch((err) => log.warn(err));
    }, interval);

})().catch((err) => log.fatal(err));