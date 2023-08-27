type LatLng = {lat: number|null, lng: number|null};

type GEF_Round = {
	score: number,
	location: LatLng,
	player_guess: LatLng,
};
	
type GEF_State = {
	current_game_id: string,
	is_challenge_link: boolean,
	current_round: number,
	round_in_progress: boolean,
	game_in_progress: boolean,
	total_score: number,
	rounds: Array<GEF_Round>,
}

var GeoGuessrEventFramework;

(function() {
	let GEF_SV, GEF_M;
	let gmLoadPromise: Promise<void>;
	let gmLatLngPrev: LatLng;
	let gmLatLng: LatLng;
	
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
		}
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

	function getPos(): LatLng {
		const pos = GEF_SV.getPosition();
		return {lat: pos.lat(), lng: pos.lng()};
	}

	async function getSVLatLng(): Promise<LatLng> {
		await gmLoadPromise;
		if(!GEF_SV) return {lat: null, lng: null};
		await sleep(100);

		return new Promise<LatLng>((resolve) => {
			if(!gmLatLngPrev) {
				const pos = getPos();
				gmLatLngPrev = pos;
				resolve(pos);
			}else{
				let listener = window['google'].maps.event.addListener(GEF_SV, 'status_changed', () => {
					const pos = getPos();

					if(gmLatLngPrev.lat != pos.lat && gmLatLngPrev.lng != pos.lng) {
						window['google'].maps.event.removeListener(listener);
						gmLatLngPrev = pos;
						resolve(pos);
					}
				});
			}
		});
	}

	gmLoadPromise = new Promise((resolve, reject) => {
		document.addEventListener('DOMContentLoaded', () => {
			injecter(() => {
				if(!window['google']) return reject();

				const promiseList: Promise<void>[] = [];
				
				promiseList.push(new Promise((resolve) => {
					window['google'].maps.StreetViewPanorama = class extends window['google'].maps.StreetViewPanorama {
						constructor(...args) {
							super(...args);
							GEF_SV = this;
							resolve();
						}
					}
				}));
	
				promiseList.push(new Promise((resolve) => {
					window['google'].maps.Map = class extends window['google'].maps.Map {
						constructor(...args) {
							super(...args);
							GEF_M = this;
							resolve();
						}
					}
				}));

				Promise.all(promiseList).then(() => {
					return resolve();
				});
			});
		});
	});
	
	class GEF {
		public events = new EventTarget();
		public loadedPromise: Promise<this>;

		private state: GEF_State = this.defaultState();
	
		constructor() {
			this.init();
			this.loadState();
		
			let el = document.querySelector('#__next');
			if(!el) return;
			
			const observer = new MutationObserver(this.checkState.bind(this));
			observer.observe(el, { subtree: true, childList: true });

			gmLoadPromise.then(() => {
				GEF_M.addListener('click', (e) => {
					if(!this.state.current_round || !this.state.round_in_progress) return;

					this.state.rounds[this.state.current_round-1].player_guess = {
						lat: e.latLng.lat(),
						lng: e.latLng.lng()
					};
				});
			});
		}

		public async init(): Promise<this> {
			if(!this.loadedPromise) {
				this.loadedPromise = Promise.resolve(this);
			}

			return this.loadedPromise;
		}
	
		private defaultState(): GEF_State {
			return {
				current_game_id: '',
				is_challenge_link: false,
				current_round: 0,
				round_in_progress: false,
				game_in_progress: true,
				total_score: 0,
				rounds: [],
			}
		}
	
		private loadState(): void {
			let data = window.localStorage.getItem('GeoGuessrEventFramework_STATE');
			if(!data) return;
			
			let dataJson: GEF_State = JSON.parse(data);
			if(!data) return;
		
			dataJson.current_round = 0;
			dataJson.round_in_progress = false;
			dataJson.game_in_progress = true;
		
			Object.assign(this.state, this.defaultState(), dataJson);
			this.saveState();
		}
	
		private saveState(): void {
			window.localStorage.setItem('GeoGuessrEventFramework_STATE', JSON.stringify(this.state));
		}
		
		private getCurrentRound(): number {
			const roundNode = document.querySelector('div[class^="status_inner__"]>div[data-qa="round-number"]');
			const text = roundNode?.children[1].textContent;
			if(!text) return 0;
	
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
	
		private async startRound(): Promise<void> {
			if(!this.getGameMode()) return;

			// if game ID has changed just reset the state
			if(this.state.current_game_id !== this.getGameId()) {
				this.state = this.defaultState();
			}
	
			this.state.current_round = this.getCurrentRound();
			this.state.round_in_progress = true;
			this.state.game_in_progress = true;
			this.state.current_game_id = this.getGameId();
			this.state.is_challenge_link = this.getGameMode() == 'challenge';

			if(this.state.current_round) {
				this.state.rounds[this.state.current_round - 1] = {
					score: 0,
					location: {lat: null, lng: null},
					player_guess: {lat: null, lng: null}
				};
			}

			this.saveState();
	
			if(this.state.current_round === 1) {
				this.events.dispatchEvent(new CustomEvent('game_start', {detail: this.state}));
			}
	
			this.events.dispatchEvent(new CustomEvent('round_start', {detail: this.state}));

			getSVLatLng().then((latlng) => {
				gmLatLng = latlng;
			});
		}
	
		private async stopRound(): Promise<void> {
			this.state.round_in_progress = false;
	
			// sleep for 1ms to give the score element a chance to display the round score
			await sleep(1);
	
			const score = document.querySelector(`div[class^="round-result_pointsIndicatorWrapper__"] div[class^="shadow-text_root__"]`)?.textContent;
	
			if(score) {
				const scoreInt = parseInt(score.replace(/[^\d]/g, ''));
	
				if(!isNaN(scoreInt) && this.state.current_round) {
					this.state.rounds[this.state.current_round-1].score = scoreInt;
				}
			}
	
			this.state.total_score = this.state.rounds.reduce((a, b) => a += b.score, 0);

			if(this.state.current_round && gmLatLng) {
				this.state.rounds[this.state.current_round-1].location = gmLatLng;
			}
	
			this.saveState();
	
			this.events.dispatchEvent(new CustomEvent('round_end', {detail: this.state}));
	
			if(this.state.current_round === 5) {
				this.events.dispatchEvent(new CustomEvent('game_end', {detail: this.state}));
			}
		}
	
		private checkState(): void {
			const gameLayout = document.querySelector('.game-layout');
			const resultLayout = document.querySelector('div[class^="round-result_wrapper__"]');
			const finalScoreLayout = document.querySelector('div[class^="result-layout_root__"] div[class^="result-overlay_overlayContent__"]');
		
			if(gameLayout) {
				if (this.state.current_round !== this.getCurrentRound() || this.state.current_game_id !== this.getGameId()) {
					if(this.state.round_in_progress) {
						this.stopRound();
					}
		
					this.startRound();
				}else if(resultLayout && this.state.round_in_progress) {
					this.stopRound();
				}else if(finalScoreLayout && this.state.game_in_progress) {
					this.state.game_in_progress = false;
				}
			}
		}
	}
	
	GeoGuessrEventFramework = new GEF();
	console.log('GeoGuessr Event Framework initialised: https://github.com/miraclewhips/geoguessr-event-framework');
})();