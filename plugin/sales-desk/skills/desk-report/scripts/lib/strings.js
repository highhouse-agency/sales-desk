// Every reader-facing string in the report system lives here, so a copy pass
// edits one file. Data values (status keys, event names, stage names) are not
// copy; the maps below turn them into displayed labels.
//
// Placeholders use {name}. No middle dots and no em dashes in any string.

export const S = {
  trainingLabel: 'Training data, invented',
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  location: 'Rinconada, Puerto Escondido',
  usd: 'USD',

  nav: {
    label: 'Reports',
  },

  reports: {
    'source-to-sale': { title: 'Source to sale', short: 'Sources' },
    'closed-lost': { title: 'Closed Lost Insights', short: 'Closed Lost Insights' },
    'buyer-segments': { title: 'Buyer Segment Insights', short: 'Segments' },
    'sales-pulse': { title: 'Sales pulse', short: 'Pulse' },
    'demand-and-ads': { title: 'Demand and ads', short: 'Demand' },
    'partner-network': { title: 'Partner network', short: 'Partners' },
    'unit-interest': { title: 'Unit interest', short: 'Units' },
    'owner-brief': { title: 'Owner brief', short: 'Owner' },
    'buyer-brief': { title: 'Buyer brief', short: 'Buyer' },
    'custom.spend-vs-closings': { title: 'Ad spend against closed deals by partner', short: 'Ad spend' },
  },
  revenue: {
    summary: { 'source-to-sale': 'Which sources bring buyers through to a sale.', 'closed-lost': 'Why buyers stopped and how far they reached.', 'buyer-segments': 'How buyer types move toward a purchase.' },
    col: { source: 'Source', reason: 'Reason', segment: 'Buyer type', buyers: 'Buyers in', active: 'Active buyers', tours: 'Tours', reservations: 'Reservations', closed: 'Closed', lead_to_tour: 'Tour rate', tour_to_reservation: 'Reservation rate', velocity: 'Median days', stages: 'Stage reached', sources: 'Top sources', credit: 'Sale credit' },
    dash: '-', buyers: 'Buyers', lost: 'Lost', onHold: 'On hold', topReason: 'Top reason', periods: { all: 'All time', '30': '30 days', '90': '90 days', year: 'This year' }, more: 'More', all: 'All types', from: 'From', through: 'Through', allDates: 'All dates', disputed: 'Disputed', empty: 'No buyers',
    reason: { price: 'Price', timing: 'Timing', financing: 'Financing', location: 'Location', 'chose another property': 'Another property', unresponsive: 'Unresponsive', other: 'Other', unknown: 'Not recorded' },
    segment: { investor: 'Investor', 'second home': 'Second home', mix: 'Mix', other: 'Other', unknown: 'Not recorded' },
  },
  asOf: 'As of {datetime}, {tz}',
  coverageLine: 'Sheet through {sheet}. Campaigns through {campaigns}.',
  staleBanner: 'No refresh in {hours} hours. Figures are as of {datetime}.',
  firstRun: 'No previous report for comparison.',
  comparing: 'Compared with the report as of {previous}. This report is as of {current}.',
  recordsNeedCheck: 'Records to check',
  periodRange: '{start} to {end}',
  currentState: 'Current state',

  filters: {
    empty: 'No records match these filters.',
    status: 'Status',
    disputedYes: 'Disputed',
    sort: 'Sort order',
    period: 'Period',
  },
  floors: { ground: 'Ground', first: 'First', second: 'Second', null: 'Location not supplied' },
  building: 'Building {n}',
  locationNotSupplied: 'Location not supplied',

  status: {
    available: 'Available',
    held: 'Held',
    'investor held': 'Investor held',
    reserved: 'Reserved',
    'promesa signed': 'Promesa signed',
    sold: 'Sold',
    sold_before_tracking: 'Sold before tracking',
  },

  stage: {
    lead: 'Lead',
    'contact and discovery': 'Contact and discovery',
    presentation: 'Presentation',
    tour: 'Tour',
    'unit selection': 'Unit selection',
    reservation: 'Reservation',
    'under contract': 'Under contract',
    closed: 'Closed and owner handoff',
    'on hold': 'On hold',
    'long-term nurture': 'Long-term nurture',
    lost: 'Lost',
    unknown: 'Stage not recorded',
  },
  overrideNote: 'Manual override; recorded stage: {derived}.',
  activity: { active: 'Recent contact', warm: 'Earlier contact', quiet: 'No recent contact', unknown: 'Contact date unknown' },
  noRecordedTouch: 'No recorded contact',

  source: {
    'utm:instagram': 'Instagram ads',
    'utm:facebook': 'Facebook ads',
    'source:Meta ad': 'Meta ad',
    'source:website': 'Website',
    'source:ClickAdvisor': 'ClickAdvisor',
    'source:referral partner': 'Referral partner',
    'source:walk-in': 'Walk-in',
    'source:friend or family': 'Friend or family',
    'source:other': 'Other',
    'channel:chat note': 'Chat note',
    'channel:chat voice note': 'Voice note',
    'channel:chat transcript': 'Transcript',
    'channel:email': 'Email',
    'channel:web form': 'Web form',
    'channel:ad lead': 'Ad lead',
    'channel:walk-in': 'Walk-in',
    unknown: 'Source unknown',
  },

  event: {
    inquiry: 'Inquiry',
    unit_interest: 'Unit interest',
    tour_booked: 'Tour booking',
    tour_completed: 'Completed tour',
    hold_requested: 'Hold request',
    hold_accepted: 'Accepted hold',
    hold_released: 'Hold release',
    deposit_paid: 'Confirmed reservation deposit',
    promesa_signed: 'Signed promesa',
    closed: 'Confirmed closing',
    lost: 'Lost buyer',
    referral_claim: 'Referral claim',
    question: 'Question',
    note: 'Note',
    presentation_sent: 'Presentation delivered',
    unit_selected: 'Unit selected',
    on_hold: 'Put on hold',
    nurture: 'Moved to long-term nurture',
    qualified: 'Contact and discovery done',
    identity: 'Identity decision',
  },
  eventAbout: '{event}, {unit}',
  eventWithPartner: 'with {partner}',
  eventUnknownTime: 'Time not recorded',

  channel: {
    'chat voice note': 'Voice note', 'chat transcript': 'Transcript', 'chat note': 'Chat note', email: 'Email', 'web form': 'Web form', 'ad lead': 'Ad lead',
  },

  reasons: {
    no_leads: 'No leads',
    unavailable: 'Unavailable',
    no_qualified: 'No buyers reached discovery',
    no_tours: 'No completed tours',
    no_bookings: 'No confirmed bookings',
    no_deposits: 'No deposits',
    no_impressions: 'No impressions',
    reach_not_combinable: 'Reach not combinable across weeks',
    no_delivery_source: 'No verified delivery source',
    insufficient_history: 'Insufficient history',
    no_recent_absorption: 'No units secured recently',
    all_secured: 'No buyer inventory remains to secure',
    not_configured: 'Not configured',
    no_referrals: 'No referrals',
    no_closings: 'No closings',
    no_supply: 'No remaining supply',
    not_recorded: 'Not recorded',
    not_on_market: 'Not on market',
    unknown: 'Unknown',
  },

  units: {
    line: '{secured} secured / {held} held / {available} available',
    earlier: '{n} units sold before tracking',
    earlierUnknown: 'Earlier sales not supplied',
    perWeek: '{n} per week',
    weeks: '{n} weeks',
    weeksOrLonger: '{n} weeks or longer',
    weeksRange: '{fast} to {slow} weeks',
    days: '{n} days',
    day: '{n} day',
  },

  numbers: {
    remaining: 'Unsecured units',
    securedRecent: 'Units secured in 30 days',
    pace: 'Units secured/week (last four weeks)',
    sellout: 'Sell-out weeks at recent pace',
    selloutPlain: 'Sell-out estimate',
  },
  pulse: { units: 'Units', changes: 'Changes since last report', attention: 'Follow-up', buyers: 'Active buyers', byTemperature: 'By lead temperature', byOwner: 'By owner', buyersNote: 'Active buyers are every buyer not closed, on hold, in long-term nurture, or lost.' },
  temperature: { hot: 'Hot', warm: 'Warm', cold: 'Cold', 'not a fit': 'Not a fit', 'not set': 'Not set' },
  noOwner: 'No owner',

  // ---- shared components

  board: {
    historyUnavailable: 'History unavailable before tracking.',
  },

  unitDrawer: {
    title: 'Unit {unit}',
    history: 'Status history',
    noHistory: 'No status change recorded since tracking began.',
    deposit: 'Deposit date',
    holder: 'Holder',
    noHolder: 'No holder',
    buyerBriefOnRequest: 'Buyer brief available on request',
    size: 'Interior size',
    price: 'List price',
    listed: 'Listing date',
    activity: 'Buyer activity',
    noActivity: 'No buyer activity recorded on this unit.',
    recordsCheck: 'Sheet status: {sheet}. Recorded status: {reconstructed}.',
  },

  pace: {
    partial: 'partial week',
  },

  changes: {
    new_buyer: 'New buyer {person}',
    removed_buyer: 'Buyer {person} no longer in records',
    identity_resolved: '{person} merged into {survivor}',
    stage_changed: '{person} moved from {from} to {to}',
    override_changed: '{person} override changed',
    unit_status_changed: '{unit} moved from {from} to {to}',
    unit_holder_changed: '{unit} holder changed',
    review_opened: 'Review item {review} opened',
    review_resolved: 'Review item {review} resolved',
    review_reopened: 'Review item {review} reopened',
    fact_corrected: 'Earlier fact corrected on {ref}',
    none: 'No differences from the previous report.',
    more: '{n} more changes in the full record.',
  },

  attention: {
    stale: 'No buyer contact in {n} days',
    undated_buyer: 'Last touch date unknown',
    review: 'Open review item',
    unknown_date: 'Event date not recorded',
    missing_attribution: 'No accepted partner or campaign',
    dueOn: 'Due {date}',
    none: 'No follow-up items recorded.',
    show: 'All {n} items',
    noStep: 'No next step recorded',
    reviewReason: { 'identity uncertainty': 'Identity uncertain', 'missing attribution': 'Attribution missing', 'referral conflict': 'Referral conflict', 'unreadable source material': 'Source unreadable' },
  },

  limitations: {
    diagnostics: '{n} records need a check.',
  },

  card: {
    title: 'Shareable card',
    filtered: 'Selection: {summary}',
    emptyFilter: 'No results for this selection',
    scopeAll: 'Whole development',
    asOf: 'As of {datetime}, {tz}',
    alt: '{title} card for {property}',
    caption: '{scope}, as of {date}',
  },
  drawer: { close: 'Close', },
  recordMissing: 'record missing',

  credit: {
    line: '{who}, {channel}, {date}',
    who: { 'scheduled job': 'Morning update', 'web form': 'Web form', 'Meta integration': 'Meta integration' },
    unknownWho: 'Source not recorded',
  },

  // ---- demand and ads

  demand: {
    leadSpend: 'Campaign spend',
    leadLeads: 'Platform leads',
    leadCpl: 'Cost per platform lead',
    leadDeposits: 'Buyers with paid deposits',
    depositsOutside: 'Outside campaign cost: {partner} paid deposits came through partner introductions and {unknown} had no campaign on the first touch.',
    noWeeks: 'No reporting weeks are configured.',
    platformNote: 'Meta counts platform leads. The records identify matched buyers.',
    periodAll: 'All weeks, {range}',
    periodLast4: 'Last four complete weeks, {range}',
    tableNote: 'Costs cover whole reporting weeks: {range}. Meta counts platform leads. Outcomes count buyers first reached through each campaign. Booked and completed each count a buyer once, in the week of their first explicit booking or completion. They are separate milestones, not current visit counts.',
    firstTouch: 'first contact {date}',
    noMatched: 'No buyer in the records first arrived through this campaign.',
    campaignsTitle: 'Campaign results',
    sourceTitle: 'Recorded first-contact sources',
    sourceNote: 'These counts use the buyer’s recorded first contact in the selected weeks. They describe acquisition, not readiness or referral credit.',
    sourceUnknown: 'Source or first-contact date unknown',
    col: {
      campaign: 'Campaign', spend: 'Spend', leads: 'Platform leads', cpl: 'Cost per platform lead',
      deposits: 'Buyers with paid deposits', discovery: 'Buyers reached discovery', booked: 'Buyers booked a tour', tours: 'Buyers completed a tour',
    },
    total: 'All campaigns',
    campaignMembers: '{n} matched buyers',
  },

  // ---- partner network

  partners: {
    leadActive: 'Agents with recent contact',
    leadWarm: 'Agents with earlier contact',
    leadQuiet: 'Agents without recent contact',
    leadReferrals: 'Accepted referrals',
    showAll: 'All {n} agents',
    listTitle: 'Agents',
    listCount: '{n} of {total} agents',
    search: 'Agent search',
    none: 'No referrals',
    touchAbout: 'Conversation about {name}',
    agent: 'Referral partner',
    col: { name: 'Agent', referrals: 'Accepted referrals', furthest: 'Furthest stage', lastTouch: 'Last conversation', activity: 'Contact recency' },
    sort: { name: 'Name', last_touch: 'Last conversation', referrals: 'Referrals', conversion: 'Conversion', exposure: 'Exposure' },
    drawerBuyers: 'Accepted referrals',
    drawerNoBuyers: 'No accepted referrals.',
    drawerTouches: 'Conversations',
    drawerNoTouches: 'No conversation recorded.',
    drawerPartnerOnly: 'Partner conversation',
    drawerTerms: 'Accepted terms',
    drawerTermsPercent: '{rate}% of sale price',
    drawerTermsFixed: '{amount} per unit',
    drawerTermsNone: 'No confirmed agreement',
    drawerExceptions: 'Buyer exceptions: {list}',
    drawerExceptionsUnknown: 'Buyer exceptions could not be read, so terms are unknown.',
    drawerClaims: 'Unresolved claims',
  },

  // ---- unit interest

  unitInterest: {
    leadRemaining: 'Unsecured units',
    leadInquiries: 'Inquiries',
    leadTours: 'Completed tours',
    leadHolds: 'Accepted holds',
    rowsTitle: 'Unit activity',
    status: 'Status',
    allStatuses: 'All',
    statusCount: '{status} ({n})',
    statusLabels: { 'promesa signed': 'Promesa', unknown: 'Not recorded' },
    col: { unit: 'Unit', status: 'Status', price: 'List price', dom: 'Days on market', activity: 'Inquiries / tours / holds' },
    sort: { unit: 'Unit', price: 'List price', inquiries: 'Inquiries', tours: 'Tours', holds: 'Holds', dom: 'Days on market', ratio: 'Interest per unit' },
    tableNote: 'Inquiries, tours, and holds count buyer and unit pairs. Prices are USD list prices.',
    showAll: 'All {n} units',
  },

  // ---- owner brief

  owner: {
    openPulse: 'Open sales pulse',
    thisWeek: 'This week',
  },

  // ---- buyer brief

  buyer: {
    stage: 'Current stage',
    owner: 'Owner',
    temperature: 'Lead temperature',
    referrer: 'Referring agent',
    noReferrer: 'Not recorded',
    disputeNotice: 'An open referral dispute concerns this buyer.',
    lastTouch: 'Last contact',
    nextStep: 'Next step',
    noNextStep: 'Not recorded',
    origin: 'Home',
    originUnknown: 'Not recorded',
    timeline: 'Timeline',
    profile: 'Profile',
    unitsTitle: 'Units of interest',
    noUnits: 'No specific unit recorded.',
    questions: 'Open questions',
    noQuestions: 'No open questions recorded.',
    recommendations: 'Suggested follow-up',
    figures: { units: 'Units of interest', tours: 'Completed tours', reviews: 'Open review items' },
    idLabel: 'Visit preparation',
    cardNext: 'Next step {date}',
  },

  // ---- custom report

  custom: {
    leadSpend: 'Campaign spend',
    leadLeads: 'Platform leads',
    leadClosings: 'Closings by accepted partner',
    spendTitle: 'Campaign spend',
    closingsTitle: 'Closed deals by accepted partner',
    groupAccepted: 'Accepted partner, undisputed',
    groupMissing: 'No accepted partner',
    groupDisputed: 'Disputed attribution',
    closingsN: '{n} closings',
    noAllocation: 'Spend is not allocated to partners. Cost per closing by partner is unavailable.',
  },

};

/** Fill {name} placeholders. Missing values render as an empty string. */
export function t(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}
