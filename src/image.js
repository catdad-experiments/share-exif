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
  const div = document.createElement('div');
  div.classList.add('row');
  const nameCell = document.createElement('span');
  const valueCell = document.createElement('span');
  nameCell.className = 'cell key';
  valueCell.className = 'cell value';
  nameCell.appendChild(document.createTextNode(name));
  valueCell.appendChild(document.createTextNode(value));
  div.appendChild(nameCell);
  div.appendChild(valueCell);

  return div;
};

export default ({ events }) => {
  const img = find('#image');
  const info = find('#info');

  const onOpen = async ({ file }) => {
    delete img.exifdata;
    delete img.iptcdata;

    const url = URL.createObjectURL(file);

    try {
      await loadUrl(img, url);
      const exif = await readExif(img);

      info.innerHTML = '';

      const keys = Object.keys(exif).sort();
      keys.forEach(key => {
        info.appendChild(row(key, exif[key]));
      });

      if (keys.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'message';
        msg.appendChild(document.createTextNode('this image has no EXIF data'));
        info.appendChild(msg);
      }
    } catch (e) {
      events.emit('warn', e.message);
    } finally {
      URL.revokeObjectURL(url);
    }

    img.classList.remove('hide');
    info.classList.remove('hide');
  };

  events.on('open', onOpen);

  return () => {
    events.off('open', onOpen);
  };
};
