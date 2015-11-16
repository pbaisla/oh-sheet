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
  Sheet.findOne({ url: url }, function(err, sheet) {
    if(err)
      res.send(err);
    res.render('sheet', { sheet: ((sheet) ? sheet.cells : []) });
  });
});

twoPCstates = {};

module.exports = function(io) {
  io.on('connection', function(socket) {
    socket.emit('sheet.url?');
    socket.on('sheet.url', function(data){
      socket.join(data.url);
    });

    socket.on('requestForCommit', function(data) {
      twoPCstates[data.id + data.counter] = 0;
      io.to(data.url).emit('prepareForCommit', data);
    });

    socket.on('agreement', function(data) {
      if(twoPCstates.hasOwnProperty(data.id + data.counter)) {
        twoPCstates[data.id + data.counter]++;
        if(twoPCstates[data.id + data.counter] == io.to(data.url).sockets.length) {
          var changes = [];
          for(var i=0; i < data.changes.length; i++) {
            changes.push({
              row: data.changes[i][0],
              col: data.changes[i][1],
              data: data.changes[i][3]
            });
          }
          io.to(data.url).emit('commit', changes);
          delete twoPCstates[data.id + data.counter];
        }
      }
    });

    socket.on('disagreement', function(data){
      var changes = [];
      for(var i=0; i < data.changes.length; i++) {
        changes.push({
          row: data.changes[i][0],
          col: data.changes[i][1],
          data: data.changes[i][2]
        });
      }
      socket.to(data.id).emit('abort', changes);
      delete twoPCstates[data.id + data.counter];
    });

    socket.on('save', function(data) {
      io.to(data.url).emit('changes',data.cells);
      Sheet.findOne(
          { url: data.url },
          function(err, sheet) {
            if(err)
              console.log(err);
            if(sheet) {
              for(var i=0; i < data.cells.length; i++) {
                var ind = sheet.cells.findIndex(function(element, index, array){
                  if((element.row == data.cells[i].row) && (element.col == data.cells[i].col))
                    return true;
                  return false;
                });

                if(ind > -1) {
                  sheet.cells[ind] = data.cells[i];
                }
                else {
                  sheet.cells.push(data.cells[i]);
                }
              }
            }
            else {
              sheet = new Sheet({ url: data.url, cells: data.cells });
            }
            Sheet.update(
                { url: data.url },
                sheet,
                { upsert: true, new: true},
                function(err, sheet){
                  if(err)
                    console.log(err);
                }
              );
          }
      );
    });
  });
  return router;
}
