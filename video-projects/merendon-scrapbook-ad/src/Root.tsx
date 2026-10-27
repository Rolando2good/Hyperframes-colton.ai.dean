import React from 'react';
import {Composition, staticFile} from 'remotion';
import {Ad, type AdProps} from './Ad';
import {FPS, durationFor, type Word} from './cues';

// words.json + the logo are read at render time, so dropping in the real
// ElevenLabs VO/timestamps or the real logo needs no code change.
export const Root: React.FC = () => (
  <Composition
    id="MerendonAd"
    component={Ad}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={30 * FPS} // replaced by calculateMetadata from words.json
    defaultProps={{words: [] as Word[], hasLogo: false} satisfies AdProps}
    calculateMetadata={async () => {
      const words: Word[] = await (await fetch(staticFile('vo/words.json'))).json();
      const logo = await fetch(staticFile('logo/merendon.svg'), {method: 'HEAD'}).catch(() => null);
      const hasLogo = Boolean(logo && logo.ok && (logo.headers.get('content-type') ?? '').includes('svg'));
      return {props: {words, hasLogo}, durationInFrames: Math.round(durationFor(words) * FPS)};
    }}
  />
);
