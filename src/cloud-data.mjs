import { normalizeResult } from '../shared/result.mjs';

const confidenceNumber = value => ({ high: 0.9, medium: 0.65, exploratory: 0.3 }[value] ?? 0.5);

function sourceType(filename = '') {
  if (filename === 'Pasted lecture notes') return 'text';
  return /\.(mp3|m4a|wav|webm|ogg|mp4)$/i.test(filename) ? 'audio' : 'file';
}

function dueAt(item) {
  if (!item?.date || !item?.time) return '';
  const date = new Date(`${item.date}T${item.time}:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function lecturePayload(lecture, browserReminders = []) {
  const result = normalizeResult(lecture?.result);
  const answers = Object.entries(lecture?.answers || {}).map(([questionPosition, optionPosition]) => {
    const question = result.quiz[Number(questionPosition)];
    return {
      question_position: Number(questionPosition),
      option_position: Number(optionPosition),
      correct: Number(optionPosition) === question?.answer
    };
  });
  const teacherTasks = result.teacherAssignments.filter(item => item.on !== false).map(item => ({
    source_id: item.id,
    title: item.title,
    description: item.quote || 'Added by the student.',
    type: 'teacher',
    due_at: dueAt(item),
    completed: Boolean(lecture?.checked?.[item.id]),
    reminders: browserReminders.filter(row => row.lectureId === lecture.id && row.deadlineId === item.id).map(row => ({
      remind_at: new Date(row.at).toISOString(), channel: 'in_app', status: row.fired ? 'sent' : 'planned'
    }))
  }));
  const practiceTasks = result.practiceTasks.map((item, index) => ({
    source_id: `practice-${index}`,
    title: item.title,
    description: item.reason || 'AI practice suggestion.',
    type: 'ai_practice',
    due_at: '',
    completed: Boolean(lecture?.checked?.[`practice-${index}`]),
    reminders: []
  }));
  const currentTopics = result.analysis.concepts.map(item => ({
    name: item.title,
    description: item.explanation || '',
    role: 'current',
    reason: item.explanation || 'Covered in this lecture.',
    confidence: 1
  }));
  const futureTopics = result.futureTopics.map(item => ({
    name: item.title,
    description: item.reason || '',
    role: 'future',
    reason: item.reason || 'Suggested from the current lecture.',
    confidence: confidenceNumber(item.confidence)
  }));
  const sections = {
    explanations: result.analysis.explanations,
    examples: result.analysis.examples,
    connections: result.analysis.connections
  };
  const questions = result.quiz.map((item, position) => ({
    question: item.question,
    explanation: item.explanation || '',
    review_topic: item.reviewTopic || '',
    position,
    options: item.options.map((text, optionPosition) => ({ text, position: optionPosition, correct: optionPosition === item.answer }))
  }));
  const correct = answers.filter(item => item.correct).length;

  return {
    id: lecture.id,
    title: result.title,
    source_type: sourceType(lecture.filename),
    source_name: lecture.filename || 'Lecture',
    language: lecture.settings?.language || 'English',
    lecture_date: lecture.settings?.date || new Date().toISOString().slice(0, 10),
    duration_seconds: lecture.durationSeconds || '',
    created_at: lecture.createdAt || new Date().toISOString(),
    transcript: lecture.text || '',
    word_count: (lecture.text || '').trim().split(/\s+/).filter(Boolean).length,
    analysis: { overview: result.analysis.overview, concepts: result.analysis.concepts, sections, review: result.analysis.review },
    topics: [...currentTopics, ...futureTopics],
    questions,
    answers,
    quiz_attempt: { score: correct, total: result.quiz.length },
    tasks: [...teacherTasks, ...practiceTasks]
  };
}

export function historyStats(rows = []) {
  const scores = rows.filter(row => Number(row.total_questions) > 0);
  const earned = scores.reduce((sum, row) => sum + Number(row.score || 0), 0);
  const possible = scores.reduce((sum, row) => sum + Number(row.total_questions || 0), 0);
  return {
    lectures: rows.length,
    quizAverage: possible ? Math.round(earned / possible * 100) : 0,
    completedTasks: rows.reduce((sum, row) => sum + Number(row.completed_tasks || 0), 0),
    totalTasks: rows.reduce((sum, row) => sum + Number(row.total_tasks || 0), 0)
  };
}

export function localHistoryCards(rows = []) {
  return rows.filter(row => row?.result?.title).map(row => {
    const result = normalizeResult(row.result);
    const answers = row.answers || {};
    const score = result.quiz.filter((q, index) => Number(answers[index]) === q.answer).length;
    const completedTasks = Object.values(row.checked || {}).filter(Boolean).length;
    return {
      id: row.id,
      title: result.title,
      source_name: row.filename,
      language: row.settings?.language || 'English',
      created_at: row.settings?.date ? `${row.settings.date}T12:00:00Z` : row.createdAt,
      current_topics: result.analysis.concepts.map(item => item.title),
      future_topics: result.futureTopics.map(item => item.title),
      score,
      total_questions: result.quiz.length,
      completed_tasks: completedTasks,
      total_tasks: result.teacherAssignments.filter(item => item.on !== false).length + result.practiceTasks.length,
      local: true,
      lecture: row
    };
  });
}

