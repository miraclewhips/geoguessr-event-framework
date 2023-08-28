var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var GeoGuessrEventFramework;
(function () {
    let GEF_SV, GEF_M;
    let gmLoadPromise;
    let gmLatLngPrev;
    let gmLatLng;
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    function overrideOnLoad(googleScript, observer, overrider) {
        const oldOnload = googleScript.onload;
        googleScript.onload = (event) => {
            const google = window['google'];
            if (google) {
                observer.disconnect();
                overrider(google);
            }
            if (oldOnload) {
                oldOnload.call(googleScript, event);
            }
        };
    }
    function grabGoogleScript(mutations) {
        for (const mutation of mutations) {
            for (const newNode of mutation.addedNodes) {
                const asScript = newNode;
                if (asScript && asScript.src && asScript.src.startsWith('https://maps.googleapis.com/')) {
                    return asScript;
                }
            }
        }
        return null;
    }
    function injecter(overrider) {
        new MutationObserver((mutations, observer) => {
            const googleScript = grabGoogleScript(mutations);
            if (googleScript) {
                overrideOnLoad(googleScript, observer, overrider);
            }
        }).observe(document.documentElement, { childList: true, subtree: true });
    }
    function getPos() {
        const pos = GEF_SV.getPosition();
        if (!pos)
            return { lat: null, lng: null };
        return { lat: pos.lat(), lng: pos.lng() };
    }
    function getSVLatLng() {
        return __awaiter(this, void 0, void 0, function* () {
            yield gmLoadPromise;
            if (!GEF_SV)
                return { lat: null, lng: null };
            yield sleep(100);
            return new Promise((resolve) => {
                if (!gmLatLngPrev) {
                    const pos = getPos();
                    gmLatLngPrev = pos;
                    resolve(pos);
                }
                else {
                    let listener = window['google'].maps.event.addListener(GEF_SV, 'status_changed', () => {
                        const pos = getPos();
                        if (gmLatLngPrev.lat != pos.lat && gmLatLngPrev.lng != pos.lng) {
                            window['google'].maps.event.removeListener(listener);
                            gmLatLngPrev = pos;
                            resolve(pos);
                        }
                    });
                }
            });
        });
    }
    gmLoadPromise = new Promise((resolve, reject) => {
        document.addEventListener('DOMContentLoaded', () => {
            injecter(() => {
                if (!window['google'])
                    return reject();
                const promiseList = [];
                promiseList.push(new Promise((resolve) => {
                    window['google'].maps.StreetViewPanorama = class extends window['google'].maps.StreetViewPanorama {
                        constructor(...args) {
                            super(...args);
                            GEF_SV = this;
                            resolve();
                        }
                    };
                }));
                promiseList.push(new Promise((resolve) => {
                    window['google'].maps.Map = class extends window['google'].maps.Map {
                        constructor(...args) {
                            super(...args);
                            GEF_M = this;
                            resolve();
                        }
                    };
                }));
                Promise.all(promiseList).then(() => {
                    return resolve();
                });
            });
        });
    });
    class GEF {
        constructor() {
            this.events = new EventTarget();
            this.state = this.defaultState();
            this.init();
            this.loadState();
            let el = document.querySelector('#__next');
            if (!el)
                return;
            const observer = new MutationObserver(this.checkState.bind(this));
            observer.observe(el, { subtree: true, childList: true });
            gmLoadPromise.then(() => {
                GEF_M.addListener('click', (e) => {
                    if (!this.state.current_round || !this.state.round_in_progress)
                        return;
                    this.state.rounds[this.state.current_round - 1].player_guess = {
                        lat: e.latLng.lat(),
                        lng: e.latLng.lng()
                    };
                });
            });
        }
        init() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.loadedPromise) {
                    this.loadedPromise = Promise.resolve(this);
                }
                return this.loadedPromise;
            });
        }
        defaultState() {
            return {
                current_game_id: '',
                is_challenge_link: false,
                current_round: 0,
                round_in_progress: false,
                game_in_progress: true,
                total_score: 0,
                rounds: [],
            };
        }
        loadState() {
            let data = window.localStorage.getItem('GeoGuessrEventFramework_STATE');
            if (!data)
                return;
            let dataJson = JSON.parse(data);
            if (!data)
                return;
            dataJson.current_round = 0;
            dataJson.round_in_progress = false;
            dataJson.game_in_progress = true;
            Object.assign(this.state, this.defaultState(), dataJson);
            this.saveState();
        }
        saveState() {
            window.localStorage.setItem('GeoGuessrEventFramework_STATE', JSON.stringify(this.state));
        }
        getCurrentRound() {
            const roundNode = document.querySelector('div[class^="status_inner__"]>div[data-qa="round-number"]');
            const text = roundNode === null || roundNode === void 0 ? void 0 : roundNode.children[1].textContent;
            if (!text)
                return 0;
            return parseInt(text.split(/\//gi)[0].trim());
        }
        getGameMode() {
            if (location.pathname.startsWith("/game/"))
                return 'game';
            if (location.pathname.startsWith("/challenge/"))
                return 'challenge';
            return undefined;
        }
        getGameId() {
            return window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
        }
        startRound() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.getGameMode())
                    return;
                // if game ID has changed just reset the state
                if (this.state.current_game_id !== this.getGameId()) {
                    this.state = this.defaultState();
                }
                this.state.current_round = this.getCurrentRound();
                this.state.round_in_progress = true;
                this.state.game_in_progress = true;
                this.state.current_game_id = this.getGameId();
                this.state.is_challenge_link = this.getGameMode() == 'challenge';
                if (this.state.current_round) {
                    this.state.rounds[this.state.current_round - 1] = {
                        score: 0,
                        location: { lat: null, lng: null },
                        player_guess: { lat: null, lng: null }
                    };
                }
                this.saveState();
                if (this.state.current_round === 1) {
                    this.events.dispatchEvent(new CustomEvent('game_start', { detail: this.state }));
                }
                this.events.dispatchEvent(new CustomEvent('round_start', { detail: this.state }));
                getSVLatLng().then((latlng) => {
                    gmLatLng = latlng;
                });
            });
        }
        stopRound() {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                this.state.round_in_progress = false;
                // sleep for 1ms to give the score element a chance to display the round score
                yield sleep(1);
                const score = (_a = document.querySelector(`div[class^="round-result_pointsIndicatorWrapper__"] div[class^="shadow-text_root__"]`)) === null || _a === void 0 ? void 0 : _a.textContent;
                if (score) {
                    const scoreInt = parseInt(score.replace(/[^\d]/g, ''));
                    if (!isNaN(scoreInt) && this.state.current_round) {
                        this.state.rounds[this.state.current_round - 1].score = scoreInt;
                    }
                }
                this.state.total_score = this.state.rounds.reduce((a, b) => a += b.score, 0);
                if (this.state.current_round && gmLatLng) {
                    this.state.rounds[this.state.current_round - 1].location = gmLatLng;
                }
                this.saveState();
                this.events.dispatchEvent(new CustomEvent('round_end', { detail: this.state }));
                if (this.state.current_round === 5) {
                    this.events.dispatchEvent(new CustomEvent('game_end', { detail: this.state }));
                }
            });
        }
        checkState() {
            const gameLayout = document.querySelector('.game-layout');
            const resultLayout = document.querySelector('div[class^="round-result_wrapper__"]');
            const finalScoreLayout = document.querySelector('div[class^="result-layout_root__"] div[class^="result-overlay_overlayContent__"]');
            if (gameLayout) {
                if (this.state.current_round !== this.getCurrentRound() || this.state.current_game_id !== this.getGameId()) {
                    if (this.state.round_in_progress) {
                        this.stopRound();
                    }
                    this.startRound();
                }
                else if (resultLayout && this.state.round_in_progress) {
                    this.stopRound();
                }
                else if (finalScoreLayout && this.state.game_in_progress) {
                    this.state.game_in_progress = false;
                }
            }
        }
    }
    GeoGuessrEventFramework = new GEF();
    console.log('GeoGuessr Event Framework initialised: https://github.com/miraclewhips/geoguessr-event-framework');
})();
