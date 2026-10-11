const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");
const OUT = path.resolve(__dirname, "..", ".port-3000-probe.txt");
const socket = new net.Socket();
const start = Date.now();
let lines = [];
socket.setTimeout(10000);
socket.on("connect", () => {
  lines.push("CONNECTED to 127.0.0.1:3000 after " + (Date.now()-start) + "ms");
  // Send HTTP GET
  socket.write("GET / HTTP/1.1\r\nHost: 127.0.0.1:3000\r\nUser-Agent: probe\r\nAccept: */*\r\nConnection: close\r\n\r\n");
});
socket.on("timeout", () => { lines.push("TIMEOUT"); socket.destroy(); save(); });
socket.on("data", (b) => lines.push("DATA (" + b.length + " bytes): " + String(b).slice(0, 600).replace(/\r?\n/g, "⏎")));
socket.on("error", (e) => { lines.push("ERROR: " + e.message); save(); });
socket.on("end", () => { lines.push("END"); });
socket.on("close", () => { lines.push("CLOSED after " + (Date.now()-start) + "ms"); save(); });
socket.connect(3000, "127.0.0.1");
function save() {
  fs.writeFileSync(OUT, lines.join("\n"));
  process.exit(0);
}
setTimeout(() => { lines.push("SAFETY EXIT after 15s"); save(); }, 15000).unref();
