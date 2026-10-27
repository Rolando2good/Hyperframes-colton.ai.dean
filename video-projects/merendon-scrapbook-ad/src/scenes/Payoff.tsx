import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Group} from '../components/Group';
import {Strokes, Typed, checkMark} from '../components/Ink';
import {CornerTapes, Piece} from '../components/Paper';
import {Sticker} from '../components/Sticker';
import type {Plan} from '../plan';
import {stepPoses} from '../lib/rand';
import {scribbleRows} from './Hook';

const SHEET = {x: 90, y: 150, w: 900, h: 1150};
const QUESTIONS = ['1. what does mitosis make?', '2. solve: 3x + 4 = 19', "3. 3 branches of gov't?"];
const Q_Y = [420, 690, 960];

export const Payoff: React.FC<{plan: Plan}> = ({plan}) => {
  const frame = useCurrentFrame();
  const p = plan.payoff;
  // slides in from the right, on twos
  const slide = stepPoses(frame, p.at, [{dx: 520}, {dx: 200}, {dx: 30}, {dx: -8}, {dx: 0}]);
  return (
    <>
      <Group seed="quiz" dx={slide?.dx ?? 0}>
        <Piece seed="quiz" x={SHEET.x} y={SHEET.y} w={SHEET.w} h={SHEET.h} rot={-1.6} lined margin rough={{top: 6, right: 8}}>
          <Typed text="QUIZ — ch. 7" at={p.headerAt} charsPerPose={2} size={52} style={{position: 'absolute', left: 140, top: 70}} />
          <Typed text="name: ____________" at={-999} size={38} style={{position: 'absolute', left: 140, top: 150, opacity: 0.8}} />
          {QUESTIONS.map((q, i) => (
            <Typed key={q} text={q} at={-999} size={42} seed={`q${i}`} style={{position: 'absolute', left: 130, top: Q_Y[i] - SHEET.y - 40}} />
          ))}
        </Piece>
        {/* your answers, already scribbled */}
        {Q_Y.map((y, i) => (
          <Strokes key={i} paths={scribbleRows(`ans-${i}`, 260, y + 120, 1, 64, 380)} />
        ))}
        <Strokes
          paths={p.checksAt.map((at, i) => ({seed: `check-${i}`, pts: checkMark(`check-${i}`, 790, Q_Y[i] + 70, 1.35), at, dur: 4, min: 3, max: 6}))}
        />
      </Group>
      {frame >= p.at + 8 ? <CornerTapes seed="quiz-tape" x={SHEET.x} y={SHEET.y} w={SHEET.w} h={SHEET.h} tone="salmon" corners={['tl', 'tr']} /> : null}
      <Sticker name="quetzal-sunglasses" x={830} y={1215} size={340} at={p.shadesAt} />
      <Sticker name="gold-star" x={190} y={1225} size={210} at={p.starAt} />
      <Sticker name="a-plus" x={870} y={215} size={230} at={p.aPlusAt} />
    </>
  );
};
