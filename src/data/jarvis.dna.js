export const JARVIS_DNA = {
  dna_version: '1.0',
  type: 'human',
  id: 'hid:jarvis:001',
  created: '2024-01-01T00:00:00Z',

  identity: {
    name: 'Amit Ku Yadav',
    display_name: 'Jarvis',
    handle: '@kingofyadav',
    verified: true,
    trust_level: 1,
    license_id: 'hid-jarvis-001',
    verify_url: 'https://kingofyadav.in/verify/hid-jarvis-001',
  },

  location: {
    lat: 28.6139,
    lng: 77.2090,
    city: 'New Delhi',
    country: 'India',
    flag: '🇮🇳',
    home_zone: 'kingofyadav.in',
  },

  assets: [
    { id: 'asset:domain:kingofyadav.in', type: 'domain',       label: 'kingofyadav.in',       url: 'https://kingofyadav.in' },
    { id: 'asset:project:royal-heritage', type: 'business',    label: 'Royal Heritage Resort', url: null },
    { id: 'asset:project:jhon-aamit-llp', type: 'organization',label: 'Jhon Aamit LLP',        url: null },
    { id: 'asset:project:nyf',            type: 'community',   label: 'National Youth Force',  url: null },
  ],

  agent: {
    type: 'claude-api',
    model: 'claude-sonnet-4-6',
    scope: ['read_identity', 'read_assets', 'suggest_actions'],
  },

  surface: {
    online_status: 'live',
    timezone: 'Asia/Kolkata',
  },
}
