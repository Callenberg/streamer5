//Copyright 2025 by Retro Audiophile Designs
//GNU General Public License v3.0 see license.txt            [Source code]
//                      ~ webserver for Streamer ~
module.exports.startWebServer = startWebServer;

/**Start the web server and define the web pages to be served. 
 * In addition start io.socket so that backend and frontend
 * can coomunicate with io.emit and io.on
 * @global {io} set the the io.socket 
 * @return {io} io.socket server object
 */
async function startWebServer(pageArray) {
//Require modules needed for web server:
  let express = require('express');
  let app = require('express')();
  let server = require('http').Server(app);                         //start webserver
  let path = require('path');
  let router = express.Router();
  let io = require('socket.io')(server);                            //start io.socket
                         
  //start Express and socket.io on port 80
  server.listen(80);
  
  const numberOfPages = pageArray.length;
  for (let i = 0; i < numberOfPages; i++) {
        router.get('/', function (req, res) {
            res.sendFile(path.join(__dirname +pageArray[i]));
        });
  };

/* Older way of definitions for each page routing:
    router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname +'/pages/streamer.html'));
  });
  */
 
  //set the http server directories needed to serve the HTML pages:
  app.use(express.static(__dirname + '/pages'));
  app.use(express.static(__dirname + '/pages/ccs'));
  app.use(express.static(__dirname + '/pages/webfonts'));
  app.use('/', router); //connect the http server to the routers
  return io;
};
