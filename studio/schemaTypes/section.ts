import {defineField, defineType} from 'sanity'

export const SECTION_KINDS = ['intro', 'build', 'drop', 'break', 'outro'] as const

/** A part of the song. One bar of lanes, repeated for `bars` bars. */
export const section = defineType({
  name: 'section',
  title: 'Section',
  type: 'object',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'kind',
      type: 'string',
      options: {list: [...SECTION_KINDS], layout: 'radio'},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'bars',
      title: 'Bars to play before moving on',
      type: 'number',
      initialValue: 4,
      validation: (r) => r.required().integer().min(1).max(32),
    }),
    defineField({name: 'lanes', type: 'array', of: [{type: 'lane'}]}),
  ],
  preview: {
    select: {title: 'title', kind: 'kind', bars: 'bars'},
    prepare: ({title, kind, bars}) => ({title, subtitle: `${kind} · ${bars} bars`}),
  },
})
