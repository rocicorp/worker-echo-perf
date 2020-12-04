if (
  typeof SharedWorkerGlobalScope === "function" &&
  self instanceof SharedWorkerGlobalScope
) {
  self.onconnect = (e) => {
    const port = e.ports[0];
    port.onmessage = (e) => handleOnMessage(e, port);
  };
} else if (
  typeof ServiceWorkerGlobalScope === "function" &&
  self instanceof ServiceWorkerGlobalScope
) {
  self.onmessage = (e) => handleOnMessage(e, e.source);
} else {
  self.onmessage = (e) => handleOnMessage(e, self);
}

function handleOnMessage(e, port) {
  const {data} = e;
  const id = data[0];
  const msg = data[1];
  if (data instanceof ArrayBuffer) {
    port.postMessage([id, msg], [data]);
  } else {
    port.postMessage([id, msg]);
  }
}
