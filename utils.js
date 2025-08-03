import { spawn } from "child_process";
import { Transform } from "stream";

class LinePrefixer extends Transform {
  constructor(prefix) {
    super();
    this.prefix = prefix;
    this._buffer = "";
  }
  _transform(chunk, encoding, callback) {
    this._buffer += chunk.toString();
    const lines = this._buffer.split("\n");
    this._buffer = lines.pop();
    for (const line of lines) {
      this.push(this.prefix + line + "\n");
    }
    callback();
  }
  _flush(callback) {
    if (this._buffer) {
      this.push(this.prefix + this._buffer + "\n");
    }
    callback();
  }
}

export function shell(prefix, cmd) {
  return new Promise((resolve, reject) => {
    const child = spawn("sh", ["-c", cmd]);
    const prefixerOut = new LinePrefixer(`[${prefix}] `);
    const prefixerErr = new LinePrefixer(`[${prefix}] `);

    child.stdout.pipe(prefixerOut).pipe(process.stdout);
    child.stderr.pipe(prefixerErr).pipe(process.stderr);

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(code);
      else reject(new Error(`Process exited with code ${code}`));
    });
  });
}
