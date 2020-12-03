const SERVICE_WORKER_PATH = new URL("./worker.js", import.meta.url) + "";
const SCOPE = new URL("./echo-sw/", import.meta.url) + "";

/**
 * @param {ServiceWorkerRegistration} reg
 * @returns {ServiceWorker | undefined} */
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

let w; // = new Worker("worker.js", {type: "module"});

let counter = 0;
const callbacks = new Map();

function send(worker, msg, transferable) {
  return new Promise((resolve, reject) => {
    const id = counter++;
    callbacks.set(id, resolve);
    const data = [id, msg];
    worker.postMessage(data, transferable ? [transferable] : undefined);
  });
}

const valSize = 1024;

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

function addAsync(name, fn) {
  suite.add(
    name,
    async (deferred) => {
      for (let i = 0; i < 100; i++) {
        await fn();
      }
      deferred.resolve();
    },
    {
      defer: true,
    },
  );
}

const suite = new Benchmark.Suite();

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

suite.on("cycle", (event) => {
  log(String(event.target));
});
suite.on("complete", (event) => {
  log("Done.");
});

async function main() {
  const reg = await registerServiceWorker();
  w = findServiceWorker(reg);
  // w = new Worker("worker.js");
  navigator.serviceWorker.onmessage = (e) => {
    const id = e.data[0];
    const value = e.data[1];
    const callback = callbacks.get(id);
    if (callback) {
      callback(value);
      callbacks.delete(id);
    }
  };

  await send(w, 1);
  log("Worker up and functional. Running perf tests...");
  suite.run();
}

main();

function log(s) {
  document.body.append(s);
  document.body.append(document.createElement("br"));
}
