const express = require('express')
const app = express()
const args = require('minimist')(process.argv.slice(2))
const logdb = require("./database.js")
const morgan = require("morgan")
const fs = require("fs")
const { argv } = require('process')

args['port']

const call = args.call

argv.log = false;

console.log(args)
// Store help text 
const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)
// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

app.use(express.urlencoded({extend: true}));
app.use(express.json());

const port = args.port || process.env.PORT || 5555

const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%', port))
});

if (argv.log == true) {
  const accesslog = fs.createWriteStream('./access.log', {flags: 'a'});
  app.use(morgan("tiny", {stream: accesslog}));
} else {
  app.use(morgan("tiny"))
}

app.use((req, res, next) => {
  let logdata = {
    remoteaddr: req.ip,
    remoteuser: req.user,
    time: Date.now(),
    method: req.method,
    url: req.url,
    protocol: req.protocol,
    httpversion: req.httpVersion,
    secure: req.secure,
    status: res.statusCode,
    referer: req.headers['referer'],
    useragent: req.headers['user-agent']
  }
  const stmt = logdb.prepare('INSERT INTO accesslog (remote_addr, remote_user, time, method, url, protocol, httpversion, secure, status, referer, useragent) VALUES (?,?,?,?,?,?,?,?,?,?, ?)')
  stmt.run(logdata.remoteaddr, String(logdata.remoteuser), logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, String(logdata.secure), logdata.status, logdata.referer, logdata.useragent);
  next();
});


if (argv.debug == true) {
  app.get('/app/log/access', (req, res) => {
    try {
      const stmt = logdb.prepare('SELECT * FROM accesslog').all();
      res.status(200).json(stmt);
    } catch  {
      console.error(e)
    }
  });
  app.get('/app/error', (req, res) => {
    throw new Error("Error test successful.")
  })
}

app.get('/app', (req, res) => {
    res.statusCode = 200
    res.statusMessage = 'OK'
    res.writeHead(res.statusCode, {'Content-Type': 'text/plain'})
    res.end(res.statusCode + ' ' + res.statusMessage)
});

function coinFlip() {
    let flip = Math.random();
    if (flip < 0.5) {
      var result = "heads";
    } else {
      var result = "tails";
    }
    return result;
}

app.get('/app/flip', (req, res) => {
    var flip = coinFlip()
    res.json({ 'flip' : flip })
});

function coinFlips(flips) {
    var flip_array = [];
    for (var i = 0; i < flips; i ++) {
      flip_array.push(coinFlip());
    }
    return flip_array
}

function countFlips(array) {
    let heads = 0;
    let tails = 0;
    for (const outcome of array) {
      if (outcome == "heads") {
        heads += 1;
      } else {
        tails += 1;
      }
    }
    if (heads > 0 && tails >0) {
      return {heads: heads, tails: tails}
    } else if (heads > 0 && tails == 0) {
      return {heads: heads}
    } else {
      return {tails: tails};
    }
}

app.get('/app/flips/:number', (req, res) => {
    var flips = coinFlips(req.params.number)
    var summary = countFlips(flips)
    res.json({"raw":flips,"summary":summary})
});

function flipACoin(call) {
    var hidden_filp = coinFlip();
    if (call == hidden_filp) {
        return { call: call, flip: hidden_filp, result: 'win' };
    } else {
        return { call: call, flip: hidden_filp, result: 'lose' };
    } 
}

app.get('/app/flip/call/:guess', (req, res) => {
    const result = flipACoin(req.params.guess)
    res.json({ result })
});

app.use(function(req, res){
    res.status(404).send('404 NOT FOUND')
});





