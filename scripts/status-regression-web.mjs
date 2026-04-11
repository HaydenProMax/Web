import { parsePort, getRegressionServerStatus } from "./regression-web-utils.mjs";

const port = parsePort(process.argv.slice(2));
console.log(await getRegressionServerStatus(port));
