// Season 35 cast, preloaded. Ids are stable slugs so exported backups stay
// readable and survive a roster edit upstream.
export const SEASON_NUMBER = 35

export const REGULAR_JUDGES = ['Carrie Ann Inaba', 'Derek Hough', 'Bruno Tonioli']

export const DEFAULT_TOTAL_WEEKS = 12

const CAST = [
  ['tatyana-ali', 'Tatyana Ali', 'Jan Ravnik'],
  ['tyler-cameron', 'Tyler Cameron', 'Sharna Burgess'],
  ['giada-de-laurentiis', 'Giada De Laurentiis', 'Alan Bersten'],
  ['jenna-dewan', 'Jenna Dewan', 'Val Chmerkovskiy'],
  ['ezra-frech', 'Ezra Frech', 'Daniella Karagach'],
  ['amber-glenn', 'Amber Glenn', 'Pasha Pashkov'],
  ['maura-higgins', 'Maura Higgins', 'Mark Ballas'],
  ['conner-leavitt', 'Conner Leavitt', 'Adele Zaikman'],
  ['ciara-miller', 'Ciara Miller', 'Brandon Armstrong'],
  ['sarah-jane-nader', 'Sarah Jane Nader', 'Hailey Bills'],
  ['jackson-olson', 'Jackson Olson', 'Emma Slater'],
  ['guillermo-rodriguez', 'Guillermo Rodriguez', 'Witney Carson'],
  ['harry-shum-jr', 'Harry Shum Jr.', 'Jenna Johnson'],
  ['julia-stiles', 'Julia Stiles', 'Ezra Sosa'],
  ['connor-wood', 'Connor Wood', 'Rylee Arnold'],
]

export function buildRoster() {
  return CAST.map(([id, celebrityName, proName]) => ({
    id,
    celebrityName,
    proName,
    eliminated: false,
    eliminatedWeek: null,
  }))
}

// Offered in the dance-style field as suggestions; she can type anything else.
export const DANCE_STYLES = [
  'Cha Cha', 'Salsa', 'Samba', 'Rumba', 'Jive', 'Paso Doble', 'Mambo',
  'Argentine Tango', 'Tango', 'Viennese Waltz', 'Waltz', 'Foxtrot', 'Quickstep',
  'Contemporary', 'Jazz', 'Charleston', 'Broadway/Theater', 'Hip Hop',
  'Freestyle', 'Afro Jazz', 'Bolero', 'Lindy Hop', 'Cumbia', 'Salsa Fusion',
]
