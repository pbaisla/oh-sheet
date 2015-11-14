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

module.exports = function(io) {
  io.on('connection', function(socket) {
    socket.emit('sheet.url?');
    socket.on('sheet.url', function(data){
      socket.join(data.url);
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
