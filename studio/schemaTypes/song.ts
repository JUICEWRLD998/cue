import {defineField, defineType} from 'sanity'

/**
 * The song is the unit of the Drop. The Floor plays the published version, the
 * Deck edits the draft, and publishing the draft is one atomic change.
 */
export const song = defineType({
  name: 'song',
  title: 'Song',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'bpm',
      type: 'number',
      initialValue: 118,
      validation: (r) => r.required().min(60).max(200),
    }),
    defineField({
      name: 'swing',
      title: 'Swing (0 straight, 0.5 heavy)',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.min(0).max(0.5),
    }),
    defineField({
      name: 'sections',
      type: 'array',
      of: [{type: 'section'}],
      validation: (r) => r.required().min(1),
    }),
  ],
  preview: {
    select: {title: 'title', bpm: 'bpm', sections: 'sections'},
    prepare: ({title, bpm, sections}) => ({
      title,
      subtitle: `${bpm} bpm · ${Array.isArray(sections) ? sections.length : 0} sections`,
    }),
  },
})
