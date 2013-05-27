//http://localhost:5984/nnxmap/_design/nnxmap/_update/update_my_form
var Type = require('couchtypes/types').Type,
  fields = require('couchtypes/fields'),
  widgets = require('couchtypes/widgets');

exports.person = new Type('person', {
  fields : { 
    first_name: fields.string(),
    last_name: fields.string()
  }
});