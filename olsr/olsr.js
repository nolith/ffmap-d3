var _ = require('underscore');

var OlsrLink = function(node_primary_ip, local_ip, remote_ip, hyst, lq, nlq, etx, node) {
  this.type = 'link';
  this.protocol= 'olsr';
  this.node_primary_ip = node_primary_ip;
  this.local_ip= local_ip;
  this.remote_ip= remote_ip;
  this.hysteresis= hyst;
  this.lq= lq;
  this.nlq= nlq;
  this.etx= etx;
  this.node = node;
  this._id= "link_"+local_ip+"_"+remote_ip;
  this._rev= undefined;
};

OlsrLink.prototype.equals = function(o) {
  return this.type === o.type && this.protocol === o.protocol &&
    this.local_ip === o.local_ip && this.remote_ip == o.remote_ip &&
    this.hysteresis === o.hysteresis && this.lq === o.lq &&
    this.nlq === o.nlq && this.etx === o.etx;
};


function MIDMap () {
  this.aliases = {};
};

MIDMap.prototype.add = function(primary, addresses) {
  if(_.isArray(addresses)) {
    _.each(addresses, function(adr) {
      this.aliases[adr] = primary;
    }, this);
  }else if(typeof addresses == 'string') {
    this.aliases[addresses] = primary;
  }
};

MIDMap.prototype.get = function(ip) {
  var entry = this.aliases[ip];
  if(typeof entry === 'undefined')
    return ip;
  return entry;
};

exports.OlsrLink = OlsrLink;
exports.MIDMap = MIDMap;