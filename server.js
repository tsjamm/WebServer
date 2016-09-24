//This is a simple fileserver in node js
//See Readme on how to use it

// (c) Sai Teja Jammalamadaka under MIT License

// A part of the forwarding code is taken from AssassinJS proxy module,
// which is (c) by Adithya Chebiyyam under MIT License 

var http = require('http');
var https = require('https');
var fs = require('fs');
var net = require('net');
var connect = require('connect');
var map = require('./map.json');

var defaultDomain = 'http://jsaiteja.com';
var defaultPort = 8080;

//console.log(JSON.stringify(map));

var server = http.createServer();
server.on('request',proxify);
server.listen(80);
console.log('Main Server Running on Port 80');

var sslOptions = {
  key: fs.readFileSync('./sslStuff/privkey.pem'),
  cert: fs.readFileSync('./sslStuff/fullchain.pem'),
  ca: fs.readFileSync('./sslStuff/chain.pem')
}
var sslServer = https.createServer(sslOptions);
sslServer.on('request',proxify);
sslServer.listen(443);
console.log('SSL Server Running on Port 443');

startServers();

function startServers()
{
	for(var x in map)
	{
		for(var y in map[x])
		{
			for(var z in map[x][y])
			{
				if(z!=='port' && z!=='dir')
				{
					console.log(z+'.'+y+'.'+x+' maps to port '+map[x][y][z]['port']+' and dir '+map[x][y][z]['dir']);
					serve(map[x][y][z]['port'],map[x][y][z]['dir']);
				}
			}
			console.log(y+'.'+x+' maps to port '+map[x][y]['port']+' and dir '+map[x][y]['dir']);
			serve(map[x][y]['port'],map[x][y]['dir']);
		}
	}
}

function serve(port,dir)
{
	if(!isBlank(port) && !isBlank(dir))
	{
		connect.createServer(
			connect.static(__dirname+'/'+dir)
		).listen(port);
	}
    else if(!isBlank(port))
    {
        console.log('Only port forwarding to port '+port+' is active as no dir specified')
    }
	else
	{
		console.log('invalid parameters for port and dir specified...');
	}
}

function proxify(request, response)
{
	var domain = request.headers.host;
	if(isBlank(domain))
	{
		//trying a default port instead of error
		forwardRequest(request, response, defaultPort);
		return;
	}
	var domainParts = domain.split('.');
	var level1 = domainParts.pop();
	var level2 = domainParts.pop();
	var level3 = domainParts.pop();
	
	
    if(!isBlank(level1))
        level1 = level1.toLowerCase();
    
    if(!isBlank(level2))
        level2 = level2.toLowerCase();
        
    if(!isBlank(level3))
        level3 = level3.toLowerCase();
	
    console.log('recieved a request from '+domain);
	
	var dir = null;
	var port = null;
	
	if(!isBlank(map[level1]) && !isBlank(map[level1][level2]))
    {
        if(!isBlank(map[level1][level2][level3]))
        {
            dir =  map[level1][level2][level3]['dir'];
            port = map[level1][level2][level3]['port'];
        }
        if(isBlank(port))
        {
            if(!isBlank(level3))
			{			
				var protocol = request.protocol;
				if(isBlank(protocol))
				{
					protocol = 'https:';
				}
				returnRedirect(response,protocol+"//"+level2+"."+level1);
				return;
			}
			dir = map[level1][level2]['dir'];
            port = map[level1][level2]['port'];
        }
        console.log('Request mapped to '+dir+' on port '+port);
        forwardRequest(request, response, port);
    }
    else
    {
        //this generates a server error response
		// console.log(domain+' tried but error 500 returned as response')
        // response.writeHead(500,{'Content-Type': 'text/plain'});
        // response.write('Invalid URL Specified');
        // response.end();
        
		//trying a default port instead of error
        // forwardRequest(request, response, defaultPort);
		
		//this returns a redirect to the defaultDomain
		returnRedirect(response,defaultDomain);
    }
}

//The following forwardRequest Method has been taken from AssassinJS proxy module
//The code is (c) by Adithya Chebiyyam under MIT License
function forwardRequest(request,response,port)
{	
	var		
	domain = "localhost",
	domainPort = port,
	pathstring = request.url;
	
	//cached request,response objects
	var cached_request = request;
	var cached_response = response;		

	//called on getting response from target server
	var requestComplete = function(res)
	{
		//console.log('STATUS: ' + res.statusCode);
 		//console.log('HEADERS: ' + JSON.stringify(res.headers));
  		//res.setEncoding('utf8');
  		//res.setEncoding('binary');
  		
  		cached_response.writeHead(res.statusCode,res.headers);
  		
 		res.on('data', function (chunk) { 			
    		//console.log('BODY: ' + chunk);
    		cached_response.write(chunk);	     	 
  		});
  		
  		res.on('end',function() {  			  			  			    		
    		cached_response.addTrailers(res.headers);
    		cached_response.end(); 	
  		});
	};

	//for making a http head request
	var makeHEADrequest = function(request)
	{
		var options = {
						//host: domain
  						hostname: domain,
 						port: domainPort,
  						path: pathstring,
  						headers: request.headers,
  						method: 'HEAD'
					  };

		var new_request = http.request(options,function(res){

		//console.log('STATUS: ' + res.statusCode);
 		//console.log('HEADERS: ' + JSON.stringify(res.headers));
  		
  		cached_response.writeHead(res.statusCode,{});
  		cached_response.end(); 	
  											
		});

		new_request.on('error', function(e) {
  			console.log('problem with request: ' + e.message);
  			cached_response.writeHead(500,{'Content-Type': 'text/plain'});
    		cached_response.write('Invalid URL Specified');
    		cached_response.end();
		});

		new_request.end();	

		return;
	};

	//for making a http get request
	var makeGETrequest = function(request)
	{		
		var options = {
						//host: domain
  						hostname: domain,
 						port: domainPort,
  						path: pathstring,
  						headers: request.headers  									
					  };

		//console.log(JSON.stringify(options));

		http.get(options, requestComplete)
		.on('error', function(e) {
  			console.log('problem with request: ' + e.message);
  			cached_response.writeHead(500,{'Content-Type': 'text/plain'});
    		cached_response.write('Invalid URL Specified');
    		cached_response.end();
		});

		return;
	};

	//for making other http requests
	var makeRequest = function(data)
	{
		var options = {
						//host: domain
 						hostname: domain,
 						port: domainPort,
  						path: pathstring,
  						headers: cached_request.headers,
  						method: cached_request.method
					 };

		var new_request = http.request(options, requestComplete)
		.on('error', function(e) {
  			console.log('problem with request: ' + e.message);
  			cached_response.writeHead(500,{'Content-Type': 'text/plain'});
    		cached_response.write('Invalid URL Specified');
    		cached_response.end();
		});

		new_request.write(data);			
		new_request.end();
	};

	//for receiving request from source
	var receiveRequest = function(request)
	{			
		//caching Post Content Chunks
		var fullData = '';

		request.on('data', function(chunk) {		
      		// append the current chunk of data to the content cache
     		fullData += chunk;
   		});
   		
   		request.on('end',function() {   		
   			makeRequest(fullData);
  		});
	};

	//actual execution part starts from here
	//console.log(domain+pathstring);

	switch(request.method)
	{
		case 'HEAD':		
						makeHEADrequest(request);						
						return;			 									 				 		
		case 'GET':							
						makeGETrequest(request);
						return;						
		case 'POST':
		case 'PUT':
		case 'PATCH':
		case 'DELETE':
		case 'OPTIONS':												
						receiveRequest(request);
						return;	

	}

}

function returnRedirect(response,redirectDomain)
{
	response.writeHead(302,{'Location':redirectDomain});
	response.write('Please follow <a href="'+redirectDomain+'">this link</a>.');
	response.end();
}

function isBlank(obj)
{
    if(obj===null || obj===undefined || obj==='')
        return true;
    else
        return false;
}
