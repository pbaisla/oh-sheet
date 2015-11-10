var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SheetSchema = new Schema({
    url: String,
    link_sharing: Boolean,
    cells: [{
      row: String,
      col: String,
      data: String
    }]
});

module.exports = mongoose.model('Sheet', SheetSchema);
