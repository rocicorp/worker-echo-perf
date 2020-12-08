if (
  typeof SharedWorkerGlobalScope === "function" &&
  self instanceof SharedWorkerGlobalScope
) {
  self.onconnect = (e) => {
    e.ports[0].onmessage = handleOnMessage;
  };
} else {
  self.addEventListener("message", setup);
}

function handleOnMessage(e) {
  const {data} = e;
  if (data instanceof ArrayBuffer) {
    e.ports[0].postMessage(data, [data]);
  } else {
    e.ports[0].postMessage(data);
  }
}

const resolvers = new Map();
let resolveCounter = 0;

function getResolver() {
  let resolve;
  let promise = new Promise((res) => {
    resolve = res;
  });
  return {promise, resolve};
}

function setup(e) {
  switch (e.data.setup) {
    case "ServiceWorker": {
      const {promise, resolve} = getResolver();
      e.waitUntil(promise);
      const id = resolveCounter++;
      resolvers.set(id, resolve);
      e.ports[0].postMessage(id);
      // Fall through.
    }
    case "DedicatedWorkerMessageChannel":
      e.ports[1].onmessage = handleOnMessage;
      break;
    case "DedicatedWorker":
      self.removeEventListener("message", setup);
      self.onmessage = handleOnMessage;
      break;
    case "ServiceWorkerWaitDone": {
      const {id} = e.data;
      const resolve = resolvers.get(id);
      resolve();
      break;
    }

    default:
      throw new Error("Unexpected setup message: " + e.data.setup);
  }
  e.ports[0].postMessage(true);
}
