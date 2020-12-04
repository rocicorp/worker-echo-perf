if (
  typeof SharedWorkerGlobalScope === "function" &&
  self instanceof SharedWorkerGlobalScope
) {
  self.onconnect = (e) => {
    e.ports[0].onmessage = handleOnMessage;
  };
} else {
  self.onmessage = handleOnMessage;
}

function handleOnMessage(e) {
  const {data} = e;
  if (data instanceof ArrayBuffer) {
    e.ports[0].postMessage(data, [data]);
  } else {
    e.ports[0].postMessage(data);
  }
}
