type GEF_State = {
	current_game_id: string | null,
	is_challenge_link: boolean,
	current_round: number|null,
	round_in_progress: boolean,
	game_in_progress: boolean,
}

class GeoGuessrEventFramework {
	private readonly STATE_DEFAULTS: GEF_State = {
		current_game_id: null,
		is_challenge_link: false,
		current_round: 0,
		round_in_progress: false,
		game_in_progress: true,
	} as const;

	private STATE: GEF_State = this.STATE_DEFAULTS;

	public events = new EventTarget();

	constructor() {
		this.loadState();
	
		let el = document.querySelector('#__next');
		if(!el) return;
		
		const observer = new MutationObserver(this.checkState.bind(this));
		observer.observe(el, { subtree: true, childList: true });
	}

	private loadState(): void {
		this.STATE = this.STATE_DEFAULTS;

		let data = window.localStorage.getItem('GeoGuessrEventFramework_STATE');
		if(!data) return;
		
		let dataJson: GEF_State = JSON.parse(data);
		if(!data) return;
	
		dataJson.current_round = 0;
		dataJson.round_in_progress = false;
		dataJson.game_in_progress = true;
	
		Object.assign(this.STATE, dataJson);
		this.saveState();
	}

	private saveState(): void {
		window.localStorage.setItem('GeoGuessrEventFramework_STATE', JSON.stringify(this.STATE));
	}
	
	private getCurrentRound(): number|null {
		const roundNode = document.querySelector('div[class^="status_inner__"]>div[data-qa="round-number"]');
		const text = roundNode?.children[1].textContent;
		if(!text) return null;

		return parseInt(text.split(/\//gi)[0].trim());
	}

	private getGameMode(): string|undefined {
		if(location.pathname.startsWith("/game/")) return 'game';
		if(location.pathname.startsWith("/challenge/")) return 'challenge';
		return undefined;
	}

	private getGameId(): string {
		return window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
	}

	private startRound(): void {
		if(!this.getGameMode()) return;

		this.STATE.current_round = this.getCurrentRound();
		this.STATE.round_in_progress = true;
		this.STATE.game_in_progress = true;
		this.STATE.current_game_id = this.getGameId();
		this.STATE.is_challenge_link = this.getGameMode() == 'challenge';
		this.saveState();

		if(this.STATE.current_round === 1) {
			this.events.dispatchEvent(new CustomEvent('game_start', {detail: this.STATE}));
		}

		this.events.dispatchEvent(new CustomEvent('round_start', {detail: this.STATE}));
	}

	private stopRound(): void {
		this.STATE.round_in_progress = false;
		this.saveState();

		this.events.dispatchEvent(new CustomEvent('round_end', {detail: this.STATE}));

		if(this.STATE.current_round === 5) {
			this.events.dispatchEvent(new CustomEvent('game_end', {detail: this.STATE}));
		}
	}

	private checkState(): void {
		const gameLayout = document.querySelector('.game-layout');
		const resultLayout = document.querySelector('div[class^="result-layout_root"]');
		const finalScoreLayout = document.querySelector('div[class^="result-layout_root"] div[class^="result-overlay_overlayContent__"]');
	
		if(gameLayout) {
			if (this.STATE.current_round !== this.getCurrentRound() || this.STATE.current_game_id !== this.getGameId()) {
				if(this.STATE.round_in_progress) {
					this.stopRound();
				}
	
				this.startRound();
			}else if(resultLayout && this.STATE.round_in_progress) {
				this.stopRound();
			}else if(finalScoreLayout && this.STATE.game_in_progress) {
				this.STATE.game_in_progress = false;
			}
		}
	}
}

window['GeoGuessrEventFramework'] = new GeoGuessrEventFramework();