class GeoGuessrEventFramework {
    constructor() {
        this.STATE_DEFAULTS = {
            current_game_id: null,
            is_challenge_link: false,
            current_round: 0,
            round_in_progress: false,
            game_in_progress: true,
        };
        this.STATE = this.STATE_DEFAULTS;
        this.events = new EventTarget();
        this.loadState();
        let el = document.querySelector('#__next');
        if (!el)
            return;
        const observer = new MutationObserver(this.checkState.bind(this));
        observer.observe(el, { subtree: true, childList: true });
    }
    loadState() {
        this.STATE = this.STATE_DEFAULTS;
        let data = window.localStorage.getItem('GeoGuessrEventFramework_STATE');
        if (!data)
            return;
        let dataJson = JSON.parse(data);
        if (!data)
            return;
        dataJson.current_round = 0;
        dataJson.round_in_progress = false;
        dataJson.game_in_progress = true;
        Object.assign(this.STATE, dataJson);
        this.saveState();
    }
    saveState() {
        window.localStorage.setItem('GeoGuessrEventFramework_STATE', JSON.stringify(this.STATE));
    }
    getCurrentRound() {
        const roundNode = document.querySelector('div[class^="status_inner__"]>div[data-qa="round-number"]');
        const text = roundNode === null || roundNode === void 0 ? void 0 : roundNode.children[1].textContent;
        if (!text)
            return null;
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
        if (!this.getGameMode())
            return;
        this.STATE.current_round = this.getCurrentRound();
        this.STATE.round_in_progress = true;
        this.STATE.game_in_progress = true;
        this.STATE.current_game_id = this.getGameId();
        this.STATE.is_challenge_link = this.getGameMode() == 'challenge';
        this.saveState();
        this.events.dispatchEvent(new CustomEvent('round_start', { detail: this.STATE }));
    }
    stopRound() {
        this.STATE.round_in_progress = false;
        this.saveState();
    }
    checkState() {
        const gameLayout = document.querySelector('.game-layout');
        const resultLayout = document.querySelector('div[class^="result-layout_root"]');
        const finalScoreLayout = document.querySelector('div[class^="result-layout_root"] div[class^="result-overlay_overlayContent__"]');
        if (gameLayout) {
            if (this.STATE.current_round !== this.getCurrentRound() || this.STATE.current_game_id !== this.getGameId()) {
                if (this.STATE.round_in_progress) {
                    this.stopRound();
                }
                this.startRound();
            }
            else if (resultLayout && this.STATE.round_in_progress) {
                this.stopRound();
            }
            else if (finalScoreLayout && this.STATE.game_in_progress) {
                this.STATE.game_in_progress = false;
            }
        }
    }
}
window['GeoGuessrEventFramework'] = new GeoGuessrEventFramework();
