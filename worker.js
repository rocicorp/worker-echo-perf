onmessage = (e) => {
  const {data} = e;
  const id = data[0];
  const msg = data[1];
  if (data instanceof ArrayBuffer) {
    e.source.postMessage([id, msg], [data]);
  } else {
    e.source.postMessage([id, msg]);
  }
};
