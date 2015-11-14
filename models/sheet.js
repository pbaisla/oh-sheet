var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CellSchema = new Schema({
    row: String,
    col: String,
    data: String
});

var SheetSchema = new Schema({
    url: String,
    cells: [CellSchema]
});

module.exports = mongoose.model('Sheet', SheetSchema);
