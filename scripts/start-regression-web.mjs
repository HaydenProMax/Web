import { parsePort, startRegressionServer } from "./regression-web-utils.mjs";

const port = parsePort(process.argv.slice(2));

try {
  const status = await startRegressionServer(port);
  console.log(status);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
