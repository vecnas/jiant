const { spawn } = require("child_process");
const http = require("http");

const baseUrl = process.env.BASE_URL || "http://localhost:8080";
const serverCmd = process.env.TEST_SERVER_CMD || "node";
const serverArgs = process.env.TEST_SERVER_ARGS
  ? process.env.TEST_SERVER_ARGS.split(" ")
  : ["tests-new/server.js"];

const runners = [
  ["node", ["tests-new/run_modules_tests.js"]],
  ["node", ["tests-new/run_jquery_compat.js"]]
];

function waitForServer(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function ping() {
      const req = http.get(url, res => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Server did not start in time"));
        } else {
          setTimeout(ping, 200);
        }
      });
    }
    ping();
  });
}

async function run() {
  const server = spawn(serverCmd, serverArgs, { stdio: "inherit" });
  let exitCode = 0;

  try {
    await waitForServer(`${baseUrl}/tests-new/modules.html`, 5000);
    for (const [cmd, args] of runners) {
      const code = await new Promise(resolve => {
        const proc = spawn(cmd, args, { stdio: "inherit" });
        proc.on("close", resolve);
      });
      if (code !== 0) {
        exitCode = code;
        break;
      }
    }
  } catch (err) {
    console.error(err.message || err);
    exitCode = 1;
  } finally {
    server.kill();
  }

  process.exit(exitCode);
}

run();
