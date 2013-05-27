/**
 * Update functions to be exported from the design doc.
 */


var templates = require('duality/templates'),
  fields = require('couchtypes/fields'),
  Form = require('couchtypes/forms').Form;
var person = require('./types').person;


exports.update_my_form = function (doc, req) {
  var form = new Form(person);
  form.validate(req);

  /**
   * We do that because we are not using CouchType
   * CouchType takes care of generating a uuid
   */
  form.values._id = req.uuid;

  if (form.isValid()) {
    return [form.values, {content: 'Hello ' + form.values.first_name +', '+ form.values.last_name , title: 'Result'}];
  }
  else {
    var content = templates.render('form.html', req, {
      form_title: 'My Form',
      method: 'POST',
      action: '../_update/update_my_form',
      form: form.toHTML(req),
      input: 'Validate'
    });
    return [null, {content: content, title: 'My First Form'}];
  }
};