/* globals EXIF */

const find = selector => document.querySelector(selector);

const loadUrl = (img, url) => {
  return new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = e => reject(e);
    img.src = url;
  });
};

const readExif = (img) => {
  return Promise.resolve().then(() => {
    return new Promise(r => EXIF.getData(img, () => r()));
  }).then(() => {
    return EXIF.getAllTags(img);
  });
};

const row = (name, value) => {
  const tr = document.createElement('tr');
  const nameCell = document.createElement('td');
  const valueCell = document.createElement('td');
  nameCell.appendChild(document.createTextNode(name));
  valueCell.appendChild(document.createTextNode(value));
  tr.appendChild(nameCell);
  tr.appendChild(valueCell);

  return tr;
};

export default ({ events }) => {
  const img = find('#image');
  const table = find('#info');

  const onOpen = async ({ file }) => {
    const url = URL.createObjectURL(file);

    try {
      await loadUrl(img, url);
      const exif = await readExif(img);

      for (let name in exif) {
        table.appendChild(row(name, exif[name]));
      }
    } catch (e) {
      events.emit('warn', e.message);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  events.on('open', onOpen);

  return () => {
    events.off('open', onOpen);
  };
};
