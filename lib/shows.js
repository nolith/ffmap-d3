/**
 * Show functions to be exported from the design doc.
 */

var templates = require('duality/templates'),
  fields = require('couchtypes/fields'),
  Form = require('couchtypes/forms').Form;
var person = require('./types').person;



exports.welcome = function (doc, req) {
  return {
    title: 'It worked!',
    content: templates.render('welcome.html', req, {})
  };
};

exports.not_found = function (doc, req) {
  return {
    title: '404 - Not Found',
    content: templates.render('404.html', req, {})
  };
};

exports.my_form = function (doc, req) {
  var myForm = new Form (person);
  return {
    title : 'My First Form',
    content: templates.render('form.html', req, {
      form_title : 'My Form',
      method : 'POST',
      action : '../_update/update_my_form',
      form : myForm.toHTML(req),
      button: 'Validate'})
  }
};

exports.my_form_content = function(doc, req) {
  return {
    title: 'Content of my Form',
    content: templates.render('base.html', req, {content : '<b>First Name</b> : ' +  doc.first_name + '<br/><b>Last Name</b> : ' + doc.last_name}) 
  };
};
