# GeoGuessr Streak Framework

Framework to manage different types of streaks in GeoGuessr. Used in conjunction with the Event Framework.

## How to use it in your own Userscripts

You can add it to your own Userscript using the `@require` parameter in your UserScript info. Make sure to include the `@match`, `@run-at`, and `@grant` parameters as well, as well as the `@require` tag with the Event Framework.

### Sample code

```javascript
// ==UserScript==
// ...
// @match        *://*.geoguessr.com/*
// @run-at       document-start
// @grant        none
// @require      https://miraclewhips.dev/geoguessr-event-framework/geoguessr-event-framework.min.js
// @require      https://miraclewhips.dev/geoguessr-event-framework/geoguessr-streak-framework.min.js
// ...
// ==/UserScript==

const GSF = new GeoGuessrStreakFramework({
  storage_identifier: 'MyCountryStreakScript',
  name: 'Country Streak',
  terms: {
    single: 'country',
    plural: 'countries'
  },
  enabled_on_challenges: true,
  automatic: true,
  language: 'en',
  only_match_country_code: true,
  address_matches: ['country']
});
```

## Options

```typescript
{
  storage_identifier: string,
  name: string,
  terms: {
    single: string,
    plural: string
  },
  enabled_on_challenges: boolean,
  automatic: boolean,
  language: string,
  streak_type: string,
  only_match_country_code: boolean,
  query_openstreetmap: boolean,
  address_matches?: string[],
  custom_match_function?: Function,
  keyboard_shortcuts: {reset: string, increment: string, decrement: string, restore: string},
}
```

### `storage_identifier: string`
default: `'geoguessr-streak-framework'`
- Identifier used for the streak script when adding elements to the page and saving streak data to localStorage (must be unique or else it will clash with other streak scripts with the same ID).

### `name: string`
default: `'Country Streak'`
- Name displayed in the UI when showing the streak count.

### `terms.single: string`
default: `'country'`
- Name used when describing the streak in the singular (i.e "country").

### `terms.plural: string`
default: `'countries'`
- Name used when describing the streak in the plural (i.e "countries").

### `enabled_on_challenges: boolean`
default: `true`
- Whether or not to track streaks when the user is playing challenge links.

### `automatic: boolean`
default: `true`
- Whether or not to automatically increment the streak after each round (if disabled the user must manually use the keyboard shortcuts to adjust the streak).

### `lanuage: string`
default: `'en'`
- Language that OpenStreetMap results are returned in. Uses an [ISO 639-1 lanugage code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes).

### `streak_type: string`
default: `'round'`
- `round` or `game`. Whether or not the streak should be checked every round or at the end of every game. `game` option is best used in conjunction with a `custom_match_function`.

### `only_match_country_code: boolean`
default: `true`
- Marks the streak as correct if the country codes match but the names don't (useful for countries with overseas territories like Denmark including Greenland as a correct country streak).

### `query_openstreetmap: boolean`
default: `true`
- Whether or not to query OpenStreetMap, or to just return the Lat/Lng coordinates. If it's set to `false` you must provide a `custom_match_function`.

### `address_matches: string[]`
default: `['country']`
- List of properties to check for in the OpenStreetMap `address` object. Returns first match when iterating through the list (or `"Undefined"` if there are no matches). Since every country is different adding multiple fields to check, for example `['state', 'territory', 'province', 'county', 'municipality', 'ISO3166-2-lvl4']` for a state streak, will ensure that most/all countries will be supported in the streak.

### `custom_match_function: Function`
default: `undefined`
- Instead of using the `address_matches` property you can provide a custom function that you can write to do your own matching:
```javascript
function custom_match_function(state, player_guess, actual_location) {
  return {
    player_guess_name: string|null, // name of the location that the player guessed
    actual_location_name: string|null, // name of the actual location
    match: boolean // if the streak is correct or not
  }
}
```
  - `state` returns the state of the game from the `GeoGuessrEventFramework`.
  - If `query_openstreetmap` is `true`:
    - `player_guess` and `actual_location` are OpenStreetMap API JSON data types.
  - If `query_openstreetmap` is `false`:
    - `player_guess` and `actual_location` are `{lat: number, lng: number}` types.

### `keyboard_shortcuts: {reset: string, increment: string, decrement: string, restore: string}`
default: `{reset: '0', increment: '1', decrement: '2', restore: '8'}`
  - `reset`: resets the streak counter to 0
  - `increment`: increments the streak counter by 1
  - `decrement`: decrements the streak counter by 1
  - `restore`: restores the streak counter to it's previous value

## OpenStreetMap API JSON

The JSON data returned from the OpenStreetMap API is in the following format. Note: different coordinates contain different fields based on the data that is stored on OpenStreetMap. You can use [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/ui/reverse.html?lat=-43.53097&lon=172.63691&zoom=18) to see what data is returned for specific coordinates.

### Example request
https://nominatim.openstreetmap.org/reverse.php?lat=-43.53097&lon=172.63691&zoom=18&format=jsonv2
```json
{
  "place_id": 127524196,
  "licence": "Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright",
  "osm_type": "way",
  "osm_id": 92830194,
  "lat": "-43.53123735",
  "lon": "172.63708658542484",
  "category": "amenity",
  "type": "grave_yard",
  "place_rank": 30,
  "importance": 0.00000999999999995449,
  "addresstype": "amenity",
  "name": "ChristChurch Cathedral Columbarium",
  "display_name": "ChristChurch Cathedral Columbarium, Cathedral Square, Central City, Linwood-Central-Heathcote Community, Christchurch City, Canterbury, 8011, New Zealand",
  "address": {
    "amenity": "ChristChurch Cathedral Columbarium",
    "road": "Cathedral Square",
    "suburb": "Central City",
    "city": "Linwood-Central-Heathcote Community",
    "county": "Christchurch City",
    "state": "Canterbury",
    "ISO3166-2-lvl4": "NZ-CAN",
    "postcode": "8011",
    "country": "New Zealand",
    "country_code": "nz"
  },
  "boundingbox": [
    "-43.5312468",
    "-43.5312278",
    "172.6370436",
    "172.6371329"
  ]
}
```