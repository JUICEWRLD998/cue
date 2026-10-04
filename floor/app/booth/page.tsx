import type {Metadata} from 'next'
import BoothClient from './BoothClient'

export const metadata: Metadata = {title: 'The booth | Cue'}

export default function Page() {
  return <BoothClient />
}
