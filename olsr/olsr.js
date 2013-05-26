var _ = require('underscore');

var OlsrLink = function(community, node, local_ip, 
    remote_node, remote_ip, hyst, lq, nlq, etx) {
  var proto = 'olsr_v4';
  if(local_ip.indexOf(":") !== -1)
    proto = 'olsr_v6';

  this.type = 'link';
  this.protocol = proto;
  this.community = community;
  this.local_ip= local_ip;
  this.remote_ip= remote_ip;
  this.hysteresis= hyst;
  this.lq= lq;
  this.nlq= nlq;
  this.etx= etx;
  this.local_node = node;
  this.remote_node = remote_node;
  this._id= "link_"+local_ip+"_"+remote_ip;
  this._rev= undefined;
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