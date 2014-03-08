# A simple Webserver in NodeJS

This is a simple proxy and fileserver in node js using connect.js

server.js uses map.json file to map the proxy with port and directory of the files.

The directories must be present in the directory from where server.js is executed from.

Example:
* test.com maps to localhost:8080
* test2.org maps to localhost:8090
* map.json should be of the form
```
{"com":{"test":{"port":8080,"dir":"testdir"}},"org":{"test2":{"port":8090,"dir":"test2dir"}}}
```

(C) Sai Teja Jammalamadaka under MIT License

A part of the forwarding code is taken from AssassinJS proxy module, which is (C) by Adithya Chebiyyam under MIT License 
