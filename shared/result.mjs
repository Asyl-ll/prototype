const textList = value => Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) : [];

export function normalizeResult(input = {}) {
  const oldTopics = textList(input.topics);
  const oldRoadmap = input.roadmap || {};
  const analysis = input.analysis || {
    overview: input.summary || '',
    concepts: oldTopics.map(title => ({ title, explanation: '' })),
    explanations: [],
    examples: [],
    connections: [],
    review: textList(oldRoadmap.review)
  };
  const futureTopics = Array.isArray(input.futureTopics) ? input.futureTopics : [
    ...textList(oldRoadmap.next).map(title => ({ title, reason: 'This topic builds on the current lecture.', buildsOn: [], basis: 'ai_recommendation', confidence: 'medium' })),
    ...textList(oldRoadmap.later).map(title => ({ title, reason: 'This is a useful topic to explore later.', buildsOn: [], basis: 'ai_recommendation', confidence: 'exploratory' }))
  ];
  const assignments = Array.isArray(input.teacherAssignments) ? input.teacherAssignments : (Array.isArray(input.deadlines) ? input.deadlines : []);
  const practiceTasks = Array.isArray(input.practiceTasks) ? input.practiceTasks : textList(input.tasks).map(title => ({ title, reason: 'Suggested practice based on this lecture.' }));
  return {
    ...input,
    title: input.title || 'Lecture analysis',
    analysis: {
      overview: analysis.overview || '',
      concepts: Array.isArray(analysis.concepts) ? analysis.concepts : [],
      explanations: textList(analysis.explanations),
      examples: textList(analysis.examples),
      connections: textList(analysis.connections),
      review: textList(analysis.review)
    },
    futureTopics,
    futureBasis: input.futureBasis || input.roadmapBasis || 'These are AI study suggestions. Check the course order with your teacher.',
    teacherAssignments: assignments.map((item, index) => ({ ...item, id: item.id || `assignment-${index}`, on: item.on !== false })),
    practiceTasks: practiceTasks.map(item => typeof item === 'string' ? { title: item, reason: 'Suggested practice based on this lecture.' } : item),
    quiz: (Array.isArray(input.quiz) ? input.quiz : []).map(item => ({ ...item, reviewTopic: item.reviewTopic || 'Review the related concept in the analysis.' }))
  };
}
