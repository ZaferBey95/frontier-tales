import type { LocationDef, LocationId } from '../types';

export const LOCATION_ORDER: LocationId[] = ['town', 'ranch', 'forest', 'river', 'mine', 'railroad', 'canyon'];

export const LOCATIONS: Record<LocationId, LocationDef> = {
  town: {
    id: 'town',
    name: 'Coyote Creek',
    description: 'Tozlu sokakları, gıcırdayan salonu ve huysuz şerifiyle bölgenin kalbi.',
    x: 50,
    y: 50,
    services: ['shop', 'hotel'],
  },
  ranch: {
    id: 'ranch',
    name: 'Miller Çiftliği',
    description: 'Martha Miller’ın uçsuz bucaksız otlakları. Burada iş hiç bitmez.',
    x: 27,
    y: 36,
    services: [],
  },
  forest: {
    id: 'forest',
    name: 'Çam Ormanı',
    description: 'Tavşanların, geyiklerin ve zaman zaman ayıların yurdu.',
    x: 14,
    y: 12,
    services: [],
  },
  river: {
    id: 'river',
    name: 'Yılan Nehri',
    description: 'Kıvrılarak akan soğuk sular. Yaşlı Pete hâlâ burada altın aradığına yemin eder.',
    x: 28,
    y: 76,
    services: [],
  },
  mine: {
    id: 'mine',
    name: 'Gümüş Sırtı Madeni',
    description: 'Dağın içine oyulmuş karanlık tüneller. Maaşı iyi, havası kötü.',
    x: 80,
    y: 18,
    services: [],
  },
  railroad: {
    id: 'railroad',
    name: 'Demiryolu Şantiyesi',
    description: 'Doğudan gelen raylar burada bitiyor, en azından şimdilik.',
    x: 86,
    y: 56,
    services: [],
  },
  canyon: {
    id: 'canyon',
    name: 'Kızıl Kanyon',
    description: 'Kanunun uğramadığı yer. Haydutlar bu kızıl kayaların arasında saklanır.',
    x: 64,
    y: 86,
    services: [],
  },
};
