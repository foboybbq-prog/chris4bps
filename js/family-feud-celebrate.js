/**
 * Confetti for Service Desk Feud — lightweight so win music stays crisp.
 */
(function (global) {
  "use strict";

  var confettiTimer = null;
  var confettiRaf = null;

  function stopConfetti(canvas) {
    if (confettiTimer) {
      clearTimeout(confettiTimer);
      confettiTimer = null;
    }
    if (confettiRaf) {
      cancelAnimationFrame(confettiRaf);
      confettiRaf = null;
    }
    if (canvas) {
      var ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} [durationMs]
   */
  function runConfetti(canvas, durationMs) {
    if (!canvas) return;
    durationMs = durationMs || 10000;
    stopConfetti(canvas);

    // Size canvas once (not every frame) — high-DPI scaled for sharpness, limited for CPU
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var cssW = window.innerWidth;
    var cssH = window.innerHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";

    var ctx = canvas.getContext("2d", { alpha: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var colors = ["#f0c14b", "#ffe08a", "#5dff9a", "#8ef0bc", "#ff6b6b", "#74c0fc", "#ffffff", "#ff922b"];
    // Fewer particles = smooth music (was 80–180; that starved the main thread)
    var count = Math.min(70, Math.floor((cssW * cssH) / 28000) + 40);
    var pieces = [];
    for (var i = 0; i < count; i++) {
      pieces.push({
        x: Math.random() * cssW,
        y: Math.random() * cssH - cssH,
        w: 5 + Math.random() * 7,
        h: 7 + Math.random() * 9,
        color: colors[(Math.random() * colors.length) | 0],
        vy: 2.2 + Math.random() * 3.2,
        vx: -1.8 + Math.random() * 3.6,
      });
    }

    var start = performance.now();
    var last = start;

    function frame(now) {
      var elapsed = now - start;
      // Cap work if frame is late (keeps audio decode/path free)
      if (now - last < 14) {
        confettiRaf = requestAnimationFrame(frame);
        return;
      }
      last = now;

      ctx.clearRect(0, 0, cssW, cssH);
      for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > cssH + 16) {
          p.y = -16;
          p.x = Math.random() * cssW;
        }
        // No rotate/save/restore — big CPU win, still looks like confetti
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
      if (elapsed < durationMs) {
        confettiRaf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, cssW, cssH);
        confettiRaf = null;
      }
    }
    confettiRaf = requestAnimationFrame(frame);
    confettiTimer = setTimeout(function () {
      stopConfetti(canvas);
    }, durationMs + 120);
  }

  global.FamilyFeudCelebrate = {
    runConfetti: runConfetti,
    stopConfetti: stopConfetti,
  };
})(window);
