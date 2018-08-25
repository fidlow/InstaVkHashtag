const path = require('path');
const options = require('./options');
const _ = require('underscore');
const Promise = require('bluebird');
const Client = require('instagram-private-api').V1;
const device = new Client.Device("someuser");
const cookiePath = process.cwd() + '/cookies/'+options.instagram.username+'.json';
const storage = new Client.CookieFileStorage(path.resolve(cookiePath));

const session = new Client.Session(device, storage);
storage.getAccountId()
    .then(function(){
        console.log('ON Instagram');
    });
function Login() {
   return Client.Session.create(device, storage, options.instagram.username, options.instagram.password)
        .then(function(session) {
            console.log('Login in instagram success');
            storage.getAccountId()
                .then(function(){
                    console.log('ON Instagram');
                });
        });
}
function TagMedia (hashtag){
    return new Promise(function(resolve, reject) {
        let feed = new Client.Feed.TaggedMedia(session, hashtag);
        Promise.map(_.range(0, 1), function() {
            return feed.get();
        }).then(function(results) {
                //console.log(results[0]);
                resolve(results[0]);
            }).catch((e)=>{
                console.error('Error instagram 2 ' + e.name + ":" + e.message );
                if(e.name === 'CookieNotValidError')
                    Login();
                feed = null;
                reject(e);
        });        
    });
}

function LocationMedia (location){
    return new Promise(function(resolve) {
        let feed = new Client.Feed.LocationMedia(session, location);
        Promise.map(_.range(0, 1), function() {
            return feed.get();
        }).then(function(results) {
            resolve(results[0]);
        }).catch((e)=>{
            console.error('Error instagram 3 ' + e.name + ":" + e.message);
            if(e.name === 'CookieNotValidError')
                Login();
        });
    });
}

function GetMyFollowers (){
    return new Promise(function(resolve) {
        //Client.Account.search(session, 'sporturfu').then((a)=> {console.log(a); });
        let feed = new Client.Feed.AccountFollowers(session, 2864797541);
        Promise.map(_.range(0, 1), function() {
            return feed.get();
        }).then(function(results) {
           // console.log(results[0]);
            resolve(results[0]);
        });
    });
}
module.exports.TagMedia = TagMedia;
module.exports.LocationMedia = LocationMedia;
module.exports.GetMyFollowers = GetMyFollowers;
module.exports.Login = Login;
