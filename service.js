function refreshServiceIcons() {
  if (!window.lucide?.createIcons) return;
  window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' }, nameAttr: 'data-lucide' });
}

document.addEventListener('DOMContentLoaded', refreshServiceIcons);
