const SERVICE_WORKER_PATH = new URL("./worker.js", import.meta.url) + "";
const SCOPE = new URL("./echo-sw/", import.meta.url) + "";

/**
 * @param {ServiceWorkerRegistration} reg
 * @returns {ServiceWorker | undefined}
 */
function findServiceWorker(reg) {
  let sw;
  for (sw of [reg.active, reg.installing, reg.waiting]) {
    if (sw && sw.scriptURL === SERVICE_WORKER_PATH) {
      return sw;
    }
  }

  return undefined;
}

/** @returns {Promise<ServiceWorkerRegistration>} */
function registerServiceWorker() {
  return navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
    scope: SCOPE,
  });
}

function send(port, msg, transferable) {
  return new Promise((resolve) => {
    const {port1, port2} = new MessageChannel();
    port1.onmessage = (e) => {
      resolve(e.data);
    };
    port.postMessage(msg, transferable ? [port2, transferable] : [port2]);
  });
}

function randomString(len) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) {
    // Don't allow \0 in the string because these values are used as secondary
    // keys when building indexes and we do not allow \0 there so it slows down
    // the benchmark.
    if (arr[i] === 0) {
      arr[i] = 1;
    }
  }
  return new TextDecoder("ascii").decode(arr);
}

function getResolver() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return {promise, resolve};
}

const ITERATIONS = 100;

async function runBenchmarks(w, workerKind) {
  const suite = new Benchmark.Suite();

  function addAsync(name, fn) {
    suite.add(
      name,
      async (deferred) => {
        for (let i = 0; i < ITERATIONS; i++) {
          await fn();
        }
        deferred.resolve();
      },
      {
        defer: true,
      },
    );
  }

  addAsync("Send number", async () => {
    (await send(w, 123)) !== undefined;
  });
  const s = randomString(1024);
  addAsync("Send string 1024", async () => {
    (await send(w, s)) !== undefined;
  });
  addAsync("Send object", async () => {
    (await send(w, {
      dbName: "default",
      rpc: "put",
      args: {transactionId: 123, key: "abcdef", value: "ghijkl"},
    })) !== undefined;
  });
  addAsync("Send array size 1024", async () => {
    (await send(
      w,
      Array.from({length: 1024}, (v, i) => i),
    )) !== undefined;
  });
  addAsync("Send binary array size 1024", async () => {
    (await send(w, new Uint8Array(1024))) !== undefined;
  });
  addAsync("Send array bufer size 1024", async () => {
    const ab = new ArrayBuffer(1024);
    (await send(w, ab)) !== undefined;
  });
  addAsync("Send binary array size 1024 transfer", async () => {
    const ab = new ArrayBuffer(1024);
    (await send(w, ab, ab)) !== undefined;
  });

  await send(w, 1);
  log(`${workerKind} up and functional. Running perf tests...`);

  suite.on("cycle", (event) => {
    event.target.hz *= ITERATIONS;
    log(String(event.target));
  });

  const {promise, resolve} = getResolver();

  suite.on("complete", () => {
    log("Done.");
    resolve();
  });
  suite.run();

  await promise;
}

async function main() {
  {
    const workerKind = "Service Worker";
    const reg = await registerServiceWorker();
    const serviceWorker = findServiceWorker(reg);
    const {port1, port2} = new MessageChannel();
    const id = await send(serviceWorker, {setup: "ServiceWorker"}, port2);
    await runBenchmarks(port1, workerKind);
    await send(serviceWorker, {setup: "ServiceWorkerWaitDone", id});
  }

  log("-----------------------------------------------");

  {
    if (typeof SharedWorker !== "undefined") {
      const workerKind = "Shared Worker";
      const {port} = new SharedWorker("worker.js");
      await runBenchmarks(port, workerKind);
    } else {
      log("No SharedWorker");
    }
  }

  log("-----------------------------------------------");

  {
    const workerKind = "Dedicated Worker (with MessageChannel)";
    const worker = new Worker("worker.js");
    const {port1, port2} = new MessageChannel();
    await send(worker, {setup: "DedicatedWorkerMessageChannel"}, port2);
    await runBenchmarks(port1, workerKind);
  }

  log("-----------------------------------------------");

  {
    const workerKind = "Dedicated Worker";
    const worker = new Worker("worker.js");
    await send(worker, {setup: "DedicatedWorker"});
    await runBenchmarks(worker, workerKind);
  }
}

main();

function log(s) {
  document.body.append(s, document.createElement("br"));
}
