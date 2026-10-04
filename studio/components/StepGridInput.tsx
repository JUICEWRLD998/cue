import {Box, Button, Flex, Text} from '@sanity/ui'
import {useCallback} from 'react'
import {set, unset, type ArrayOfObjectsInputProps} from 'sanity'

type Step = {_key: string; _type: 'step'; index: number; velocity?: number; probability?: number; nudge?: number}

const STEPS = 16

// Replaces the default array editor for lane.steps: sixteen cells, one per step in the bar.
// A filled cell is a step object in the array. Accents mark the beat (every fourth step).
export function StepGridInput(props: ArrayOfObjectsInputProps) {
  const {value, onChange, readOnly} = props
  const steps = (value ?? []) as Step[]
  const on = new Set(steps.map((s) => s.index))

  const toggle = useCallback(
    (index: number) => {
      const next: Step[] = on.has(index)
        ? steps.filter((s) => s.index !== index)
        : [
            ...steps,
            {_key: `s${index}`, _type: 'step', index, velocity: 0.9, probability: 1, nudge: 0},
          ]
      next.sort((a, b) => a.index - b.index)
      onChange(next.length ? set(next) : unset())
    },
    [on, steps, onChange],
  )

  return (
    <Box>
      <Flex gap={1} wrap="wrap" role="group" aria-label="Sixteen steps in one bar">
        {Array.from({length: STEPS}, (_, i) => (
          <Button
            key={i}
            mode={on.has(i) ? 'default' : 'ghost'}
            tone={on.has(i) ? 'primary' : i % 4 === 0 ? 'caution' : 'default'}
            padding={2}
            fontSize={1}
            text={String(i + 1)}
            aria-pressed={on.has(i)}
            disabled={readOnly}
            onClick={() => toggle(i)}
            style={{width: '2.4rem'}}
          />
        ))}
      </Flex>
      <Box marginTop={2}>
        <Text size={1} muted>
          {steps.length} of {STEPS} steps on. Velocity, probability and nudge stay editable from the step list below.
        </Text>
      </Box>
      {props.renderDefault(props)}
    </Box>
  )
}
