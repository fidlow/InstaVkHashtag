const options = require('./options');
const pgp = require('pg-promise')();
const db = pgp(options.postgres);
db.one("select 1;").then(()=>{
    console.log("ON Database");
});

module.exports.db = db;
module.exports.pgp = pgp;
