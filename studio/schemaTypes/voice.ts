import {defineField, defineType} from 'sanity'

export const VOICE_KINDS = ['kick', 'snare', 'hat', 'clap', 'tom', 'bass', 'stab'] as const

/**
 * A voice is a synthesised instrument: parameters, not audio files.
 * Voices are shared documents (a "kit") published once; songs reference them.
 */
export const voice = defineType({
  name: 'voice',
  title: 'Voice',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'kind',
      type: 'string',
      options: {list: [...VOICE_KINDS], layout: 'radio'},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'pitch',
      title: 'Pitch (Hz)',
      type: 'number',
      validation: (r) => r.required().min(20).max(8000),
    }),
    defineField({
      name: 'decay',
      title: 'Decay (ms)',
      type: 'number',
      validation: (r) => r.required().min(10).max(2000),
    }),
    defineField({
      name: 'tone',
      title: 'Tone (0 dull, 1 bright)',
      type: 'number',
      initialValue: 0.5,
      validation: (r) => r.required().min(0).max(1),
    }),
    defineField({
      name: 'gain',
      type: 'number',
      initialValue: 0.8,
      validation: (r) => r.required().min(0).max(1),
    }),
  ],
  preview: {select: {title: 'name', subtitle: 'kind'}},
})
