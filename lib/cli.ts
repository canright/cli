import readline = require('readline');
import cmds = require('./commands');

const put = (s: String) => console.log(s);
const ask = (s: string) => {put(s); con.prompt()};

/** import spigot = require('./spigot'); */

import stream = require('stream');

const BUFFERSIZE: number = 10485760; // 10MB

function pipeout(out: any, trans: Function) {

  const parms = {objectMode: true, highWaterMark: BUFFERSIZE};
  const g = new stream.Transform(parms);

  g._transform = function (chunk, enc, done) {
    var data: String = (this._tail ? this._tail : '') + chunk.toString(),
      lines: String[] = data.split('\n');
    this._tail = lines.splice(lines.length-1,1)[0];
    for (let knt=lines.length, k=0; k<knt; ++k)
      this.push(trans(lines[k], enc));
    done();  
  }

  g._flush = function (done) {
    put(this._tail`|==> FLUSH: ${this._tail}!`);
    if (this._tail) this.push(trans(this._tail, null));
    this.tail = null;
    done();
  }

  g.on('drain'   , (err: any, data:any) => {
    if (err) put(`|==> DRAINERR ${err}`); else put(`|==> DRAIN ${data}`);
  });

  g.on('readable', (err: any) => {
    if (err) put(`|==> READABLE ERROR ${err}`); else put('\n- logs are queued.');
  });

  g.on('error'   , (err: any) => put(`|==> ERROR ${JSON.stringify(err)}`));
  g.on('close'   , ()         => put('|==> CLOSE SPIGOT'));
  g.on('end'     , ()         => put('|==> END SPIGOT'  ));
  g.pipe(out);
  g.resume();
  return g;
}

const CLIOF: string = '',
  CLION: string = '> ',
  MGOFF: string = 'CLI is off.  Enter to turn it on.';

const RESUME: string = '- Flowing logs. Enter to pause.';
const PAUSE : string = '- Log flow is paused.  Enter to resume.  Try "help".';

const HELP: string =
`CLI Commands:
${cmds.help}

> <enter> -- toggle log flow to console - pause or resume flow.
> help    -- this help.
> info    -- system information.
> exit    -- flush logs and stop the server.
`;

var inCli:boolean = false;

export const con = readline.createInterface(process.stdin, process.stdout);

function processExit() {
  put('[> close]');
  process.exit(0);
}

export var log = pipeout(process.stdout,
  (lin: String, enc: String) => `|== ${enc} ==> ${lin}\n`);

function info() {
  put(`Information...`);
}

function exiter() { /** exit server: flush queue, leave cli, shutdown the node server process */
  con.setPrompt(CLIOF);
  log.resume();
  inCli=false;
  put('Exiting node server');
  processExit();
}

function flowLog() { /** flush queue then flow logs to console */
  con.setPrompt(CLIOF);
  log.resume();
  inCli=false;
  put(RESUME);
}

function exe(r: String[]) {
  const act: string = r[0].toLowerCase();
  if (r.length<2)
    switch (act) {
      case ''    : flowLog();   break;
      case 'help': ask(HELP);   break;
      case 'exit': exiter();    break;
      case 'info': info();      break;
      default    : cmds.exe(r); break;
    }
  else
    cmds.exe(r);
}

con.on('close', () => {
  processExit();
});

con.on('line', (line: String) => {
  if (!line.length && !inCli) {
    con.setPrompt(CLION);
    inCli = true;
    log.pause();
    ask(PAUSE);
  } else
    if (inCli)
      exe(line.trim().split(' '));
    else
      put(MGOFF);

  con.prompt();
});

put(MGOFF);
con.setPrompt(CLIOF);
