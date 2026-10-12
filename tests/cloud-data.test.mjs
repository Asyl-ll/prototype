import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmationRedirect, historyStats, lecturePayload, localHistoryCards } from '../src/cloud-data.mjs';

const lecture = {
  id: '11111111-1111-4111-8111-111111111111',
  createdAt: '2026-10-12T10:00:00.000Z',
  filename: 'notes.txt', text: 'Operating systems manage computer hardware.',
  settings: { date: '2026-10-12', language: 'English' },
  result: {
    title: 'Operating systems',
    analysis: { overview: 'OS basics', concepts: [{ title: 'Kernel', explanation: 'Core of an OS' }], explanations: ['Memory is managed.'], examples: [], connections: [], review: ['Processes'] },
    futureTopics: [{ title: 'Networks', reason: 'The course continues with networks.', confidence: 'high', basis: 'course_outline' }],
    teacherAssignments: [{ id: 'task-1', title: 'Worksheet', quote: 'Submit the worksheet.', date: '2026-10-19', time: '18:00', on: true }],
    practiceTasks: [{ title: 'Compare systems', reason: 'Build understanding.' }],
    quiz: [{ question: 'What manages hardware?', options: ['OS', 'Photo editor'], answer: 0, explanation: 'The OS manages hardware.' }]
  },
  answers: { 0: 0 }, checked: { 'practice-0': true }, saveLocal: true
};

test('lecturePayload maps a lecture into all database sections', () => {
  const payload = lecturePayload(lecture, []);
  assert.equal(payload.source_type, 'file');
  assert.equal(payload.word_count, 5);
  assert.equal(payload.topics.length, 2);
  assert.equal(payload.questions[0].options[0].correct, true);
  assert.deepEqual(payload.quiz_attempt, { score: 1, total: 1 });
  assert.equal(payload.tasks.length, 2);
  assert.equal(payload.tasks[1].completed, true);
});

test('local cards and statistics preserve visible progress', () => {
  const cards = localHistoryCards([lecture]);
  assert.equal(cards[0].score, 1);
  assert.equal(cards[0].total_tasks, 2);
  assert.deepEqual(historyStats(cards), { lectures: 1, quizAverage: 100, completedTasks: 1, totalTasks: 2 });
});

test('confirmationRedirect sends email confirmations back to the production site', () => {
  assert.equal(confirmationRedirect('https://lecture-plus-ict.vercel.app/'), 'https://lecture-plus-ict.vercel.app/');
});
