"use strict";

// Load the validated core first, then the v1.2.0 Quick Cipher UX layer,
// then the Google Chat automatic Profile resolver so context mapping
// remains the final credential-selection layer.
importScripts("service-worker.js", "quick-ux-worker.js", "auto-profile-worker.js");
