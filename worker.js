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
  if (e.data !== "setup") {
    throw new Error("expected a setup message");
  }
  e.ports[1].onmessage = handleOnMessage;
  e.ports[0].postMessage(true);
}
