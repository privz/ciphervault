"use strict";

// v1.2.3 keeps the validated crypto/profile layers and replaces only the
// Quick Cipher runner with safer Smart Target resolution.
importScripts(
    "service-worker.js",
    "quick-ux-worker.js",
    "auto-profile-worker.js",
    "quick-runner-v123.js"
);
