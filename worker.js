onmessage = (e) => {
  const data = e.data;
  if (data instanceof ArrayBuffer) {
    e.ports[0].postMessage(data, [data]);
  } else {
    e.ports[0].postMessage(data);
  }
};
