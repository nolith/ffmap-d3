exports.matchNetwork = function(ip,network) {
  var net_data = network.split("/");
  var networkOctets = net_data[0].split(".");
  var ipOctets = ip.split(".");

  if(net_data.length > 1) {
    var net_cidr = parseInt(net_data[1]);
    var sameOctets = Math.floor(net_cidr/8);
    
    for(var i =0 ; i < sameOctets; i++) {
      if(ipOctets[i] !== networkOctets[i])
        return false;
    }

    var bits = net_cidr % 8;

    var ipOctet = parseInt(ipOctets[sameOctets]);
    var netOctet = parseInt(networkOctets[sameOctets]);
    var mask = 0;
    for(var i = 0; i < bits; i++) {
      mask += 1;
      mask <<= 1;
    }

    return (ipOctet & mask) === (netOctet & mask);
  } else {
    throw "wrong network";
  }
}