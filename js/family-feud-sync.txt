/**
 * Service Desk Feud host ↔ display sync.
 *
 * Works best when both pages are served over http(s) from the same site
 * (GoDaddy, localhost, etc.): BroadcastChannel + localStorage.
 *
 * For file:// double-click opens, use the host’s “Open audience board”
 * button so the host can postMessage directly to that window.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "familyFeudLiveState_v1";
  var CHANNEL_NAME = "family-feud-live-v1";
  var MSG_TYPE = "family-feud-state";
  var POLL_MS = 200;

  function safeParse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function readStored() {
    try {
      return safeParse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  function writeStored(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* private mode / quota */
    }
  }

  /**
   * @param {function(object): void} onState
   * @param {{isHost?: boolean}} [opts]
   */
  function createBus(onState, opts) {
    opts = opts || {};
    var isHost = !!opts.isHost;
    var bc = null;
    var lastRev = -1;
    var pollTimer = null;
    var destroyed = false;
    /** @type {Window[]} */
    var peerWindows = [];

    function deliver(state, source) {
      if (!state || destroyed) return;
      var rev = typeof state.rev === "number" ? state.rev : 0;
      // Host ignores its own echoes unless forced
      if (!isHost) {
        if (rev <= lastRev && source !== "force") return;
        lastRev = rev;
        onState(state);
      } else if (source === "force") {
        lastRev = rev;
        if (onState) onState(state);
      } else {
        lastRev = Math.max(lastRev, rev);
      }
    }

    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = function (ev) {
          if (ev.data && ev.data.__ffType === MSG_TYPE) {
            deliver(ev.data.state, "bc");
          } else {
            deliver(ev.data, "bc");
          }
        };
      }
    } catch (e) {
      bc = null;
    }

    function onStorage(ev) {
      if (ev.key && ev.key !== STORAGE_KEY) return;
      deliver(safeParse(ev.newValue), "storage");
    }

    function onMessage(ev) {
      var data = ev.data;
      if (!data || data.__ffType !== MSG_TYPE) return;
      deliver(data.state, "postMessage");
    }

    try {
      window.addEventListener("storage", onStorage);
      window.addEventListener("message", onMessage);
    } catch (e) { /* ignore */ }

    if (!isHost) {
      pollTimer = window.setInterval(function () {
        deliver(readStored(), "poll");
      }, POLL_MS);
      deliver(readStored(), "force");
    }

    function prunePeers() {
      peerWindows = peerWindows.filter(function (w) {
        try {
          return w && !w.closed;
        } catch (e) {
          return false;
        }
      });
    }

    return {
      isHost: isHost,
      publish: function (state) {
        if (!state || destroyed) return;
        if (typeof state.rev !== "number") {
          state.rev = (lastRev || 0) + 1;
        }
        state.ts = Date.now();
        lastRev = state.rev;
        writeStored(state);

        var envelope = { __ffType: MSG_TYPE, state: state };

        if (bc) {
          try {
            bc.postMessage(envelope);
          } catch (e1) {
            try {
              bc.postMessage(state);
            } catch (e2) { /* ignore */ }
          }
        }

        prunePeers();
        peerWindows.forEach(function (w) {
          try {
            w.postMessage(envelope, "*");
          } catch (e) { /* ignore */ }
        });

        // Also try window.opener reverse path if display opened host (unlikely)
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(envelope, "*");
          }
        } catch (e) { /* ignore */ }
      },
      /** Host: track a display window opened via window.open */
      attachWindow: function (win) {
        if (!win) return;
        prunePeers();
        if (peerWindows.indexOf(win) === -1) peerWindows.push(win);
      },
      getLatest: readStored,
      destroy: function () {
        destroyed = true;
        if (pollTimer) window.clearInterval(pollTimer);
        try {
          window.removeEventListener("storage", onStorage);
          window.removeEventListener("message", onMessage);
        } catch (e) { /* ignore */ }
        if (bc) {
          try {
            bc.close();
          } catch (e) { /* ignore */ }
        }
      },
    };
  }

  global.FamilyFeudSync = {
    STORAGE_KEY: STORAGE_KEY,
    createBus: createBus,
    readStored: readStored,
  };
})(window);
