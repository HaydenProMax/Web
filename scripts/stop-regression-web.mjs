import { parsePort, stopRegressionServer } from "./regression-web-utils.mjs";

const port = parsePort(process.argv.slice(2));
console.log(stopRegressionServer(port));
