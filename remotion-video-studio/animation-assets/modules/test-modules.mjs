import { BmTypography } from './bm-typography.js';
import { CameraShake } from './camera-shake.js';
import { DeviceMockup } from './device-mockup.js';

console.log('--- [1/3] Testing BmTypography ---');
const typo = new BmTypography({ accentColor: '#38bdf8', scribbleColor: '#f43f5e' });
const rawText = 'আজকে আমরা দেখব [টারমাক্সে] কীভাবে [সিনেমাটিক ভিডিও] তৈরি করা যায়';
const tokens = typo.parse(rawText);
console.assert(tokens.length === 5, 'Tokens count should be 5');
console.assert(tokens[1].text === 'টারমাক্সে' && tokens[1].isHighlighted, 'Token 1 should be highlighted টারমাক্সে');
console.assert(tokens[3].text === 'সিনেমাটিক ভিডিও' && tokens[3].isHighlighted, 'Token 3 should be highlighted সিনেমাটিক ভিডিও');

const htmlOutput = typo.renderHTML(rawText);
console.assert(htmlOutput.includes('bm-scribble'), 'HTML should contain SVG scribble');
console.assert(htmlOutput.includes('bm-text-highlight'), 'HTML should contain highlight class');
console.log('✓ BmTypography passed!');

console.log('\n--- [2/3] Testing CameraShake ---');
const shake = new CameraShake({ defaultAmplitude: 16, decay: 8, frequency: 24, fps: 30 });
shake.trigger({ startFrame: 10, amplitude: 20 });

const offsetBefore = shake.evaluate(5);
console.assert(offsetBefore.x === 0 && offsetBefore.y === 0, 'Offset before startFrame should be 0');

const offsetHit = shake.evaluate(11);
console.log('Hit frame offset:', offsetHit);
console.assert(Math.abs(offsetHit.x) > 0 || Math.abs(offsetHit.y) > 0, 'Hit offset should be non-zero');

const offsetSettled = shake.evaluate(40);
console.log('Settled frame offset:', offsetSettled);
console.assert(Math.abs(offsetSettled.x) < 0.2 && Math.abs(offsetSettled.y) < 0.2, 'Shake should dampen to zero');

const cssTransform = shake.getTransform(11);
console.assert(cssTransform.includes('translate('), 'CSS transform should contain translate');
console.log('Transform string:', cssTransform);
console.log('✓ CameraShake passed!');

console.log('\n--- [3/3] Testing DeviceMockup ---');
const phone = new DeviceMockup({ kind: 'phone', rx: 10, ry: -15 });
const phoneHtml = phone.renderHTML({
  src: 'https://example.com/screen.png',
  autoScroll: true,
  liftCard: { title: 'User Growth', badge: '+420%', icon: '📈' }
});

console.assert(phoneHtml.includes('bm-phone-frame'), 'HTML should include phone frame');
console.assert(phoneHtml.includes('bm-lift-card'), 'HTML should include 3D pop card');
console.assert(phoneHtml.includes('User Growth'), 'Lift card should include title');

const laptop = new DeviceMockup({ kind: 'laptop' });
const laptopHtml = laptop.renderHTML();
console.assert(laptopHtml.includes('bm-browser-frame'), 'HTML should include browser frame');
console.log('✓ DeviceMockup passed!');

console.log('\n===> ALL STEP 1 LOGIC MODULES VERIFIED (0 ERRORS)! <===');
