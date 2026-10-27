import React from 'react';
import {AbsoluteFill, Freeze, useCurrentFrame} from 'remotion';
import {type Word} from './cues';
import {buildPlan} from './plan';
import {Camera, Captions, ChromaDefs, Desk, Grain, SoundTrack, Vignette} from './components/Global';
import {Hook} from './scenes/Hook';
import {Myth} from './scenes/Myth';
import {Turn} from './scenes/Turn';
import {Payoff} from './scenes/Payoff';
import {Cta} from './scenes/Cta';
import {C} from './lib/theme';
import './lib/fonts';

export type AdProps = {words: Word[]; hasLogo: boolean};

const Scenes: React.FC<{plan: ReturnType<typeof buildPlan>; hasLogo: boolean}> = ({plan, hasLogo}) => {
  const f = useCurrentFrame();
  const s = plan.scene;
  // hard cuts on the beat grid — one scene on screen at a time
  if (f < s.myth) return <Hook plan={plan} />;
  if (f < s.turn) return <Myth plan={plan} />;
  if (f < s.payoff) return <Turn plan={plan} />;
  if (f < s.cta) return <Payoff plan={plan} />;
  return <Cta plan={plan} hasLogo={hasLogo} />;
};

export const Ad: React.FC<AdProps> = ({words, hasLogo}) => {
  const plan = React.useMemo(() => buildPlan(words), [words]);
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.kraft, overflow: 'hidden'}}>
      <ChromaDefs />
      {/* final 1.5s: the whole desk holds still on the last pose */}
      <Freeze frame={plan.scene.hold} active={frame >= plan.scene.hold}>
        <Camera plan={plan}>
          <Desk />
          <Scenes plan={plan} hasLogo={hasLogo} />
        </Camera>
      </Freeze>
      <Captions words={words} />
      <Vignette />
      <Grain />
      <SoundTrack plan={plan} words={words} />
    </AbsoluteFill>
  );
};
