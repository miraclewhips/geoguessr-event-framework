var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const CC_DICT = { "AX": "FI", "AS": "US", "AI": "GB", "AW": "NL", "BM": "GB", "BQ": "NL", "BV": "NO", "IO": "GB", "KY": "UK", "CX": "AU", "CC": "AU", "CK": "NZ", "CW": "NL", "FK": "GB", "FO": "DK", "GF": "FR", "PF": "FR", "TF": "FR", "GI": "UK", "GL": "DK", "GP": "FR", "GU": "US", "GG": "GB", "HM": "AU", "HK": "CN", "IM": "GB", "JE": "GB", "MO": "CN", "MQ": "FR", "YT": "FR", "MS": "GB", "AN": "NL", "NC": "FR", "NU": "NZ", "NF": "AU", "MP": "US", "PS": "IL", "PN": "GB", "PR": "US", "RE": "FR", "BL": "FR", "SH": "GB", "MF": "FR", "PM": "FR", "SX": "NL", "GS": "GB", "SJ": "NO", "TK": "NZ", "TC": "GB", "UM": "US", "VG": "GB", "VI": "US", "WF": "FR", "EH": "MA" };
class GeoGuessrStreakFramework {
    constructor(options) {
        this.options = options;
        this.state = this.defaultState();
        this.current_round = 0;
        this.should_update_round_panel = false;
        this.should_update_summary_panel = false;
        if (typeof this.options.storage_identifier === 'string') {
            this.options.storage_identifier = this.options.storage_identifier.replace(/[^\w\d-_]/g, '');
            if (this.options.storage_identifier.length == 0) {
                throw new Error(`'storage_identifier' must not be blank and can only contain letters, digits, underscores, and hyphens.`);
            }
        }
        const defaults = {
            storage_identifier: 'geoguessr-streak-framework',
            name: 'Country Streak',
            terms: {
                single: 'country',
                plural: 'countries'
            },
            enabled_on_challenges: true,
            automatic: true,
            language: 'en',
            streak_type: 'round',
            only_match_country_code: true,
            query_openstreetmap: true,
            address_matches: ['country'],
            keyboard_shortcuts: { increment: '1', decrement: '2', reset: '0', restore: '8' },
        };
        this.options = Object.assign(defaults, this.options);
        this.loadState();
        this.setupKeyboardShortcuts();
        window.addEventListener('load', this.updateStreakPanels.bind(this));
        const THE_WINDOW = unsafeWindow || window;
        if (!THE_WINDOW['GeoGuessrEventFramework']) {
            throw new Error('GeoGuessr Streak Framework requires GeoGuessr Event Framework (https://github.com/miraclewhips/geoguessr-event-framework). Please include this before you include GeoGuessr Streak Framework.');
        }
        this.events = THE_WINDOW['GeoGuessrEventFramework'];
        this.events.init().then(GEF => {
            console.log('GeoGuessr Streak Framework initialised.');
            const addEvents = () => {
                let el = document.querySelector('#__next');
                if (!el)
                    return;
                const observer = new MutationObserver(this.checkState.bind(this));
                observer.observe(el, { subtree: true, childList: true });
                GEF.events.addEventListener('round_start', (event) => {
                    this.current_round = event.detail.current_round;
                    this.should_update_round_panel = true;
                    this.updateStreakPanels();
                });
                const event_name = this.options.streak_type === 'game' ? 'game_end' : 'round_end';
                GEF.events.addEventListener(event_name, (event) => {
                    this.should_update_summary_panel = true;
                    this.stopRound(event.detail);
                });
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', addEvents);
            }
            else {
                addEvents();
            }
        });
    }
    defaultState() {
        return {
            checking_api: false,
            streak: 0,
            previous_streak: 0,
            streak_backup: 0,
            guess_name: null,
            location_name: null,
            last_guess_identifier: null
        };
    }
    loadState() {
        this.state = this.defaultState();
        let loadedState = JSON.parse(window.localStorage.getItem(this.options.storage_identifier));
        if (loadedState) {
            loadedState.checking_api = false;
            Object.assign(this.state, loadedState);
            this.saveState();
        }
    }
    saveState() {
        window.localStorage.setItem(this.options.storage_identifier, JSON.stringify(this.state));
    }
    getRoundPanel() {
        return document.getElementById(`streak-counter-panel-${this.options.storage_identifier}`);
    }
    getSummaryPanel() {
        return document.getElementById(`streak-score-panel-summary-${this.options.storage_identifier}`);
    }
    updateRoundPanel() {
        let panel = this.getRoundPanel();
        if (!panel) {
            let gameScore = document.querySelector('div[class^="game_status__"] div[class^="status_section"][data-qa="score"]');
            if (gameScore) {
                let panel = document.createElement('div');
                panel.id = `streak-counter-panel-${this.options.storage_identifier}`;
                panel.style.display = 'flex';
                let classLabel = gameScore.querySelector('div[class^="status_label"]').className;
                let valueLabel = gameScore.querySelector('div[class^="status_value"]').className;
                panel.innerHTML = `<div class="${gameScore.getAttribute('class')}"><div class="${classLabel}">${this.options.name.toUpperCase()}</div><div id="streak-counter-value-${this.options.storage_identifier}" class="${valueLabel}"></div></div>`;
                gameScore.parentNode.append(panel);
            }
        }
        let streak = document.getElementById(`streak-counter-value-${this.options.storage_identifier}`);
        if (streak) {
            streak.innerText = this.state.streak.toString();
        }
    }
    createStreakText() {
        if (this.state.checking_api) {
            return `Loading...`;
        }
        if (this.state.streak > 0) {
            if (this.state.guess_name || this.state.location_name) {
                return `It was <span style="color:#6cb928">${this.state.guess_name || this.state.location_name}!</span> ${this.options.name}: <span style="color:#fecd19">${this.state.streak}</span>`;
            }
            else {
                return `${this.options.name}: <span style="color:#fecd19">${this.state.streak}</span>`;
            }
        }
        else {
            let suffix = `${this.options.terms.plural} in a row.`;
            switch (this.state.previous_streak) {
                case 1:
                    suffix = `${this.options.terms.single}.`;
            }
            let previousGuessText = ``;
            if (this.state.guess_name && this.state.location_name) {
                previousGuessText = `You guessed <span style="color:#f95252">${this.state.guess_name}</span>, unfortunately it was <span style="color:#6cb928">${this.state.location_name}</span>.`;
            }
            return `${previousGuessText} Your streak ended after <span style="color:#fecd19">${this.state.previous_streak}</span> ${suffix}`;
        }
    }
    createStreakElement() {
        let score = document.createElement('div');
        score.style.fontSize = '18px';
        score.style.fontWeight = '500';
        score.style.color = '#fff';
        score.style.padding = '10px';
        score.style.paddingBottom = '0';
        score.style.background = 'var(--ds-color-purple-100)';
        return score;
    }
    updateSummaryPanel() {
        if (this.options.streak_type === 'game' && this.current_round !== 5)
            return;
        const scoreLayout = document.querySelector('div[class^="result-layout_root"] div[class^="round-result_wrapper__"]');
        const scoreLayoutBottom = document.querySelector('div[class^="result-layout_root"] div[class^="result-layout_bottomNew__"]');
        if (scoreLayoutBottom) {
            scoreLayoutBottom.style.flex = '0 0 auto';
            scoreLayoutBottom.style.maxHeight = 'none';
        }
        if (!scoreLayout && !scoreLayoutBottom)
            return;
        let panel = this.getSummaryPanel();
        if (scoreLayout && !panel) {
            panel = this.createStreakElement();
            panel.id = `streak-score-panel-summary-${this.options.storage_identifier}`;
            scoreLayout.parentNode.insertBefore(panel, scoreLayout);
        }
        if (panel) {
            panel.innerHTML = this.createStreakText();
        }
    }
    updateStreakPanels() {
        this.updateRoundPanel();
        this.updateSummaryPanel();
    }
    queryOSM(location) {
        return __awaiter(this, void 0, void 0, function* () {
            let apiUrl = `https://nominatim.openstreetmap.org/reverse.php?lat=${location.lat}&lon=${location.lng}&zoom=18&format=jsonv2&accept-language=${this.options.language}`;
            return yield fetch(apiUrl).then(res => res.json());
        });
    }
    isAutoStreakDisabled(eventState) {
        return (!this.options.automatic || (eventState.is_challenge_link && !this.options.enabled_on_challenges));
    }
    matchCountryCode(address) {
        var _a;
        let cc = (_a = address === null || address === void 0 ? void 0 : address.country_code) === null || _a === void 0 ? void 0 : _a.toUpperCase();
        if (!cc)
            return null;
        return CC_DICT[cc] || cc;
    }
    matchAddress(address) {
        if (address && this.options.address_matches && this.options.address_matches.length > 0) {
            for (let match of this.options.address_matches) {
                if (address[match])
                    return address[match];
            }
        }
        return 'Undefined';
    }
    stopRound(eventState) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isAutoStreakDisabled(eventState))
                return;
            this.updateStreakPanels();
            const round = eventState.rounds[eventState.current_round - 1];
            if (!round)
                return;
            const guessIdentifier = `${eventState.current_game_id}-${eventState.current_round}`;
            if (guessIdentifier == this.state.last_guess_identifier) {
                this.updateStreakPanels();
                return;
            }
            this.state.last_guess_identifier = guessIdentifier;
            this.saveState();
            if (round.location.lat == null ||
                round.location.lng == null ||
                round.player_guess.lat == null ||
                round.player_guess.lng == null) {
                this.state.guess_name = null;
                this.state.location_name = null;
                this.setStreakValue(0);
                return;
            }
            let doesMatch = false;
            this.state.checking_api = true;
            if (this.options.query_openstreetmap) {
                this.updateStreakPanels();
                const responseGuess = yield this.queryOSM(round.player_guess);
                const responseLocation = yield this.queryOSM(round.location);
                if (this.options.custom_match_function) {
                    const matchResult = yield this.options.custom_match_function(this.events.state, responseGuess, responseLocation);
                    this.state.checking_api = false;
                    this.state.guess_name = matchResult.player_guess_name;
                    this.state.location_name = matchResult.actual_location_name;
                    doesMatch = matchResult.match;
                }
                else {
                    this.state.checking_api = false;
                    const guessCC = this.matchCountryCode(responseGuess === null || responseGuess === void 0 ? void 0 : responseGuess.address);
                    const locationCC = this.matchCountryCode(responseLocation === null || responseLocation === void 0 ? void 0 : responseLocation.address);
                    this.state.guess_name = this.matchAddress(responseGuess === null || responseGuess === void 0 ? void 0 : responseGuess.address);
                    this.state.location_name = this.matchAddress(responseLocation === null || responseLocation === void 0 ? void 0 : responseLocation.address);
                    const countryCodeMatches = guessCC && locationCC && guessCC === locationCC;
                    const nameMatches = this.state.guess_name === this.state.location_name;
                    doesMatch = countryCodeMatches && (nameMatches || this.options.only_match_country_code);
                }
            }
            else {
                const matchResult = yield this.options.custom_match_function(this.events.state, round.player_guess, round.location);
                this.state.checking_api = false;
                this.state.guess_name = matchResult.player_guess_name;
                this.state.location_name = matchResult.actual_location_name;
                doesMatch = matchResult.match;
            }
            this.updateStreakPanels();
            if (doesMatch) {
                this.incrementStreakValue(1);
            }
            else {
                this.setStreakValue(0);
            }
        });
    }
    checkStreakIsLatest() {
        let data = JSON.parse(window.localStorage.getItem(this.options.storage_identifier));
        if (data)
            this.state.streak = data.streak;
    }
    incrementStreakValue(n) {
        this.checkStreakIsLatest();
        this.setStreakValue(this.state.streak + n);
    }
    setStreakValue(streak) {
        this.checkStreakIsLatest();
        this.state.previous_streak = this.state.streak;
        this.state.streak = streak;
        if (this.state.streak !== 0) {
            this.state.streak_backup = this.state.streak;
        }
        this.saveState();
        this.updateStreakPanels();
    }
    setupKeyboardShortcuts() {
        let keys = this.options.keyboard_shortcuts;
        document.addEventListener('keypress', (e) => {
            if (!this.getRoundPanel() && !this.getSummaryPanel())
                return;
            switch (e.key) {
                case keys.reset:
                    this.setStreakValue(0);
                    break;
                case keys.increment:
                    this.incrementStreakValue(1);
                    break;
                case keys.decrement:
                    this.incrementStreakValue(-1);
                    break;
                case keys.restore:
                    this.setStreakValue(this.state.streak_backup + 1);
                    break;
            }
            ;
        });
    }
    checkState() {
        const gameLayout = document.querySelector('div[class^="in-game_root__"]');
        if (!gameLayout)
            return;
        const gameStatus = document.querySelector('div[class^="game_status__"]');
        const resultLayout = document.querySelector('div[class^="round-result_wrapper__"]');
        const finalScoreLayout = document.querySelector('div[class^="result-layout_root__"] div[class^="result-overlay_overlayContent__"]');
        const update_round = this.should_update_round_panel || !this.getRoundPanel();
        const update_summary = this.should_update_summary_panel || !this.getSummaryPanel();
        if (gameLayout) {
            if (gameStatus && update_round) {
                this.should_update_round_panel = false;
                this.updateRoundPanel();
            }
            else if ((resultLayout || finalScoreLayout) && update_summary) {
                this.should_update_summary_panel = false;
                this.updateSummaryPanel();
            }
        }
    }
}
(unsafeWindow || window)['GeoGuessrStreakFramework'] = GeoGuessrStreakFramework;
