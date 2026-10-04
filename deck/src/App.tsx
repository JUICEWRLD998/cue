import {type SanityConfig} from '@sanity/sdk'
import {SanityApp} from '@sanity/sdk-react'
import {Suspense} from 'react'
import {DATASET, PROJECT_ID} from './config'
import {Deck} from './Deck'
import './App.css'

const sanityConfigs: SanityConfig[] = [{projectId: PROJECT_ID, dataset: DATASET}]

function App() {
  return (
    <SanityApp config={sanityConfigs} fallback={<p className="boot">Connecting to Sanity…</p>}>
      <Suspense fallback={<p className="boot">Loading the song…</p>}>
        <Deck />
      </Suspense>
    </SanityApp>
  )
}

export default App
