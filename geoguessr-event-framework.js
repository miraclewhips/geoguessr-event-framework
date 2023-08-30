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
    let gApiData;
    const default_fetch = window.fetch;
    window.fetch = (function () {
        return function (...args) {
            return __awaiter(this, void 0, void 0, function* () {
                if (/geoguessr.com\/api\/v3\/(games|challenges)\//.test(args[0].toString())) {
                    let result = yield default_fetch.apply(window, args);
                    gApiData = yield result.clone().json();
                    return result;
                }
                return default_fetch.apply(window, args);
            });
        };
    })();
    function getGAPIData(state) {
        if (gApiData && gApiData.round === state.current_round) {
            return gApiData;
        }
        return null;
    }
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
                total_score: { amount: 0, unit: 'points', percentage: 0 },
                total_distance: {
                    meters: { amount: 0, unit: 'km' },
                    miles: { amount: 0, unit: 'miles' }
                },
                rounds: [],
                map: { id: '', name: '' },
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
                let gData = getGAPIData(this.state);
                if (gData) {
                    this.state.map = {
                        id: gData.map,
                        name: gData.mapName
                    };
                }
                this.saveState();
                if (this.state.current_round === 1) {
                    this.events.dispatchEvent(new CustomEvent('game_start', { detail: this.state }));
                }
                this.events.dispatchEvent(new CustomEvent('round_start', { detail: this.state }));
            });
        }
        stopRound() {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
            return __awaiter(this, void 0, void 0, function* () {
                this.state.round_in_progress = false;
                let gData = getGAPIData(this.state);
                if (gData) {
                    const r = gData.rounds[this.state.current_round - 1];
                    const g = gData.player.guesses[this.state.current_round - 1];
                    this.state.rounds[this.state.current_round - 1] = {
                        location: { lat: r.lat, lng: r.lng },
                        player_guess: { lat: g.lat, lng: g.lng },
                        score: {
                            amount: parseFloat((_a = g === null || g === void 0 ? void 0 : g.roundScore) === null || _a === void 0 ? void 0 : _a.amount) || 0,
                            unit: ((_b = g === null || g === void 0 ? void 0 : g.roundScore) === null || _b === void 0 ? void 0 : _b.unit) || 'points',
                            percentage: ((_c = g === null || g === void 0 ? void 0 : g.roundScore) === null || _c === void 0 ? void 0 : _c.percentage) || 0,
                        },
                        distance: {
                            meters: {
                                amount: parseFloat((_e = (_d = g === null || g === void 0 ? void 0 : g.distance) === null || _d === void 0 ? void 0 : _d.meters) === null || _e === void 0 ? void 0 : _e.amount) || 0,
                                unit: ((_g = (_f = g === null || g === void 0 ? void 0 : g.distance) === null || _f === void 0 ? void 0 : _f.meters) === null || _g === void 0 ? void 0 : _g.unit) || 'km',
                            },
                            miles: {
                                amount: parseFloat((_j = (_h = g === null || g === void 0 ? void 0 : g.distance) === null || _h === void 0 ? void 0 : _h.miles) === null || _j === void 0 ? void 0 : _j.amount) || 0,
                                unit: ((_l = (_k = g === null || g === void 0 ? void 0 : g.distance) === null || _k === void 0 ? void 0 : _k.miles) === null || _l === void 0 ? void 0 : _l.unit) || 'miles',
                            },
                        }
                    };
                    this.state.total_score = {
                        amount: parseFloat((_o = (_m = gData === null || gData === void 0 ? void 0 : gData.player) === null || _m === void 0 ? void 0 : _m.totalScore) === null || _o === void 0 ? void 0 : _o.amount) || 0,
                        unit: ((_q = (_p = gData === null || gData === void 0 ? void 0 : gData.player) === null || _p === void 0 ? void 0 : _p.totalScore) === null || _q === void 0 ? void 0 : _q.unit) || 'points',
                        percentage: ((_s = (_r = gData === null || gData === void 0 ? void 0 : gData.player) === null || _r === void 0 ? void 0 : _r.totalScore) === null || _s === void 0 ? void 0 : _s.percentage) || 0,
                    };
                    this.state.total_distance = {
                        meters: {
                            amount: parseFloat((_v = (_u = (_t = gData === null || gData === void 0 ? void 0 : gData.player) === null || _t === void 0 ? void 0 : _t.totalDistance) === null || _u === void 0 ? void 0 : _u.meters) === null || _v === void 0 ? void 0 : _v.amount) || 0,
                            unit: ((_y = (_x = (_w = gData === null || gData === void 0 ? void 0 : gData.player) === null || _w === void 0 ? void 0 : _w.totalDistance) === null || _x === void 0 ? void 0 : _x.meters) === null || _y === void 0 ? void 0 : _y.unit) || 'km',
                        },
                        miles: {
                            amount: parseFloat((_1 = (_0 = (_z = gData === null || gData === void 0 ? void 0 : gData.player) === null || _z === void 0 ? void 0 : _z.totalDistance) === null || _0 === void 0 ? void 0 : _0.miles) === null || _1 === void 0 ? void 0 : _1.amount) || 0,
                            unit: ((_4 = (_3 = (_2 = gData === null || gData === void 0 ? void 0 : gData.player) === null || _2 === void 0 ? void 0 : _2.totalDistance) === null || _3 === void 0 ? void 0 : _3.miles) === null || _4 === void 0 ? void 0 : _4.unit) || 'miles',
                        },
                    };
                    this.state.map = {
                        id: gData.map,
                        name: gData.mapName
                    };
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
