import { Problem } from '../types';

const normalizeTags = (value: any): string[] => {
  if (!value) return [];
  const source = Array.isArray(value) ? value : [value];
  return source
    .map((tag) => {
      if (!tag) return null;
      if (typeof tag === 'string') return tag;
      if (typeof tag === 'object') {
        if ('name' in tag && tag.name) return String(tag.name);
        if ('tag' in tag && tag.tag) return String(tag.tag);
        if ('tagName' in tag && tag.tagName) return String(tag.tagName);
        if ('value' in tag && tag.value) return String(tag.value);
      }
      return null;
    })
    .filter((name): name is string => Boolean(name));
};

export const mapProblem = (raw: any): Problem => ({
  id: raw.id,
  displayId: raw.displayId ?? raw._id ?? String(raw.id ?? ''),
  title: raw.title ?? '제목 없음',
  description: raw.description ?? '',
  difficulty: (raw.difficulty as Problem['difficulty']) ?? 'Mid',
  timeLimit: raw.timeLimit ?? raw.time_limit ?? 0,
  memoryLimit: raw.memoryLimit ?? raw.memory_limit ?? 0,
  inputDescription: raw.inputDescription ?? raw.input_description ?? '',
  outputDescription: raw.outputDescription ?? raw.output_description ?? '',
  samples: raw.samples,
  hint: raw.hint,
  createTime: raw.createTime ?? raw.create_time ?? new Date().toISOString(),
  lastUpdateTime: raw.lastUpdateTime ?? raw.last_update_time,
  tags: normalizeTags(
    raw.tags
      ?? raw.problem_tags
      ?? raw.problemTags
      ?? raw.tag_list
      ?? raw.tagList
      ?? raw.tagNames,
  ),
  languages: raw.languages ?? [],
  createdBy: raw.created_by
    ? {
        id: raw.created_by.id,
        username: raw.created_by.username,
        realName: raw.created_by.real_name ?? raw.created_by.realName,
      }
    : raw.createdBy,
  myStatus: raw.my_status ?? raw.myStatus,
  solved: raw.solved,
  submissionNumber: raw.submission_number ?? raw.submissionNumber,
  acceptedNumber: raw.accepted_number ?? raw.acceptedNumber,
  ruleType: raw.rule_type ?? raw.ruleType,
  totalScore: raw.total_score ?? raw.totalScore,
});
