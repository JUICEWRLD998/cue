import {defineField, defineType} from 'sanity'
import {StepGridInput} from '../components/StepGridInput'

/**
 * One instrument row inside a section. The steps are embedded on purpose:
 * publishing a document does not publish the documents it references, so
 * everything the Floor needs for a Drop must live inside the one song document.
 */
export const lane = defineType({
  name: 'lane',
  title: 'Lane',
  type: 'object',
  fields: [
    defineField({
      name: 'voice',
      type: 'reference',
      to: [{type: 'voice'}],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'steps',
      type: 'array',
      of: [{type: 'step'}],
      components: {input: StepGridInput},
      validation: (r) =>
        r.custom((steps) => {
          if (!Array.isArray(steps)) return true
          const seen = new Set<number>()
          for (const s of steps as Array<{index?: number}>) {
            if (typeof s.index !== 'number') continue
            if (seen.has(s.index)) return `Two steps share index ${s.index}`
            seen.add(s.index)
          }
          return true
        }),
    }),
  ],
  preview: {
    select: {title: 'voice.name', steps: 'steps'},
    prepare: ({title, steps}) => ({
      title: title ?? 'Lane',
      subtitle: `${Array.isArray(steps) ? steps.length : 0} hits`,
    }),
  },
})
