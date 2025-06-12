declare var unsafeWindow: Window;
const THE_WINDOW: any = unsafeWindow || window;

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
	class GEF {
		public events = new EventTarget();
		public loadedPromise: Promise<this>;

		private state: GEF_State = this.defaultState();
	
		constructor() {
			this.loadState();
			this.initFetchEvents();
			this.overrideFetch();
			this.init();

			THE_WINDOW.addEventListener('load', () => {
				if(location.pathname.startsWith("/challenge/")) {
					const data = THE_WINDOW?.__NEXT_DATA__?.props?.pageProps?.gameSnapshot;
					if(!data || !data.round) return;

					THE_WINDOW.GEFFetchEvents.dispatchEvent(new CustomEvent('received_data', {detail: data}));
				}
			});

			THE_WINDOW.GEFFetchEvents.addEventListener('received_data', (event) => {
				this.parseData(event.detail);
			});
		}

		private initFetchEvents(): void {
			if(THE_WINDOW.GEFFetchEvents !== undefined) return;
			THE_WINDOW.GEFFetchEvents = new EventTarget();
		}

		private overrideFetch(): void {
			if(THE_WINDOW.fetch.isGEFFetch) return;

			const default_fetch = THE_WINDOW.fetch;
			THE_WINDOW.fetch = (function () {
				return async function (...args) {
					const url = args[0].toString();

					if(url.match(/geoguessr\.com\/api\/v3\/games$/) && args[1]?.method === "POST") {
						const result = await default_fetch.apply(THE_WINDOW, args);
						const data = await result.clone().json();
						if(!data.round) return result;
						
						THE_WINDOW.GEFFetchEvents.dispatchEvent(new CustomEvent('received_data', {detail: data}));

						return result;
					}

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
		}

		public async init(): Promise<this> {
			if(!this.loadedPromise) {
				this.loadedPromise = Promise.resolve(this);
			}

			return await this.loadedPromise;
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

		private parseData(data: any) {
			const finished = data.player.guesses.length == data.round;
			const isNewRound = data.round !== this.state.current_round;

			if(finished) {
				this.stopRound(data);
			}else if(isNewRound){
				this.startRound(data);
			}
		}

		private loadState(): void {
			let data = window.localStorage.getItem('GeoGuessrEventFramework_STATE');
			if(!data) return;
			
			let dataJson: GEF_State = JSON.parse(data);
			if(!dataJson) return;

			Object.assign(this.state, this.defaultState(), dataJson);
			this.saveState();
		}
	
		private saveState(): void {
			window.localStorage.setItem('GeoGuessrEventFramework_STATE', JSON.stringify(this.state));
		}

		private hex2a(hexx: string) {
			const hex = hexx.toString();//force conversion
			let str = '';
			for (let i = 0; i < hex.length; i += 2) {
				str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
			}
			return str;
		}
	
		private startRound(data: any): void {
			this.state.current_round = data.round;
			this.state.round_in_progress = true;
			this.state.game_in_progress = true;
			this.state.current_game_id = data.token;
			this.state.is_challenge_link = data.type == 'challenge';
			this.state.rounds = this.state.rounds.slice(0, data.round - 1);

			if(data) {
				this.state.map = {
					id: data.map,
					name: data.mapName
				}
			}

			this.saveState();

			if(this.state.current_round === 1) {
				this.events.dispatchEvent(new CustomEvent('game_start', {detail: this.state}));
			}
	
			this.events.dispatchEvent(new CustomEvent('round_start', {detail: this.state}));
		}
	
		private stopRound(data: any): void {
			this.state.round_in_progress = false;

			if(data) {
				const r = data.rounds[this.state.current_round-1];
				const g = data.player.guesses[this.state.current_round-1];

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
						panoId: r.panoId ? this.hex2a(r.panoId) : undefined,
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
					amount: parseFloat(data?.player?.totalScore?.amount) || 0,
					unit: data?.player?.totalScore?.unit || 'points',
					percentage: data?.player?.totalScore?.percentage || 0,
				}

				this.state.total_distance = {
					meters: {
						amount: parseFloat(data?.player?.totalDistance?.meters?.amount) || 0,
						unit: data?.player?.totalDistance?.meters?.unit || 'km',
					},
					miles: {
						amount: parseFloat(data?.player?.totalDistance?.miles?.amount) || 0,
						unit: data?.player?.totalDistance?.miles?.unit || 'miles',
					},
				}

				this.state.total_time = data?.player?.totalTime;

				this.state.map = {
					id: data.map,
					name: data.mapName
				}
			}
	
			this.saveState();
	
			this.events.dispatchEvent(new CustomEvent('round_end', {detail: this.state}));
	
			if(this.state.current_round === 5) {
				this.events.dispatchEvent(new CustomEvent('game_end', {detail: this.state}));
			}
		}
	}
	
	if(!THE_WINDOW['GeoGuessrEventFramework']) {
		THE_WINDOW['GeoGuessrEventFramework'] = new GEF();
		console.log('GeoGuessr Event Framework initialised: https://github.com/miraclewhips/geoguessr-event-framework');
	}
})();
