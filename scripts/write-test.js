const fs = require("node:fs");
const path = require("node:path");
const OUT = path.resolve(__dirname, "..", ".write-test.txt");
fs.writeFileSync(OUT, "It works at " + new Date().toISOString() + " | argv=" + process.argv.join(" ") + " | node=" + process.version);
process.exit(0);
