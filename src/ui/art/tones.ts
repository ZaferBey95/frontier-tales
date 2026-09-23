// Colour sets for badges. Each tone is a top/bottom gradient, a rim colour
// and the ink the glyph is drawn in.

export interface Tone {
  top: string;
  bottom: string;
  rim: string;
  ink: string;
}

export const TONES = {
  sand: { top: '#F6E3BA', bottom: '#DDBB82', rim: '#A9834E', ink: '#3B2412' },
  leather: { top: '#BE7D45', bottom: '#7E4A22', rim: '#55300F', ink: '#FCEBD2' },
  rust: { top: '#D26E42', bottom: '#8E3515', rim: '#63230D', ink: '#FFF1DE' },
  sage: { top: '#9DB176', bottom: '#5E7440', rim: '#3F4F2A', ink: '#F8F4E3' },
  pine: { top: '#6F8F5A', bottom: '#3C5530', rim: '#27381F', ink: '#EEF3E0' },
  sky: { top: '#8DB5D0', bottom: '#4E7494', rim: '#34516A', ink: '#F4F8FB' },
  plum: { top: '#A97BAB', bottom: '#6A4270', rim: '#4A2B50', ink: '#FBF0FB' },
  gold: { top: '#F6D57A', bottom: '#C58F1F', rim: '#83590B', ink: '#3B2412' },
  silver: { top: '#E4E4DD', bottom: '#9FA09A', rim: '#666761', ink: '#2A2A28' },
  night: { top: '#57473D', bottom: '#2A201B', rim: '#140E0B', ink: '#F3E6CC' },
  blood: { top: '#C4473A', bottom: '#7C1F17', rim: '#55130D', ink: '#FFEDE6' },
} satisfies Record<string, Tone>;

export type ToneName = keyof typeof TONES;
