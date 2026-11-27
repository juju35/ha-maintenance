// The header's scene, shared by the card and the panel (both bundles list this module).
// The header's scene: a workshop — a pegboard (a gear turning, a wrench, a filter cartridge, a wall calendar), a
// workbench with a toolbox and a spray bottle. Overdue: the wrench at work, the calendar's day red; due soon: the
// filter amber.
export const mtWorkshopScene = (tone, night) => {
  var P = (day, dark) => (night ? dark : day);
  var bad = tone === 'bad';
  var warn = bad || tone === 'warn';
  var holes = [];
  for (var x = 0; x < 7; x++) for (var y = 0; y < 2; y++) holes.push(`<circle cx="${108 + x * 21}" cy="${16 + y * 18}" r="1.5"/>`);
  return `<svg class="scene" viewBox="80 0 200 80" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <rect x="96" y="6" width="150" height="50" rx="4" fill="${P('#fdf6e3', '#2b3a3a')}" stroke="${P('#e7d8b1', '#3f5656')}" stroke-width="2"/>
    <g fill="${P('#d6c49a', '#4f6a6a')}">${holes.join('')}</g>
    <g class="gear"><path d="M122 18h4l1 4 3 1.5 3-2.5 3 3-2.5 3 1.5 3 4 1v4l-4 1-1.5 3 2.5 3-3 3-3-2.5-3 1.5-1 4h-4l-1-4-3-1.5-3 2.5-3-3 2.5-3-1.5-3-4-1v-4l4-1 1.5-3-2.5-3 3-3 3 2.5 3-1.5z" fill="${P('#5eead4', '#2dd4bf')}"/><circle cx="124" cy="31" r="4" fill="${P('#fdf6e3', '#2b3a3a')}"/></g>
    <g class="wrench${bad ? ' busy' : ''}"><path d="M170 12a7 7 0 0 0-6 9l-11 20a3 3 0 0 0 5 3l11-20a7 7 0 0 0 9-8l-4 2-4-2v-4z" fill="${bad ? '#ef4444' : P('#94a3b8', '#cbd5e1')}"/></g>
    <rect x="188" y="14" width="16" height="34" rx="3" fill="#fff" stroke="${warn ? '#f59e0b' : P('#5eead4', '#2dd4bf')}" stroke-width="2"/>
    <path d="M191 21h10M191 27h10M191 33h10M191 39h10" stroke="${warn ? '#fcd34d' : P('#99f6e4', '#5eead4')}" stroke-width="2"/>
    <rect x="216" y="12" width="24" height="26" rx="3" fill="#fff" stroke="${P('#cbd5e1', '#64748b')}" stroke-width="1.5"/>
    <rect x="216" y="12" width="24" height="7" rx="3" fill="${bad ? '#ef4444' : P('#0d9488', '#14b8a6')}"/>
    <text x="228" y="33" font-size="11" font-weight="700" text-anchor="middle" fill="${bad ? '#ef4444' : '#334155'}">${bad ? '!' : '✓'}</text>
    <rect x="84" y="58" width="190" height="7" rx="2" fill="${P('#c08a52', '#7a5534')}"/>
    <rect x="94" y="65" width="6" height="15" fill="${P('#a8743f', '#5e4128')}"/><rect x="258" y="65" width="6" height="15" fill="${P('#a8743f', '#5e4128')}"/>
    <rect x="120" y="46" width="34" height="12" rx="2" fill="${P('#f97316', '#c2410c')}"/><path d="M130 46v-4h14v4" fill="none" stroke="${P('#9a3412', '#7c2d12')}" stroke-width="2"/>
    <rect x="226" y="44" width="10" height="14" rx="2" fill="${P('#60a5fa', '#3b82f6')}"/><path d="M228 44v-4h8l3 2" fill="none" stroke="${P('#334155', '#94a3b8')}" stroke-width="2"/>
  </svg>`;
};
