import type { NarrativeStep, ScriptWork } from '@shared/api.interface';

const QUICK_ANSWERS: Record<NarrativeStep, string[]> = {
  protagonist: [
    '一个特别的动物朋友',
    '一个超厉害的小英雄',
    '一个会魔法的小精灵',
    '一个平时不起眼的小东西',
  ],
  wish: [
    '一个超酷的愿望',
    '一个温暖的心愿',
    '一个大胆的想法',
    '一个奇怪的念头',
  ],
  difficulty: [
    '一个意外的麻烦',
    '一个难搞的问题',
    '一个可怕的挑战',
    '一个神秘的谜团',
  ],
  solution: [
    '一个聪明的主意',
    '一个勇敢的行动',
    '找别人来帮忙',
    '用一个特别的本领',
  ],
  ending: [
    '一个温暖的结局',
    '一个意外的结尾',
    '大家都很开心',
    '学到了重要的东西',
  ],
};

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateQuickAnswers(
  step: NarrativeStep,
  _script?: ScriptWork,
): string[] {
  const options = QUICK_ANSWERS[step] ?? [];
  return shuffle(options).slice(0, 3);
}
