var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var Sheet = require('../models/sheet');

/* Generates unique URL */
function randomValueHex() {
    return crypto.randomBytes(Math.ceil(6))
        .toString('hex')
        .slice(0,12);
}

/* GET home page. */
router.get('/', function(req, res, next) {
  var newurl = randomValueHex();
  res.redirect('/sheet/' + newurl);
});

router.get('/sheet/:url', function(req, res, next) {
  var url = req.params.url;
  Sheet.find({ url: url }, function(err, sheet) {
    if(err)
      res.send(err);
    res.render('sheet', { sheet: sheet.cells||[] });
  });
});

module.exports = function(io) {
  io.on('connection', function(socket) {
    socket.emit('sheet.url?');
    socket.on('sheet.url', function(data){
      socket.join(data.url);
    });

    socket.on('save', function(data) {
      Sheet.findOneAndUpdate(
          { url: data.url },
          { url: data.url, cells: data.cells },
          { upsert: true, new: true },
          function(err, sheet) {
            if(err)
              console.log(err);
            console.log(sheet.url + " saved");
          }
      );
    });
  });
  return router;
}
