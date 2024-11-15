// ==UserScript==
// @name         GeoGuessr Event Framework Patch
// @description  Patch for scripts that include GeoGuessr Event Framework to work correctly, since they sometimes have problems if the script takes too long to load
// @version      1.0
// @author       miraclewhips
// @match        *://*.geoguessr.com/*
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?domain=geoguessr.com
// @grant        unsafeWindow
// @copyright    2024, miraclewhips (https://github.com/miraclewhips)
// @license      MIT
// @downloadURL  https://github.com/miraclewhips/geoguessr-event-framework/raw/master/geoguessr-event-framework-patch.user.js
// @updateURL    https://github.com/miraclewhips/geoguessr-event-framework/raw/master/geoguessr-event-framework-patch.user.js
// ==/UserScript==



/* ############################################################################### */
/* ##### DON'T MODIFY ANYTHING BELOW HERE UNLESS YOU KNOW WHAT YOU ARE DOING ##### */
/* ############################################################################### */

const THE_WINDOW = unsafeWindow || window;

if(THE_WINDOW.GEFFetchEvents === undefined) {
    THE_WINDOW.GEFFetchEvents = new EventTarget();
}

const default_fetch = THE_WINDOW.fetch;
THE_WINDOW.fetch = (function () {
        return async function (...args) {
                const url = args[0].toString();
                if(/geoguessr.com\/api\/v3\/(games|challenges)\//.test(url) && url.indexOf('daily-challenge') === -1) {
                        const result = await default_fetch.apply(THE_WINDOW, args);
                        const data = await result.clone().json();
                        if(!data.round) return result;

                        THE_WINDOW.GEFFetchEvents.dispatchEvent(new CustomEvent('received_data', {detail: data}));

                        return result;
                }

                return default_fetch.apply(THE_WINDOW, args);
        };
})();

THE_WINDOW.fetch.isGEFFetch = true;
THE_WINDOW.GEFCoreInstalled = true;
