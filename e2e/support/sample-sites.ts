/**
 * Content for the tests: two sites with different names, themes and pages. It lives only here and
 * reaches the website the real way, through the API (a site is created, pages are made and
 * published), never as something the website carries. The themes are in the shape `sites.theme`
 * stores (see src/theme/theme.ts); nothing in the API sets one yet, so a test writes it to the
 * database before the site's first visit.
 */

export type SamplePage = { slug: string; title: string; blocks: object[] };

export type SampleTheme = {
  typeSet: string;
  shape: string;
  density: string;
  texture: string;
  palette: Record<string, string>;
};

export type SampleSite = {
  name: string;
  theme: SampleTheme;
  /** The home page, then the pages the navigation lists. */
  pages: SamplePage[];
  /** What the home page's hero says: a test finds the right site by it. */
  headline: string;
};

/** Editorial type, a tidal palette, soft shapes, grain. */
export const corrick: SampleSite = {
  name: 'Corrick Oyster Co.',
  headline: 'Oysters that taste like the tide that raised them',
  theme: {
    typeSet: 'editorial',
    shape: 'soft',
    density: 'comfortable',
    texture: 'grain',
    palette: {
      paper: '#D9E0D8',
      surface: '#F1F4EF',
      ink: '#13201C',
      muted: '#556258',
      line: '#B6C2B5',
      brand: '#2E4A3E',
      onBrand: '#F1F4EF',
      accent: '#C8863C',
    },
  },
  pages: [
    {
      slug: 'home',
      title: 'Corrick Oyster Co. — oysters from the Damariscotta',
      blocks: [
        {
          type: 'hero',
          eyebrow: 'Lot 14 · Harvested at low water',
          headline: 'Oysters that taste like the tide that raised them',
          body: 'We grow in floating bags on the east bank of the Damariscotta, where the river turns salt twice a day. Nothing gets shipped that was not in the water this morning.',
          primaryAction: { label: 'Reserve a spring share', href: '/shares' },
          secondaryAction: { label: 'Read this week’s harvest log', href: '/log' },
          image: { src: '/media/corrick-flats.svg', alt: 'The tidal flats at low water, oyster cages in rows' },
          facts: [
            { label: 'Salinity', value: '28 ppt' },
            { label: 'Grow-out', value: '22 months' },
            { label: 'Cages in water', value: '1,340' },
          ],
        },
        {
          type: 'featureGrid',
          heading: 'How a share works',
          intro:
            'Twenty weeks, one delivery a week, priced before the season opens so the boat gets paid in March rather than August.',
          ordered: true,
          items: [
            {
              title: 'Reserve in March',
              body: 'Shares are capped at what the lease can carry. When they are gone we stop taking names rather than thin the beds.',
            },
            {
              title: 'We harvest on your tide',
              body: 'Your bags come up the morning of your delivery day. You get a lot number and the salinity reading it was pulled at.',
            },
            {
              title: 'Collected Friday',
              body: 'Pick up at the co-op in Newcastle, or add river delivery within twelve miles of the landing.',
            },
          ],
        },
        {
          type: 'imageText',
          heading: 'Twelve feet of water at high tide, ankle-deep at low',
          body: 'The lease sits on a shelf that drains almost completely twice a day. That swing is the whole reason the oysters taste the way they do — they spend half their lives filtering a river and half filtering the Gulf of Maine coming back in.',
          image: {
            src: '/media/corrick-lot14.svg',
            alt: 'Survey drawing of Lot 14 showing cage rows and the low-water contour',
            caption: 'Lot 14 — cage rows and the mean low-water contour',
          },
          imagePosition: 'left',
          action: { label: 'How we grow', href: '/growing' },
        },
        {
          type: 'testimonial',
          quote:
            'They send the salinity reading with the lot number. I have had suppliers who could not tell me what bay the oysters came from.',
          attribution: 'Nina Alvarez',
          role: 'Chef, The Lower Landing, Portland',
        },
        {
          type: 'cta',
          heading: 'Spring shares open March 1',
          body: 'Two hundred shares, twenty weeks, one river. Join the list and we will write to you the morning they open.',
          action: { label: 'Join the share list', href: '/shares' },
          note: 'No deposit until shares open.',
        },
      ],
    },
    {
      slug: 'visit',
      title: 'Visit the farm',
      blocks: [{ type: 'cta', heading: 'Come and see the beds', action: { label: 'Book a tour', href: '/visit' } }],
    },
    {
      slug: 'wholesale',
      title: 'Wholesale',
      blocks: [{ type: 'cta', heading: 'Restaurant orders', action: { label: 'Ask for a price list', href: '/wholesale' } }],
    },
  ],
};

/** Technical type, a dark industrial palette, sharp shapes, grid. */
export const kestrel: SampleSite = {
  name: 'Kestrel Rigging',
  headline: 'Blade inspection without a crane on site',
  theme: {
    typeSet: 'technical',
    shape: 'sharp',
    density: 'tight',
    texture: 'grid',
    palette: {
      paper: '#0E1116',
      surface: '#171C23',
      ink: '#E6EAEF',
      muted: '#8E9AAA',
      line: '#2A323C',
      brand: '#FF6B1A',
      onBrand: '#100A05',
      accent: '#F2C230',
    },
  },
  pages: [
    {
      slug: 'home',
      title: 'Kestrel Rigging — rope-access blade inspection and repair',
      blocks: [
        {
          type: 'hero',
          eyebrow: 'IRATA L3 · Working height to 165 m',
          headline: 'Blade inspection without a crane on site',
          body: 'Two technicians on rope reach the leading edge in under an hour. No crane mobilisation, no road closure, no waiting on a weather window wide enough to lift.',
          primaryAction: { label: 'Request a survey window', href: '/survey' },
          secondaryAction: { label: 'Download the method statement', href: '/methods' },
          image: { src: '/media/kestrel-blade.svg', alt: 'Blade elevation with inspection stations marked along the leading edge' },
          facts: [
            { label: 'Turbines surveyed 2025', value: '412' },
            { label: 'Mean time on rope', value: '3.4 h' },
            { label: 'RIDDOR incidents', value: '0' },
          ],
        },
        {
          type: 'featureGrid',
          heading: 'Capability',
          intro: 'One crew, one mobilisation. Inspection and repair are the same visit unless the damage needs a workshop.',
          items: [
            {
              label: 'LEI',
              title: 'Leading-edge inspection',
              body: 'Close-visual to IEC 61400-3 with photo capture at every station. Findings graded 1–5 and mapped to blade station.',
            },
            {
              label: 'NDT',
              title: 'Weld and tower testing',
              body: 'MPI and ultrasonic on tower flanges and welds, carried out on rope with a certified Level 2 inspector.',
            },
            {
              label: 'REP',
              title: 'Composite repair',
              body: 'Wet lay-up and pre-preg repairs to grade 3 damage, cured under heat blanket with a logged cure profile.',
            },
          ],
        },
        {
          type: 'imageText',
          heading: 'Findings come back mapped to blade station, not described in prose',
          body: 'Every defect is logged against its station number, radius and blade face, with photographs at fixed distance. Two surveys a year apart can be compared directly, which is the only way to tell erosion from a bad photograph.',
          image: {
            src: '/media/kestrel-access.svg',
            alt: 'Rope access rigging diagram with anchor points and height markers',
            caption: 'WTG-07 · twin-rope descent from hub anchor',
          },
          imagePosition: 'right',
          action: { label: 'See a sample report', href: '/reports' },
        },
        {
          type: 'testimonial',
          quote:
            'The comparison against last year’s survey took ten minutes because the station numbering had not moved. That is not normal in this industry.',
          attribution: 'Dan Whitlock',
          role: 'Asset manager, Northmoor Wind',
        },
        {
          type: 'cta',
          heading: 'Q4 survey windows are filling',
          body: 'Send the site, turbine count and model. You get a window and a fixed price inside two working days.',
          action: { label: 'Request a survey window', href: '/survey' },
          note: 'Method statement and insurance certs sent with every quote.',
        },
      ],
    },
    {
      slug: 'capability',
      title: 'Capability statement',
      blocks: [{ type: 'cta', heading: 'What we can reach', action: { label: 'Talk to us', href: '/survey' } }],
    },
    {
      slug: 'certification',
      title: 'Certification',
      blocks: [{ type: 'cta', heading: 'IRATA and insurance', action: { label: 'Request the certs', href: '/survey' } }],
    },
  ],
};
