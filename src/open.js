const find = selector => document.querySelector(selector);

export default ({ events }) => {
  const openButton = find('#open');
  const openInput = find('#open-input');

  const onClick = () => void openInput.click();
  const onChange = (ev) => {
    if (!ev.target.files[0]) {
      return;
    }

    events.emit('open', { file: ev.target.files[0] });
  };

  openButton.addEventListener('click', onClick);
  openInput.addEventListener('change', onChange);

  return () => {
    openButton.removeEventListener('click', onClick);
    openInput.removeEventListener('change', onChange);
  };
};
