/* eslint-disable no-console */

import toast from './toast.js';

let events = (function () {
  let collection = [];

  return {
    emit: (...args) => {
      collection.push(args);
    },
    flush: function (emitter) {
      collection.forEach((args) => {
        emitter.emit(...args);
      });
    }
  };
}());

window.addEventListener('beforeinstallprompt', (ev) => {
  console.log('👀 we can install the app now');
  events.emit('can-install', { prompt: ev });
});

window.addEventListener('appinstalled', () => {
  events.emit('info', '🎊 installed 🎊');
});

if ('serviceWorker' in navigator) {
  console.log('👍', 'navigator.serviceWorker is supported');

  navigator.serviceWorker.register('./service-worker.js', { scope: './' }).then(() => {
    console.log('👍', 'worker registered');
  }).catch(err => {
    console.warn('👎', 'worker errored', err);
  });

  navigator.serviceWorker.addEventListener('message', (ev) => {
    const data = ev.data;

    if (data.action === 'log') {
      return void console.log('worker:', ...data.args);
    }

    if (data.action === 'load-image') {
      console.log('LOAD IMAGE!!');
      events.emit('display-image', { file: data.file });
    }

    console.log('worker message', ev.data);
  });
}

export default () => {
  function onMissingFeatures(missing) {
    const text = `<p>It seems your browser is not supported. The following features are missing:</p>
                  <p>${missing.join(', ')}</p>`;

    toast.error(text, {
      duration: -1 // forever
    });
  }

  function onError(err, duration = 8 * 1000) {
    // eslint-disable-next-line no-console
    console.error(err);
    toast.error(`<p>An error occured:</p><p>${err.toString().split('\n').join('<br/>')}</p>`, {
      duration
    });
  }

  // detect missing features in the browser
  const missingFeatures = [
    'navigator.serviceWorker',
    'Promise',
    'Map',
    'localStorage',
    ['dynamic import', () => {
      try {
        new Function('import("").catch(() => {})')();
        return true;
      } catch (err) {
        return false;
      }
    }]
  ].filter(function (name) {
    if (Array.isArray(name)) {
      const [, test] = name;

      return !test();
    }

    return !name.split('.').reduce(function (obj, path) {
      return (obj || {})[path];
    }, window);
  }).map(v => Array.isArray(v) ? v[0] : v);

  if (missingFeatures.length) {
    return onMissingFeatures(missingFeatures);
  }

  // ------------------------------------------------
  // we've validated modules... we can use fancy
  // things now
  // ------------------------------------------------

  function load(name) {
    // get around eslint@5 not supporting dynamic import
    // this is ugly, but I also don't care
    return (new Function(`return import('${name}')`))().then(m => m.default);
  }

  // load all the modules from the server directly
  Promise.all([
    load('./event-emitter.js'),
    load('./open.js'),
    load('./image.js'),
  ]).then(([
    eventEmitter,
    ...modules
  ]) => {
    // set up a global event emitter
    const context = { events: eventEmitter() };
    const destroys = modules.map(mod => mod(context));

    context.events.on('error', function (err) {
      onError(err, -1);
      destroys.forEach(d => d());
    });

    context.events.on('warn', function (err) {
      onError(err);
    });

    context.events.on('info', (msg) => {
      toast.info(msg.toString());
    });

    events.flush(context.events);
    events = context.events;
  }).catch(function catchErr(err) {
    events.emit('error', err);
    onError(err);
  });
};
