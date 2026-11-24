const INSTALL_BUTTON = "[data-install-button]";

export function initPwa() {
  registerServiceWorker();
  initInstallButton();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  /* Relativa a la base del documento: funciona en raíz y en subruta. */
  const swUrl = new URL("sw.js", document.baseURI).href;
  navigator.serviceWorker.register(swUrl).catch(() => {
    // Sin service worker la app sigue funcionando (por ejemplo, fuera de HTTPS).
  });
}

function initInstallButton() {
  const button = document.querySelector(INSTALL_BUTTON);
  if (!button) return;
  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    button.hidden = false;
  });

  button.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    button.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    button.hidden = true;
  });
}
