import type {Metadata} from 'next'
import {Anybody, Schibsted_Grotesk} from 'next/font/google'
import Link from 'next/link'
import {MotionProvider} from '../components/MotionProvider'
import './globals.css'
import styles from './shell.module.css'

const display = Anybody({subsets: ['latin'], variable: '--font-display', axes: ['wdth'], display: 'swap'})
const body = Schibsted_Grotesk({subsets: ['latin'], variable: '--font-body', display: 'swap'})

export const metadata: Metadata = {
  title: 'Cue',
  description:
    'A drum machine whose song is a Sanity dataset. The room hears what is published. The DJ hears the draft first.',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={display.variable + ' ' + body.variable}>
      <body>
        <a href="#main" className={styles.skip}>
          Skip to content
        </a>
        <header className={styles.header}>
          <Link href="/" className={styles.mark}>
            Cue
          </Link>
          <nav className={styles.nav} aria-label="Primary">
            <Link href="/">The room</Link>
            <Link href="/booth">The booth</Link>
            <a href="https://github.com/JUICEWRLD998/cue">Source</a>
          </nav>
        </header>
        <MotionProvider>{children}</MotionProvider>
        <footer className={styles.footer}>
          <p>Built for the DEV Sanity Challenge by Mustapha Fadhlullah, independent security researcher.</p>
        </footer>
      </body>
    </html>
  )
}
