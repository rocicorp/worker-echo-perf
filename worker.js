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

function setup(e) {
  switch (e.data.setup) {
    case "ServiceWorker":
    case "DedicatedWorkerMessageChannel":
      e.ports[1].onmessage = handleOnMessage;
      break;
    case "DedicatedWorker":
      self.removeEventListener("message", setup);
      self.onmessage = handleOnMessage;
      break;
    default:
      throw new Error("Unexpected setup message: " + e.data.setup);
  }
  e.ports[0].postMessage(true);
}
