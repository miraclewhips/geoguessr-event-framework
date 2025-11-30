var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const THE_WINDOW = unsafeWindow || window;
(function () {
    class GEF {
        constructor() {
            this.events = new EventTarget();
            this.state = this.defaultState();
            this.loadState();
            this.initFetchEvents();
            this.overrideFetch();
            this.init();
            THE_WINDOW.addEventListener('load', () => {
                var _a, _b, _c;
                if (location.pathname.startsWith("/challenge/")) {
                    const data = (_c = (_b = (_a = THE_WINDOW === null || THE_WINDOW === void 0 ? void 0 : THE_WINDOW.__NEXT_DATA__) === null || _a === void 0 ? void 0 : _a.props) === null || _b === void 0 ? void 0 : _b.pageProps) === null || _c === void 0 ? void 0 : _c.gameSnapshot;
                    if (!data || !data.round)
                        return;
                    THE_WINDOW.GEFFetchEvents.dispatchEvent(new CustomEvent('received_data', { detail: data }));
                }
            });
            THE_WINDOW.GEFFetchEvents.addEventListener('received_data', (event) => {
                this.parseData(event.detail);
            });
        }
        initFetchEvents() {
            if (THE_WINDOW.GEFFetchEvents !== undefined)
                return;
            THE_WINDOW.GEFFetchEvents = new EventTarget();
        }
        overrideFetch() {
            if (THE_WINDOW.fetch.isGEFFetch)
                return;
            const default_fetch = THE_WINDOW.fetch;
            THE_WINDOW.fetch = (function () {
                return function (...args) {
                    var _a;
                    return __awaiter(this, void 0, void 0, function* () {
                        const url = args[0].toString();
                        if (url.match(/geoguessr\.com\/api\/v3\/games$/) && ((_a = args[1]) === null || _a === void 0 ? void 0 : _a.method) === "POST") {
                            const result = yield default_fetch.apply(THE_WINDOW, args);
                            const data = yield result.clone().json();
                            if (!data.round)
                                return result;
                            THE_WINDOW.GEFFetchEvents.dispatchEvent(new CustomEvent('received_data', { detail: data }));
                            return result;
                        }
                        if (/geoguessr.com\/api\/v3\/(games|challenges)\//.test(url) && url.indexOf('daily-challenge') === -1) {
                            const result = yield default_fetch.apply(THE_WINDOW, args);
                            const data = yield result.clone().json();
                            if (!data.round)
                                return result;
                            THE_WINDOW.GEFFetchEvents.dispatchEvent(new CustomEvent('received_data', { detail: data }));
                            return result;
                        }
                        return default_fetch.apply(THE_WINDOW, args);
                    });
                };
            })();
            THE_WINDOW.fetch.isGEFFetch = true;
        }
        init() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.loadedPromise) {
                    this.loadedPromise = Promise.resolve(this);
                }
                return yield this.loadedPromise;
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
                total_time: 0,
                rounds: [],
                settings: {
                    time_limit: 0,
                    forbid_moving: false,
                    forbid_panning: false,
                    forbid_zooming: false,
                },
                map: { id: '', name: '' },
            };
        }
        parseData(data) {
            const finished = data.player.guesses.length == data.round;
            const isNewRound = data.round !== this.state.current_round || data.token !== this.state.current_game_id;
            if (finished) {
                this.stopRound(data);
            }
            else if (isNewRound) {
                this.startRound(data);
            }
        }
        loadState() {
            let data = window.localStorage.getItem('GeoGuessrEventFramework_STATE');
            if (!data)
                return;
            let dataJson = JSON.parse(data);
            if (!dataJson)
                return;
            Object.assign(this.state, this.defaultState(), dataJson);
            this.saveState();
        }
        saveState() {
            window.localStorage.setItem('GeoGuessrEventFramework_STATE', JSON.stringify(this.state));
        }
        hex2a(hexx) {
            const hex = hexx.toString(); //force conversion
            let str = '';
            for (let i = 0; i < hex.length; i += 2) {
                str += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
            }
            return str;
        }
        updateGameSettings(data) {
            this.state.settings = {
                time_limit: data.timeLimit,
                forbid_moving: data.forbidMoving,
                forbid_panning: data.forbidPanning,
                forbid_zooming: data.forbidZooming,
            };
            this.state.map = {
                id: data.map,
                name: data.mapName
            };
        }
        startRound(data) {
            this.state.current_round = data.round;
            this.state.round_in_progress = true;
            this.state.game_in_progress = true;
            this.state.current_game_id = data.token;
            this.state.is_challenge_link = data.type == 'challenge';
            this.state.rounds = this.state.rounds.slice(0, data.round - 1);
            if (data) {
                this.updateGameSettings(data);
            }
            this.saveState();
            if (this.state.current_round === 1) {
                this.events.dispatchEvent(new CustomEvent('game_start', { detail: this.state }));
            }
            this.events.dispatchEvent(new CustomEvent('round_start', { detail: this.state }));
        }
        stopRound(data) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5;
            this.state.round_in_progress = false;
            if (data) {
                const r = data.rounds[this.state.current_round - 1];
                const g = data.player.guesses[this.state.current_round - 1];
                if (!r || !g) {
                    return;
                }
                this.state.rounds[this.state.current_round - 1] = {
                    location: {
                        lat: r.lat,
                        lng: r.lng,
                        heading: r.heading,
                        pitch: r.pitch,
                        zoom: r.zoom,
                        panoId: r.panoId ? this.hex2a(r.panoId) : undefined,
                    },
                    player_guess: {
                        lat: g.lat,
                        lng: g.lng,
                    },
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
                    },
                    time: g === null || g === void 0 ? void 0 : g.time
                };
                this.state.total_score = {
                    amount: parseFloat((_o = (_m = data === null || data === void 0 ? void 0 : data.player) === null || _m === void 0 ? void 0 : _m.totalScore) === null || _o === void 0 ? void 0 : _o.amount) || 0,
                    unit: ((_q = (_p = data === null || data === void 0 ? void 0 : data.player) === null || _p === void 0 ? void 0 : _p.totalScore) === null || _q === void 0 ? void 0 : _q.unit) || 'points',
                    percentage: ((_s = (_r = data === null || data === void 0 ? void 0 : data.player) === null || _r === void 0 ? void 0 : _r.totalScore) === null || _s === void 0 ? void 0 : _s.percentage) || 0,
                };
                this.state.total_distance = {
                    meters: {
                        amount: parseFloat((_v = (_u = (_t = data === null || data === void 0 ? void 0 : data.player) === null || _t === void 0 ? void 0 : _t.totalDistance) === null || _u === void 0 ? void 0 : _u.meters) === null || _v === void 0 ? void 0 : _v.amount) || 0,
                        unit: ((_y = (_x = (_w = data === null || data === void 0 ? void 0 : data.player) === null || _w === void 0 ? void 0 : _w.totalDistance) === null || _x === void 0 ? void 0 : _x.meters) === null || _y === void 0 ? void 0 : _y.unit) || 'km',
                    },
                    miles: {
                        amount: parseFloat((_1 = (_0 = (_z = data === null || data === void 0 ? void 0 : data.player) === null || _z === void 0 ? void 0 : _z.totalDistance) === null || _0 === void 0 ? void 0 : _0.miles) === null || _1 === void 0 ? void 0 : _1.amount) || 0,
                        unit: ((_4 = (_3 = (_2 = data === null || data === void 0 ? void 0 : data.player) === null || _2 === void 0 ? void 0 : _2.totalDistance) === null || _3 === void 0 ? void 0 : _3.miles) === null || _4 === void 0 ? void 0 : _4.unit) || 'miles',
                    },
                };
                this.state.total_time = (_5 = data === null || data === void 0 ? void 0 : data.player) === null || _5 === void 0 ? void 0 : _5.totalTime;
                this.updateGameSettings(data);
            }
            this.saveState();
            this.events.dispatchEvent(new CustomEvent('round_end', { detail: this.state }));
            if (this.state.current_round === 5) {
                this.events.dispatchEvent(new CustomEvent('game_end', { detail: this.state }));
            }
        }
    }
    if (!THE_WINDOW['GeoGuessrEventFramework']) {
        THE_WINDOW['GeoGuessrEventFramework'] = new GEF();
        console.log('GeoGuessr Event Framework initialised: https://github.com/miraclewhips/geoguessr-event-framework');
    }
})();
