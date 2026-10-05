export const source = 'Operating systems manage memory, processes, devices and files. Windows and Linux are operating systems. Application software helps users do specific tasks. Submit the OS worksheet by 2030-10-12 at 18:00. A compiler translates a program before execution. An interpreter runs it step by step.';
export const studyGuide = {
  title: 'Operating systems',
  analysis: {
    overview: 'An operating system manages the computer and connects applications to hardware.',
    concepts: [{ title: 'Operating system', explanation: 'It manages memory, processes, devices and files.' }, { title: 'Compiler and interpreter', explanation: 'They translate programs in different ways.' }],
    explanations: ['A compiler translates before execution, while an interpreter works step by step.'],
    examples: ['Windows and Linux are operating systems.'],
    connections: ['Applications use the operating system to work with hardware.'],
    review: ['Name the four resources managed by an operating system.']
  },
  futureTopics: [{ title: 'Process scheduling', reason: 'It explains how the OS shares processor time.', buildsOn: ['Processes'], basis: 'ai_recommendation', confidence: 'medium' }],
  practiceTasks: [{ title: 'Compare a compiler and an interpreter', reason: 'This checks an important difference from the lecture.' }],
  teacherAssignments: [{ title: 'OS worksheet', quote: 'Submit the OS worksheet by 2030-10-12 at 18:00.', date: '2030-10-12', time: '18:00' }],
  quiz: [{ question: 'What does an operating system manage?', options: ['Only photos', 'Memory and processes', 'Only email', 'Only websites'], answer: 1, explanation: 'An OS manages memory, processes, devices and files.', reviewTopic: 'Operating system functions' }]
};
