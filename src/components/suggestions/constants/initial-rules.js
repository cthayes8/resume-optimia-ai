import { highlightColors } from './highlight-colors'

export const initialRules = [
  {
    id: '1',
    title: 'Translate Non-English Text',
    prompt: 'For any text provided in a language other than English, translate it into English',
    color: highlightColors[0].color,
    backgroundColor: highlightColors[0].backgroundColor,
  },
  {
    id: '2',
    title: 'Spell-Check English Text',
    prompt: 'Review the provided English text and identify any spelling errors',
    color: highlightColors[1].color,
    backgroundColor: highlightColors[1].backgroundColor,
  },
]