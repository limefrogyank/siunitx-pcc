// @ts-expect-error
import { engineReady, setupEngine, toSpeech } from 'speech-rule-engine';

export type SpeechLocale =
  | 'af'
  | 'ca'
  | 'da'
  | 'de'
  | 'en'
  | 'es'
  | 'fr'
  | 'hi'
  | 'it'
  | 'ko'
  | 'nb'
  | 'nn'
  | 'sv';

export type BrailleLocale = 'nemeth' | 'euro';

export async function mmlToSpeech(
  mml: string,
  locale: SpeechLocale = 'en',
  domain = 'clearspeak'
) {
  await setupEngine({ modality: 'speech', locale, domain });
  await engineReady();
  return toSpeech(mml);
}

export async function mmlToBraille(
  mml: string,
  locale: BrailleLocale = 'nemeth',
) {
  await setupEngine({ locale, modality: 'braille' });
  await engineReady();
  return toSpeech(mml);
}
