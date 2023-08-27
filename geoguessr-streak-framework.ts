declare var GeoGuessrEventFramework;

type GSF_State = {
	checking_api: boolean,
	streak: number,
	previous_streak: number,
	streak_backup: number,
	guess_name: string|null,
	location_name: string|null,
	last_guess_identifier: string|null
}

type GSF_Options = {
	storage_identifier: string,
	name: string,
	terms: {single: string, plural: string},
	enabled_on_challenges: boolean,
	automatic: boolean,
	language: string,
	only_match_country_code: boolean,
	address_matches?: string[],
	custom_match_function?: Function,
	query_openstreetmap: boolean,
}

const CC_DICT = {"AX":"FI","AS":"US","AI":"GB","AW":"NL","BM":"GB","BQ":"NL","BV":"NO","IO":"GB","KY":"UK","CX":"AU","CC":"AU","CK":"NZ","CW":"NL","FK":"GB","FO":"DK","GF":"FR","PF":"FR","TF":"FR","GI":"UK","GL":"DK","GP":"FR","GU":"US","GG":"GB","HM":"AU","HK":"CN","IM":"GB","JE":"GB","MO":"CN","MQ":"FR","YT":"FR","MS":"GB","AN":"NL","NC":"FR","NU":"NZ","NF":"AU","MP":"US","PS":"IL","PN":"GB","PR":"US","RE":"FR","BL":"FR","SH":"GB","MF":"FR","PM":"FR","SX":"NL","GS":"GB","SJ":"NO","TK":"NZ","TC":"GB","UM":"US","VG":"GB","VI":"US","WF":"FR","EH":"MA"};

class GeoGuessrStreakFramework {
	public events = new EventTarget();

	private state: GSF_State = this.defaultState();

	constructor(private options: GSF_Options) {
		if(typeof this.options.storage_identifier === 'string') {
			this.options.storage_identifier = this.options.storage_identifier.replace(/[^\w\d-_]/g, '');
	
			if(this.options.storage_identifier.length == 0) {
				throw new Error(`'storage_identifier' must not be blank and can only contain letters, digits, underscores, and hyphens.`)
			}
		}

		const defaults: GSF_Options = {
			storage_identifier: 'geoguessr-streak-framework',
			name: 'Country Streak',
			terms: {
				single: 'country',
				plural: 'countries'
			},
			enabled_on_challenges: true,
			automatic: true,
			language: 'en',
			only_match_country_code: true,
			address_matches: ['country'],
			query_openstreetmap: true,
		};

		this.options = Object.assign(defaults, this.options);

		this.loadState();
		this.setupKeyboardShortcuts();
		window.addEventListener('load', this.updateStreakPanels.bind(this));

		if(!GeoGuessrEventFramework) {
			throw new Error('GeoGuessr Streak Framework requires GeoGuessr Event Framework (https://github.com/miraclewhips/geoguessr-event-framework). Please include this before you include GeoGuessr Streak Framework.');
		}

		GeoGuessrEventFramework.init().then(GEF => {
			GEF.events.addEventListener('round_start', (event) => {
				console.log(`round ${event.detail.current_round} started`, event.detail);
				this.updateRoundPanel();
			});
		
			GEF.events.addEventListener('round_end', (event) => {
				console.log(`round ${event.detail.current_round} ended`, event.detail);
				this.stopRound(event.detail);
			});
		});
	}

	private defaultState(): GSF_State {
		return {
			checking_api: false,
			streak: 0,
			previous_streak: 0,
			streak_backup: 0,
			guess_name: null,
			location_name: null,
			last_guess_identifier: null
		}
	}

	private loadState(): void {
		this.state = this.defaultState();

		let loadedState = JSON.parse(window.localStorage.getItem(this.options.storage_identifier));

		if(loadedState) {
			loadedState.checking_api = false;
			Object.assign(this.state, loadedState);
			this.saveState();
		}
	}

	private saveState(): void {
		window.localStorage.setItem(this.options.storage_identifier, JSON.stringify(this.state));
	}

	private getRoundPanel(): HTMLElement {
		return document.getElementById(`streak-counter-panel-${this.options.storage_identifier}`);
	}
	
	private getSummaryPanel(): HTMLElement {
		return document.getElementById(`streak-score-panel-summary-${this.options.storage_identifier}`);
	}

	private updateRoundPanel(): void {
		let panel = this.getRoundPanel();
	
		if(!panel) {
			let gameScore = document.querySelector('.game-layout__status div[class^="status_section"][data-qa="score"]');
	
			if(gameScore) {
				let panel = document.createElement('div');
				panel.id = `streak-counter-panel-${this.options.storage_identifier}`;
				panel.style.display = 'flex';
	
				let classLabel = gameScore.querySelector('div[class^="status_label"]').className;
				let valueLabel = gameScore.querySelector('div[class^="status_value"]').className;
	
				panel.innerHTML = `
					<div class="${gameScore.getAttribute('class')}">
						<div class="${classLabel}">${this.options.name.toUpperCase()}</div>
						<div id="streak-counter-value-${this.options.storage_identifier}" class="${valueLabel}"></div>
					</div>
				`;
	
				gameScore.parentNode.append(panel);
			}
		}
		
		let streak = document.getElementById(`streak-counter-value-${this.options.storage_identifier}`);
	
		if(streak) {
			streak.innerText = this.state.streak.toString();
		}
	}
	
	private createStreakText(): string {
		if(this.state.checking_api) {
			return `Loading...`;
		}
	
		if(this.state.streak > 0) {
			return `It was <span style="color:#6cb928">${this.state.location_name}!</span> ${this.options.name}: <span style="color:#fecd19">${this.state.streak}</span>`;
		}else{
			let suffix = `${this.options.terms.plural} in a row.`;
	
			switch(this.state.previous_streak) {
				case 1:
					suffix = `${this.options.terms.single}.`;
			}
	
			let previousGuessText = `You didn't make a guess.`;
	
			if(this.state.guess_name) {
				previousGuessText = `You guessed <span style="color:#f95252">${this.state.guess_name}</span>, unfortunately it was <span style="color:#6cb928">${this.state.location_name}</span>.`;
			}
	
			return `${previousGuessText} Your streak ended after correctly guessing <span style="color:#fecd19">${this.state.previous_streak}</span> ${suffix}`;
		}
	}
	
	private createStreakElement(): HTMLDivElement {
		let score = document.createElement('div');
		score.style.fontSize = '18px';
		score.style.fontWeight = '500';
		score.style.color = '#fff';
		score.style.padding = '10px';
		score.style.paddingBottom = '0';
		score.style.position = 'absolute';
		score.style.bottom = '100%';
		score.style.width = '100%';
		score.style.background = 'var(--ds-color-purple-100)';
		return score;
	}
	
	private updateSummaryPanel(): void {
		const scoreLayout = document.querySelector('div[class^="result-layout_root"] div[class^="round-result_wrapper__"]');
	
		if(scoreLayout) {
			let panel = this.getSummaryPanel();
	
			if(!panel) {
				panel = this.createStreakElement();
				panel.id = `streak-score-panel-summary-${this.options.storage_identifier}`;
				scoreLayout.parentNode.insertBefore(panel, scoreLayout);
			}
	
			panel.innerHTML = this.createStreakText();
		}
	}
	
	private updateStreakPanels(): void {
		this.updateRoundPanel();
		this.updateSummaryPanel();
	}
	
	private async queryOSM(location: {lat: number|null, lng: number|null}): Promise<any> {
		let apiUrl = `https://nominatim.openstreetmap.org/reverse.php?lat=${location.lat}&lon=${location.lng}&zoom=18&format=jsonv2&accept-language=${this.options.language}`;
	
		return await fetch(apiUrl).then(res => res.json());
	}
	
	private isAutoStreakDisabled(eventState): boolean {
		return (!this.options.automatic || (eventState.is_challenge_link && !this.options.enabled_on_challenges));
	}

	private matchCountryCode(address: any): string|null {
		let cc = address?.country_code?.toUpperCase();
		if(!cc) return null;
		return CC_DICT[cc] || cc;
	}

	private matchAddress(address: any): string {
		if(address && this.options.address_matches && this.options.address_matches.length > 0) {
			for(let match of this.options.address_matches) {
				if(address[match]) return address[match];
			}
		}

		return 'Undefined';
	}

	private async stopRound(eventState): Promise<void> {
		if(this.isAutoStreakDisabled(eventState)) return;
	
		this.updateStreakPanels();
	
		const round = eventState.rounds[eventState.current_round-1];
	
		const guessIdentifier = `${eventState.current_game_id}-${eventState.current_round}`;
		if(guessIdentifier == this.state.last_guess_identifier) {
			this.updateStreakPanels();
			return;
		}
	
		this.state.last_guess_identifier = guessIdentifier;
	
		if(
			round.location.lat == null ||
			round.location.lng == null ||
			round.player_guess.lat == null ||
			round.player_guess.lng == null
		) {
			this.state.guess_name = null;
			this.state.location_name = null;
			this.setStreakValue(0);
			return;
		}
	
		let doesMatch = false;
		
		if(this.options.query_openstreetmap) {
			this.state.checking_api = true;
			this.updateStreakPanels();
			const responseGuess = await this.queryOSM(round.player_guess);
			const responseLocation = await this.queryOSM(round.location);
			this.state.checking_api = false;
		
			if(this.options.custom_match_function) {
				let matchResult = this.options.custom_match_function(responseGuess, responseLocation);
				this.state.guess_name = matchResult.guess_name;
				this.state.location_name = matchResult.location_name;
				doesMatch = matchResult.guess_name == matchResult.location_name;
			}else{
				const guessCC = this.matchCountryCode(responseGuess?.address);
				const locationCC = this.matchCountryCode(responseLocation?.address);
	
				this.state.guess_name = this.matchAddress(responseGuess?.address);
				this.state.location_name = this.matchAddress(responseLocation?.address);
				
				const countryCodeMatches = guessCC && locationCC && guessCC === locationCC;
				const nameMatches = this.state.guess_name === this.state.location_name;
				doesMatch = countryCodeMatches && (nameMatches || this.options.only_match_country_code);
			}
		}else{
			doesMatch = this.options.custom_match_function(round.player_guess, round.location);
		}
	
		if (doesMatch) {
			this.incrementStreakValue(1);
		} else {
			this.setStreakValue(0);
		}
	}

	private checkStreakIsLatest(): void {
		let data = JSON.parse(window.localStorage.getItem(this.options.storage_identifier));
		if(data) this.state.streak = data.streak;
	}

	private incrementStreakValue(n: number): void {
		this.checkStreakIsLatest();

		this.setStreakValue(this.state.streak + n)
	}
	
	private setStreakValue(streak: number): void {
		this.checkStreakIsLatest();
	
		this.state.previous_streak = this.state.streak;
		this.state.streak = streak;
	
		if(this.state.streak !== 0) {
			this.state.streak_backup = this.state.streak;
		}
	
		this.saveState();
		this.updateStreakPanels();
	}

	private setupKeyboardShortcuts(): void {
		document.addEventListener('keypress', (e) => {
			if(!this.getRoundPanel() && !this.getSummaryPanel()) return;
		
			switch(e.key) {
				case '1':
					this.incrementStreakValue(1);
					break;
				case '2':
					this.incrementStreakValue(-1);
					break;
				case '8':
					this.setStreakValue(this.state.streak_backup);
					break;
				case '0':
					if(this.state.streak !== 0) {
						this.state.streak_backup = this.state.streak;
					}
					this.setStreakValue(0);
					break;
			};
		});
	}
}