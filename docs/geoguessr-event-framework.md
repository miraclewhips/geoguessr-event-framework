# GeoGuessr Event Framework

Basic event framework for GeoGuessr extensions.

## How to use it in your own Userscripts

You can add it to your own Userscript using the `@require` parameter in your UserScript info. Make sure to include the `@match`, `@run-at`, and `@grant` parameters as well.

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

#### `game_start`
- triggered at the start of round 1

#### `game_end`
- triggered at the end of round 5

#### `round_start`
- triggered at the start of every round

#### `round_end`
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
  total_score: number,
  rounds: [{
    score: number,
    location: {lat: number, lng: number},
    player_guess: {lat: number, lng: number},
  }],
}
```

## Properties

#### `events`
- Event object used to add/remove listeners

#### `state`
- The current state of the game can be accessed at any time by referencing the `state` property

## Methods

#### `init()`
- Returns a Promise that resolves once the framework has loaded and is ready to use