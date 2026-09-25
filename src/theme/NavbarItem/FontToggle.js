import React, {useEffect, useState} from 'react';

const STORAGE_KEY = 'dp-font';
const FONTS = ['sans', 'serif'];
const FONT_LABELS = {sans: '黑体', serif: '宋体'};

function applyFont(font) {
  if (font === 'serif') {
    document.documentElement.dataset.font = 'serif';
  } else {
    delete document.documentElement.dataset.font;
  }
}

function getStoredFont() {
  const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
  return FONTS.includes(stored) ? stored : 'sans';
}

export default function FontToggle() {
  const [font, setFont] = useState('sans');

  useEffect(() => {
    const stored = getStoredFont();
    setFont(stored);
    applyFont(stored);
  }, []);

  const toggle = () => {
    const next = font === 'serif' ? 'sans' : 'serif';
    globalThis.localStorage?.setItem(STORAGE_KEY, next);
    setFont(next);
    applyFont(next);
  };

  return (
    <button
      className="navbar__item navbar__link navbar__font-toggle"
      type="button"
      onClick={toggle}
      aria-label={`字体：${FONT_LABELS[font]}（点击切换）`}
    >
      字体：{FONT_LABELS[font]}
    </button>
  );
}