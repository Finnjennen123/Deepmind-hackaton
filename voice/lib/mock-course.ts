import { Course } from './course-types';

// ═══════════════════════════════════════════
//   DEMO COURSE DATA
//   Replace with real AI-generated course later
// ═══════════════════════════════════════════

export const MOCK_COURSE: Course = {
  title: 'Machine Learning Fundamentals',
  subject: 'Machine Learning',
  phases: [
    {
      id: 'phase_1',
      title: 'Foundations',
      description: 'Core math and programming concepts you need before diving into ML',
      parts: [
        {
          id: 'part_1_1',
          title: 'Linear Algebra Essentials',
          content: '',
          mastery_criteria: '',
          status: 'not_started',
        },
        {
          id: 'part_1_2',
          title: 'Python for Data Science',
          content: '',
          mastery_criteria: '',
          status: 'locked',
        },
      ],
    },
    {
      id: 'phase_2',
      title: 'Core ML Concepts',
      description: 'The fundamental algorithms and ideas that power all of machine learning',
      parts: [
        {
          id: 'part_2_1',
          title: 'Supervised Learning',
          content: '',
          mastery_criteria: '',
          status: 'locked',
        },
        {
          id: 'part_2_2',
          title: 'Loss Functions & Optimization',
          content: '',
          mastery_criteria: '',
          status: 'locked',
        },
        {
          id: 'part_2_3',
          title: 'Overfitting & Generalization',
          content: '',
          mastery_criteria: '',
          status: 'locked',
        },
      ],
    },
    {
      id: 'phase_3',
      title: 'Neural Networks',
      description: 'Deep learning fundamentals — how neural networks actually work under the hood',
      parts: [
        {
          id: 'part_3_1',
          title: 'Perceptrons & Layers',
          content: '',
          mastery_criteria: '',
          status: 'locked',
        },
        {
          id: 'part_3_2',
          title: 'Backpropagation',
          content: '',
          mastery_criteria: '',
          status: 'locked',
        },
      ],
    },
    {
      id: 'phase_4',
      title: 'Practical ML',
      description: 'Putting it all together — building and deploying real models',
      parts: [
        {
          id: 'part_4_1',
          title: 'Building Your First Model',
          content: '',
          mastery_criteria: '',
          status: 'locked',
        },
        {
          id: 'part_4_2',
          title: 'Model Evaluation & Iteration',
          content: '',
          mastery_criteria: '',
          status: 'locked',
        },
      ],
    },
  ],
};
