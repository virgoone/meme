import striptags from 'striptags'

const CN_PATTERN = /[\u4E00-\u9FA5]/g
const EN_PATTERN =
  /[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF]+|[\u00E4\u00C4\u00E5\u00C5\u00F6\u00D6]+|\w+/g

function getContentCount(content: string): [number, number, string] {
  let cn = 0
  let en = 0
  let innerContent = content
  if (content.length > 0) {
    innerContent = striptags(content)
    cn = (innerContent.match(CN_PATTERN) || []).length
    en = (innerContent.replace(CN_PATTERN, '').match(EN_PATTERN) || []).length
  }
  return [cn, en, innerContent]
}

export function getWordCount(
  content: string,
  baseTime: { cn: number; en: number } = { cn: 300, en: 160 },
) {
  const [cn, en] = getContentCount(content)
  const count = cn + en
  const minutes = cn / baseTime.cn + en / baseTime.en

  return {
    count: {
      total: count,
      cn,
      en,
    },
    minutes: minutes === 0 ? 0 : Math.ceil(minutes),
  }
}
