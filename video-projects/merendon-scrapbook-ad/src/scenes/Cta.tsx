import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {Group} from '../components/Group';
import {Headline, Typed} from '../components/Ink';
import {CornerTapes, Piece} from '../components/Paper';
import {Sticker, landPose} from '../components/Sticker';
import {URL_TEXT, type Plan} from '../plan';
import {hash, stepPoses} from '../lib/rand';
import {C} from '../lib/theme';
import {NotesPage} from './Myth';

// jagged vertical tear down the middle of the old notes
function tearClip(side: 'left' | 'right') {
  const pts: string[] = [];
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const y = -40 + (i / n) * 2000;
    const x = 540 + Math.sin(i * 0.9) * 22 + (hash('tear', i) * 2 - 1) * 14;
    pts.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
  }
  const outer = side === 'left' ? ['-200px 1960px', '-200px -40px'] : ['1300px 1960px', '1300px -40px'];
  return `polygon(${pts.join(',')},${outer.join(',')})`;
}

const LINES = [
  {words: [0, 1], text: ['start', 'doing']},
  {words: [2, 3], text: ['what', 'works']},
  {words: [4, 5], text: ['for', 'you.']},
];

export const Cta: React.FC<{plan: Plan; hasLogo: boolean}> = ({plan, hasLogo}) => {
  const frame = useCurrentFrame();
  const c = plan.cta;
  const rip = stepPoses(frame, c.ripAt, [
    {dx: 8, r: 0.6},
    {dx: 70, r: 2.5},
    {dx: 260, r: 6},
    {dx: 700, r: 10},
    {dx: 1300, r: 14},
  ]);
  const ripped = frame >= c.ripAt + 10;
  const logo = landPose(frame, c.logoAt);
  const url = landPose(frame, c.urlAt);
  return (
    <>
      {/* the clean salmon card underneath */}
      <Group seed="cta-card">
        <Piece seed="cta-card" x={60} y={170} w={960} h={1150} rot={-1.2} color={C.salmon} rough={{top: 10, right: 6, bottom: 10, left: 6}} />
        {LINES.map((line, li) => (
          <div key={li} style={{position: 'absolute', left: 130 + li * 18, top: 250 + li * 150, display: 'flex', gap: 34}}>
            {line.text.map((word, k) => {
              const pose = stepPoses(frame, c.headlineAt[line.words[k]], [{s: 1.14}, {s: 0.97}, {s: 1}]);
              return pose ? (
                <div key={word} style={{transform: `scale(${pose.s}) rotate(${(hash('cta-w', li, k) * 2 - 1) * 2.5}deg)`}}>
                  <Headline text={word} seed={`cta-${li}-${k}`} size={128} color={C.paper} style={{textShadow: `4px 5px 0 ${C.ink}`}} />
                </div>
              ) : (
                <div key={word} style={{visibility: 'hidden'}}>
                  <Headline text={word} seed={`cta-${li}-${k}`} size={128} />
                </div>
              );
            })}
          </div>
        ))}
        {logo && (
          <Group seed="logo" dy={logo.dy} scale={logo.s} origin="540px 870px" amp={4}>
            <Piece seed="logo-back" x={210} y={740} w={660} h={250} rot={1.4} rough={{top: 5, bottom: 5}}>
              {/* real logo is never redrawn: we only place the supplied file */}
              <Img src={staticFile(hasLogo ? 'logo/merendon.svg' : 'logo/merendon-placeholder.svg')} style={{position: 'absolute', left: 50, top: 30, width: 560, height: 190, objectFit: 'contain'}} />
            </Piece>
            <CornerTapes seed="logo-tape" x={210} y={740} w={660} h={250} tone="cream" corners={['tl', 'tr', 'br']} />
          </Group>
        )}
        {url && (
          <Group seed="url" dy={url.dy} scale={url.s} origin="540px 1080px" amp={4}>
            <Piece seed="url-strip" x={130} y={1036} w={820} h={98} rot={-1.8} rough={{top: 5, bottom: 5}}>
              <Typed text={URL_TEXT} at={c.urlAt + 2} charsPerPose={c.urlCharsPerPose} size={38} style={{position: 'absolute', left: 36, top: 28}} />
            </Piece>
          </Group>
        )}
        <Sticker name="quetzal-nodding" x={860} y={1300} size={380} at={c.quetzalAt} motion={(p) => ({r: p % 4 < 2 ? -6 : 0, dy: p % 4 < 2 ? 3 : 0})} />
      </Group>

      {/* the old highlighted notes, ripped in half on "rereading" */}
      {!ripped &&
        (['left', 'right'] as const).map((side) => {
          const dir = side === 'left' ? -1 : 1;
          return (
            <div
              key={side}
              style={{
                position: 'absolute',
                inset: 0,
                clipPath: tearClip(side),
                transformOrigin: side === 'left' ? '540px 1900px' : '540px 1900px',
                transform: rip ? `translateX(${dir * rip.dx}px) rotate(${dir * rip.r}deg)` : undefined,
              }}
            >
              <Group seed="cta-old">
                <NotesPage seed="myth" hl={plan.myth.highlights.map(() => -999)} headerAt={-999} />
              </Group>
            </div>
          );
        })}
    </>
  );
};
