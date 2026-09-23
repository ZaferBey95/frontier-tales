import type { QuestDef } from '../types';

const SHERIFF = { giver: 'Şerif Walt Hollis', giverIcon: '⭐' };
const MARTHA = { giver: 'Martha Miller', giverIcon: '👵' };
const PETE = { giver: 'Yaşlı Pete', giverIcon: '🧔' };

export const QUEST_LIST: QuestDef[] = [
  {
    id: 'welcome',
    ...SHERIFF,
    title: 'Yeni Gelen',
    story:
      'Coyote Creek’e hoş geldin, yabancı. Buralarda kimse bedava yemek yemez. Miller Çiftliği’ne git ve Martha’ya elinin iş tuttuğunu göster.',
    outro: 'Martha senden iyi söz etti. Belki de buralarda tutunabilirsin.',
    requires: [],
    minLevel: 1,
    objectives: [
      { kind: 'visit', locationId: 'ranch' },
      { kind: 'job', locationId: 'ranch', count: 1 },
    ],
    rewards: { money: 20, xp: 15 },
  },
  {
    id: 'proper_hat',
    ...MARTHA,
    title: 'Güneş Çarpmadan',
    story:
      'Evlat, o çıplak kafayla bu güneşin altında bir gün bile dayanamazsın. Kasabadaki dükkândan kendine bir şapka al ve tak.',
    outro: 'İşte şimdi bir kovboya benzedin!',
    requires: ['welcome'],
    minLevel: 1,
    objectives: [{ kind: 'equip', slot: 'head' }],
    rewards: { money: 15, xp: 20 },
  },
  {
    id: 'rabbit_pelts',
    ...MARTHA,
    title: 'Kış Hazırlığı',
    story:
      'Kış kapıda ve torunlarımın elleri üşüyor. Çam Ormanı’nda tavşan avla ve bana üç tavşan postu getir. Karşılığında eski çizmelerimi sana veririm.',
    outro: 'Ne güzel postlar bunlar! Al bakalım, çizmeler artık senin.',
    requires: ['proper_hat'],
    minLevel: 1,
    objectives: [{ kind: 'deliver', itemId: 'rabbit_pelt', count: 3 }],
    rewards: { money: 45, xp: 40, itemId: 'old_boots' },
  },
  {
    id: 'saloon_brawl',
    ...SHERIFF,
    title: 'Salonda Kavga',
    story:
      'Salondaki sarhoş kovboy yine olay çıkarıyor. Ona biraz terbiye öğret, ama kimseyi öldürme. Eline bir silah almayı da unutma.',
    outro: 'Salon sakinleşti. Kasaba sana bir teşekkür borçlu.',
    requires: ['welcome'],
    minLevel: 1,
    objectives: [{ kind: 'duelWin', npcId: 'drunk_cowboy', count: 1 }],
    rewards: { money: 40, xp: 50 },
  },
  {
    id: 'river_gold',
    ...PETE,
    title: 'Nehirdeki Altın',
    story:
      'Yılan Nehri’nde hâlâ altın var diyorum sana! Kimse inanmıyor. Gel, üç kez benimle altın ayıkla, bulduğumuzu paylaşırız.',
    outro: 'Gördün mü? Gördün mü! Kimse bana inanmıyordu!',
    requires: ['rabbit_pelts'],
    minLevel: 1,
    objectives: [{ kind: 'job', jobId: 'pan_gold', count: 3 }],
    rewards: { money: 60, xp: 60 },
  },
  {
    id: 'saddle_up',
    ...SHERIFF,
    title: 'Eyerlen',
    story:
      'Kanyondaki haydutlarla yüzleşmeden önce biraz daha pişmen lazım. Beşinci seviyeye ulaş. O zamana kadar sana bir katır ayarlarım.',
    outro: 'Artık hazırsın. Katırın ahırda seni bekliyor.',
    requires: ['saloon_brawl', 'river_gold'],
    minLevel: 1,
    objectives: [{ kind: 'level', level: 5 }],
    rewards: { money: 80, xp: 0, itemId: 'old_mule' },
  },
  {
    id: 'bandit_trail',
    ...SHERIFF,
    title: 'Haydut İzi',
    story:
      'Kızıl Kanyon’daki çete yolcuları soyuyor. İki haydudu alt et, geri kalanlarına da mesaj gitmiş olsun.',
    outro: 'Haydutlar artık adını fısıldayarak anıyor.',
    requires: ['saddle_up'],
    minLevel: 5,
    objectives: [{ kind: 'duelWin', locationId: 'canyon', count: 2 }],
    rewards: { money: 150, xp: 120 },
  },
  {
    id: 'the_snake',
    ...SHERIFF,
    title: 'Yılan',
    story:
      'Çetenin başı Jed “Yılan” Carver. Başına 300 dolar ödül konmuş. Onu alt et ve bu kasabaya huzur getir.',
    outro: 'Yılan’ın zehri akıtıldı. Bu şapkayı hak ettin, dostum.',
    requires: ['bandit_trail'],
    minLevel: 8,
    objectives: [{ kind: 'duelWin', npcId: 'snake_carver', count: 1 }],
    rewards: { money: 300, xp: 250, itemId: 'sheriff_hat' },
  },
];
