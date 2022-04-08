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

const port = args.port || process.env.PORT || 5000

app.use(express.urlencoded({extend: true}));
app.use(express.json());

const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%', port))
});

app.get('/app', (req, res) => {
    res.status(200).end('OK')
    res.type('text/plain')
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
    res.status(200).json({ 'flip' : flip })
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
    res.status(200).json({"raw":flips,"summary":summary})
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
    res.status(200).json({ result })
});

app.use(function(req, res){
    res.status(404).send('404 NOT FOUND')
    res.type("text/plain")
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
    status: res.statusCode,
    referer: req.headers['referer'],
    useragent: req.headers['user-agent']
  }
  const stmt = logdb.prepare('INSERT INTO accesslog (remote_addr, remote_user, time, method, url, protocol, http_version, status, referer, user_agent) VALUES (?,?,?,?,?,?,?,?,?,')
  stmt.run(logdata.remoteaddr, String(logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referer, logdata.useragent));
  next();
})

app.get('/app/log/access', (req, res) => {
  const result = flipACoin(req.params.guess)
  res.status(200).json({ result })
});

app.get('/app/error', (req, res) => {
  const result = flipACoin(req.params.guess)
  res.status(200).json({ result })
});

