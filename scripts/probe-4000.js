const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");
const OUT = path.resolve(__dirname, "..", ".port-4000-probe.txt");
const socket = new net.Socket();
let lines = [];
const start = Date.now();
socket.setTimeout(15000);
socket.on("connect", () => {
  lines.push("CONNECTED 4000 in " + (Date.now()-start) + "ms");
  socket.write(
    "GET /sign-in HTTP/1.1\r\n" +
    "Host: 127.0.0.1:4000\r\n" +
    "User-Agent: Mozilla/5.0 zaplex-probe\r\n" +
    "Accept: text/html,*/*\r\n" +
    "Connection: close\r\n" +
    "\r\n"
  );
});
socket.on("data", (b) => {
  const s = String(b);
  lines.push("--- HTTP RESPONSE HEAD (" + s.length + " bytes) ---");
  lines.push(s.slice(0, 1500).replace(/\r/g, ""));
});
socket.on("timeout", () => { lines.push("TIMEOUT"); socket.destroy(); done(); });
socket.on("error", (e) => { lines.push("ERROR: " + e.message); done(); });
socket.on("end", () => { lines.push("END"); });
socket.on("close", () => { lines.push("CLOSE after " + (Date.now()-start) + "ms"); done(); });
socket.connect(4000, "127.0.0.1");
let doneFired = false;
function done() {
  if (doneFired) return;
  doneFired = true;
  fs.writeFileSync(OUT, lines.join("\n"));
  process.exit(0);
}
setTimeout(() => done(), 20000).unref();
