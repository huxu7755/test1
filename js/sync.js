/* sync.js - Sync placeholder (local-only by default) */

const Sync = (() => {
  let syncEnabled = false;

  function isEnabled() { return syncEnabled; }

  function enable() { syncEnabled = true; }

  function disable() { syncEnabled = false; }

  // Future: implement cloud sync (WebDAV, remote API, etc.)
  function syncNow() {
    if (!syncEnabled) return;
    // Placeholder for future sync logic
    console.log('Sync: not implemented (local-only mode)');
  }

  return { isEnabled, enable, disable, syncNow };
})();
