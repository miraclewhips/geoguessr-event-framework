# GeoGuessr Event Framework

Basic event framework for GeoGuessr extensions.

## How to use it in your own Userscripts

You can add it to your own Userscript using the `@require` parameter in your UserScript info. Make sure to include the `@match`, `@run-at`, and `@grant` parameters as well.

Recommended UserScript manager is Violentmonkey. The event framework scripts no longer work in Tampermonkey after recent updates to the extension.

### Sample code

```javascript
// ==UserScript==
// ...
// @match        *://*.geoguessr.com/*
// @run-at       document-start
// @grant        none
// @require      https://miraclewhips.dev/geoguessr-event-framework/geoguessr-event-framework.min.js
// ...
// ==/UserScript==

GeoGuessrEventFramework.init().then((GEF) => {
  GEF.events.addEventListener('round_start', (event) => {
    console.log(event.detail);
  });
});
```

## Events

### `game_start`
- triggered at the start of round 1

### `game_end`
- triggered at the end of round 5

### `round_start`
- triggered at the start of every round

### `round_end`
- triggered at the end of every round

### Event Data

The current state of the game is included in the `detail` field of the event.
```typescript
{
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
  rounds: [{
    location: {
    	lat: number|undefined,
    	lng: number|undefined,
    	heading: number|undefined,
    	pitch: number|undefined,
    	zoom: number|undefined,
    	panoId: string|undefined,
    },
  	player_guess: {
    	lat: number|undefined,
    	lng: number|undefined,
    },
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
  }],
	map: {
		id: string,
		name: string,
	},
}
```

## Properties

### `events`
- Event object used to add/remove listeners

### `state`
- The current state of the game can be accessed at any time by referencing the `state` property

## Methods

### `init()`
- Returns a Promise that resolves once the framework has loaded and is ready to use
