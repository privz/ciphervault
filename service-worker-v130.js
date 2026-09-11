"use strict";

// v1.3.0 keeps the validated crypto, Smart Target and stability behavior and
// layers the pure green-accent neumorphic UI on top.
importScripts(
    "service-worker.js",
    "quick-ux-worker.js",
    "auto-profile-worker.js",
    "quick-runner-v123.js",
    "quick-neumorph-worker-v130.js"
);
