
const path = require("path");
const xPath = path.resolve(process.argv[2] || "");
if (!process.argv[2] || !/\.(js|json)$/i.test(xPath) || !require("fs").existsSync(xPath)) {
  console.error("Invalid or missing file argument");
  process.exit(1);
}
let x = require(xPath)

