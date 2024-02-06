declare var unsafeWindow: Window;
var THE_WINDOW = unsafeWindow || window;

type GeoRoundLocation = {
	lat: number|undefined,
	lng: number|undefined,
	heading: number|undefined,
	pitch: number|undefined,
	zoom: number|undefined,
	panoId: string|undefined,
};

type GeoPlayerGuess = {
	lat: number|undefined,
	lng: number|undefined,
}

type GEF_Round = {
	location: GeoRoundLocation,
	player_guess: GeoPlayerGuess,
	distance: {
		meters: {
			amount: number,
			unit: string,
		},
		miles: {
			amount: number,
			unit: string,
		}
	},
	score: {
		amount: number,
		unit: string,
		percentage: number
	},
	time: number,
};
	
type GEF_State = {
	current_game_id: string,
	is_challenge_link: boolean,
	current_round: number,
	round_in_progress: boolean,
	game_in_progress: boolean,
	total_distance: {
		meters: {
			amount: number,
			unit: string,
		},
		miles: {
			amount: number,
			unit: string,
		}
	},
	total_score: {
		amount: number,
		unit: string,
		percentage: number
	},
	total_time: number,
	rounds: Array<GEF_Round>,
	map: {
		id: string,
		name: string,
	},
}

(function() {
	let gApiData;
	const default_fetch = THE_WINDOW.fetch;
	THE_WINDOW.fetch = (function () {
			return async function (...args) {
					if(/geoguessr.com\/api\/v3\/(games|challenges)\//.test(args[0].toString())) {
						let result = await default_fetch.apply(THE_WINDOW, args);
						gApiData = await result.clone().json();
						return result;
					}

					return default_fetch.apply(THE_WINDOW, args);
			};
	})();

	function getGAPIData(state: GEF_State): any {
		if(gApiData && gApiData.round === state.current_round) {
			return gApiData;
		}

		return null;
	}

	function hex2a(hexx) {
		var hex = hexx.toString();//force conversion
		var str = '';
		for (var i = 0; i < hex.length; i += 2)
				str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
		return str;
	}
	
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
				total_score: {amount: 0, unit: 'points', percentage: 0},
				total_distance: {
					meters: {amount: 0, unit: 'km'},
					miles: {amount: 0, unit: 'miles'}
				},
				total_time: 0,
				rounds: [],
				map: {id: '', name: ''},
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

			let gData = getGAPIData(this.state);

			if(gData) {
				this.state.map = {
					id: gData.map,
					name: gData.mapName
				}
			}

			this.saveState();
	
			if(this.state.current_round === 1) {
				this.events.dispatchEvent(new CustomEvent('game_start', {detail: this.state}));
			}
	
			this.events.dispatchEvent(new CustomEvent('round_start', {detail: this.state}));
		}
	
		private async stopRound(): Promise<void> {
			this.state.round_in_progress = false;

			let gData = getGAPIData(this.state);

			if(gData) {
				const r = gData.rounds[this.state.current_round-1];
				const g = gData.player.guesses[this.state.current_round-1];

				if(!r || !g) {
					return;
				}
				
				this.state.rounds[this.state.current_round - 1] = {
					location: {
						lat: r.lat,
						lng: r.lng,
						heading: r.heading,
						pitch: r.pitch,
						zoom: r.zoom,
						panoId: r.panoId ? hex2a(r.panoId) : undefined,
					},
					player_guess: {
						lat: g.lat,
						lng: g.lng,
					},
					score: {
						amount: parseFloat(g?.roundScore?.amount) || 0,
						unit: g?.roundScore?.unit || 'points',
						percentage: g?.roundScore?.percentage || 0,
					},
					distance: {
						meters: {
							amount: parseFloat(g?.distance?.meters?.amount) || 0,
							unit: g?.distance?.meters?.unit || 'km',
						},
						miles: {
							amount: parseFloat(g?.distance?.miles?.amount) || 0,
							unit: g?.distance?.miles?.unit || 'miles',
						},
					},
					time: g?.time
				}

				this.state.total_score = {
					amount: parseFloat(gData?.player?.totalScore?.amount) || 0,
					unit: gData?.player?.totalScore?.unit || 'points',
					percentage: gData?.player?.totalScore?.percentage || 0,
				}

				this.state.total_distance = {
					meters: {
						amount: parseFloat(gData?.player?.totalDistance?.meters?.amount) || 0,
						unit: gData?.player?.totalDistance?.meters?.unit || 'km',
					},
					miles: {
						amount: parseFloat(gData?.player?.totalDistance?.miles?.amount) || 0,
						unit: gData?.player?.totalDistance?.miles?.unit || 'miles',
					},
				}

				this.state.total_time = gData?.player?.totalTime;

				this.state.map = {
					id: gData.map,
					name: gData.mapName
				}
			}
	
			this.saveState();
	
			this.events.dispatchEvent(new CustomEvent('round_end', {detail: this.state}));
	
			if(this.state.current_round === 5) {
				this.events.dispatchEvent(new CustomEvent('game_end', {detail: this.state}));
			}
		}
	
		private checkState(): void {
			const gameLayout = document.querySelector('div[class^="in-game_root__"]');
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
	
	if(!THE_WINDOW['GeoGuessrEventFramework']) {
		THE_WINDOW['GeoGuessrEventFramework'] = new GEF();
		console.log('GeoGuessr Event Framework initialised: https://github.com/miraclewhips/geoguessr-event-framework');
	}
})();