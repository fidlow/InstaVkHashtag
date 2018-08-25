const db = require('./connect_db').db;

function writeInDB(id, name) {
    db.one('INSERT INTO '+name+'Media ('+ name + 'id) VALUES($1::text) RETURNING '+name+ 'id;', id)
        .then(function (results) {
            console.log(name + ' ID of inserted item is ' + results[name + 'id']);
        })
        .catch(function (error) {
            console.log("writeInDB Error " + error);
        });
}

function deleteInDB(id, name) {
    db.one('DELETE FROM '+name+'Media WHERE '+ name + 'id = $1::text RETURNING '+name+ 'id;', id)
        .then(function (results) {
            console.log(name + ' ID of deleted item is ' + results[name + 'id']);
        })
        .catch(function (error) {
            console.log("deleteInDB Error " + error + id);
        });
}
function isInMediaDB(id, name) {
    return new Promise(function(resolve) {
        db.oneOrNone('SELECT Count(*) FROM '+ name +'Media WHERE '+ name +'id=$1::text;', id)
            .then(function (results) {
                resolve(results['count']);
            })
            .catch(function (error) {
                console.log("isInMediaDB Error " + error);
            });
    });
}

module.exports.writeInDB = writeInDB;
module.exports.isInMediaDB = isInMediaDB;
module.exports.deleteInDB = deleteInDB;