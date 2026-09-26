// Independently implemented orbital cursor. Visual reference:
// https://github.com/sunay04/sunay04.github.io (AstralCursor)
export function setupAstralCursor(motionEnabled) {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const layer = document.createElement('div');
  layer.className = 'astral-cursor';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<span class="cursor-ripple"></span><span class="cursor-ring"><i></i></span><span class="cursor-dot"></span>';
  const [ripple, ring, dot] = layer.children;
  document.body.append(layer);
  let x = 0, y = 0, rx = 0, ry = 0, frame = 0, visible = false;
  let rippleAnimation;
  const enabled = () => fine.matches && !reduced.matches && motionEnabled();
  const place = (node, a, b) => { node.style.transform = `translate3d(${a}px,${b}px,0)`; };
  const hide = () => {
    visible = false;
    layer.classList.remove('is-visible', 'is-over', 'is-down');
    root.classList.remove('custom-cursor');
    cancelAnimationFrame(frame);
    frame = 0;
    rippleAnimation?.cancel();
  };
  const follow = () => {
    rx += (x - rx) * .2;
    ry += (y - ry) * .2;
    place(ring, rx, ry);
    if (Math.abs(x-rx) + Math.abs(y-ry) > .15) frame = requestAnimationFrame(follow);
    else frame = 0;
  };
  const mount = () => {
    // Native modal dialogs live in the top layer; ordinary z-index cannot cover them.
    const host = document.querySelector('dialog[open]') || document.body;
    if (layer.parentElement !== host) { host.append(layer); hide(); }
    if (!enabled()) hide();
  };
  document.addEventListener('pointermove', event => {
    if (!enabled() || event.pointerType === 'touch') { hide(); return; }
    x = event.clientX; y = event.clientY;
    if (!visible) { rx = x; ry = y; place(ring, x, y); }
    visible = true;
    place(dot, x, y);
    root.classList.add('custom-cursor');
    layer.classList.add('is-visible');
    layer.classList.toggle('is-over', Boolean(event.target.closest('a,button,input,select,textarea,[role="button"]')));
    if (!frame) frame = requestAnimationFrame(follow);
  }, { passive: true });
  document.addEventListener('pointerdown', event => {
    if (!enabled() || !visible || event.pointerType === 'touch') return;
    layer.classList.add('is-down');
    rippleAnimation?.cancel();
    ripple.style.left = `${event.clientX}px`;
    ripple.style.top = `${event.clientY}px`;
    rippleAnimation = ripple.animate([{ opacity: .8, transform: 'translate(-50%,-50%) scale(.36)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 500, easing: 'cubic-bezier(.16,1,.3,1)' });
  }, { passive: true });
  document.addEventListener('pointerup', () => layer.classList.remove('is-down'), { passive: true });
  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  document.addEventListener('keydown', event => { if (event.key === 'Tab') hide(); });
  fine.addEventListener('change', mount);
  reduced.addEventListener('change', mount);
  const observer = new MutationObserver(mount);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.querySelectorAll('dialog').forEach(dialog => observer.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
  mount();
}
