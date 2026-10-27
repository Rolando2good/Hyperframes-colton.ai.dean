import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// SIL OFL fonts, self-hosted from public/fonts (no render-time network).
export const fontsReady = Promise.all([
  loadFont({family: 'Fraunces', url: staticFile('fonts/Fraunces-Soft-Wonk-700.ttf'), weight: '700'}),
  loadFont({family: 'Special Elite', url: staticFile('fonts/SpecialElite-Regular.ttf'), weight: '400'}),
  loadFont({family: 'Bricolage Grotesque', url: staticFile('fonts/BricolageGrotesque-Bold.ttf'), weight: '700'}),
]);
