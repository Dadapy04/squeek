if (window.top && window.top !== window.self) {
  try { window.top.location = window.location.href } catch { /* a foreign frame cannot navigate us */ }
}
