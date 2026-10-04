import {defineField, defineType} from 'sanity'

/**
 * One hit in a lane. Objects, not a 16-character string, so GROQ can ask
 * questions like "which lanes put a hit on the off-beat".
 */
export const step = defineType({
  name: 'step',
  title: 'Step',
  type: 'object',
  fields: [
    defineField({
      name: 'index',
      title: 'Step (0-15 within the bar)',
      type: 'number',
      validation: (r) => r.required().integer().min(0).max(15),
    }),
    defineField({
      name: 'velocity',
      type: 'number',
      initialValue: 0.9,
      validation: (r) => r.required().min(0).max(1),
    }),
    defineField({
      name: 'probability',
      title: 'Probability (0-1)',
      type: 'number',
      initialValue: 1,
      validation: (r) => r.required().min(0).max(1),
    }),
    defineField({
      name: 'nudge',
      title: 'Nudge (ms, negative is early)',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.min(-60).max(60),
    }),
  ],
  preview: {
    select: {index: 'index', velocity: 'velocity'},
    prepare: ({index, velocity}) => ({title: `step ${index}`, subtitle: `velocity ${velocity}`}),
  },
})
