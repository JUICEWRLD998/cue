'use client'

import {motion} from 'motion/react'
import {COLUMN_STAGGER, dur, ease} from '../lib/motion'
import styles from './Roll.module.css'

export type RollLane = {voiceId: string; name: string; steps: number[]}

type Props = {
  lanes: RollLane[]
  // Column under the reading head, or -1 to hide the head.
  step: number
  // room = the published song (amber head). cue = a draft heard in the headphones (teal head).
  channel: 'room' | 'cue'
  // Changes every time a new song takes over; remounts the holes so the Drop can punch them in.
  dropId: number
  // True for about a second after a drop: holes are punched left to right.
  dropping: boolean
  onToggle?: (voiceId: string, index: number) => void
  label: string
}

const STEPS = 16

export function Roll({lanes, step, channel, dropId, dropping, onToggle, label}: Props) {
  const interactive = !!onToggle
  return (
    <div
      className={`${styles.roll} ${interactive ? styles.scroll : ''}`}
      data-channel={channel}
      role="group"
      aria-label={label}
    >
      <div className={styles.sheet}>
        {step >= 0 && (
          <div className={styles.headTrack} aria-hidden>
            <span className={styles.head} style={{transform: `translateX(${step * 100}%)`}} />
          </div>
        )}
        {lanes.map((lane) => (
          <div className={styles.lane} key={lane.voiceId}>
            <span className={styles.name}>{lane.name}</span>
            <div className={styles.cells}>
              {Array.from({length: STEPS}, (_, i) => {
                const on = lane.steps.includes(i)
                const body = (
                  <>
                    <span className={styles.dot} aria-hidden />
                    {on && (
                      <motion.span
                        key={`${dropId}-${lane.voiceId}-${i}`}
                        className={styles.hole}
                        initial={{scale: 0.6, opacity: 0}}
                        animate={{scale: 1, opacity: 1}}
                        transition={{
                          duration: dur.punch,
                          ease: ease.out,
                          delay: dropping ? i * COLUMN_STAGGER : 0,
                        }}
                        aria-hidden
                      />
                    )}
                  </>
                )
                const beat = i % 4 === 0 ? styles.beat : ''
                return onToggle ? (
                  <button
                    type="button"
                    key={i}
                    className={`${styles.cell} ${styles.press} ${beat}`}
                    aria-pressed={on}
                    aria-label={`${lane.name}, step ${i + 1}`}
                    onClick={() => onToggle(lane.voiceId, i)}
                  >
                    {body}
                  </button>
                ) : (
                  <span key={i} className={`${styles.cell} ${beat}`} data-on={on}>
                    {body}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
