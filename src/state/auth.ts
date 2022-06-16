import {Linking} from 'react-native'
import * as auth from '@adxp/auth'
import * as ucan from 'ucans'
import {InAppBrowser} from 'react-native-inappbrowser-reborn'
import {isWeb} from '../platform/detection'
import {
  getInitialURL,
  extractHashFragment,
  clearHash,
  makeAppUrl,
} from '../platform/urls'
import * as storage from './storage'
import * as env from '../env'

const SCOPE = auth.writeCap(
  'did:key:z6MkfRiFMLzCxxnw6VMrHK8pPFt4QAHS3jX3XM87y9rta6kP',
  'did:example:microblog',
)

export async function isAuthed(authStore: ReactNativeStore) {
  return await authStore.hasUcan(SCOPE)
}

export async function logout(authStore: ReactNativeStore) {
  await authStore.reset()
}

export async function parseUrlForUcan(fragment: string) {
  try {
    return await auth.parseLobbyResponseHashFragment(fragment)
  } catch (err) {
    return undefined
  }
}

export async function initialLoadUcanCheck(authStore: ReactNativeStore) {
  let wasAuthed = false
  const fragment = extractHashFragment(await getInitialURL())
  if (fragment) {
    const ucan = await parseUrlForUcan(fragment)
    if (ucan) {
      await authStore.addUcan(ucan)
      wasAuthed = true
      clearHash()
    }
  }
  return wasAuthed
}

export async function requestAppUcan(authStore: ReactNativeStore) {
  const did = await authStore.getDid()
  const returnUrl = makeAppUrl()
  const fragment = auth.requestAppUcanHashFragment(did, SCOPE, returnUrl)
  const url = `${env.AUTH_LOBBY}#${fragment}`

  if (isWeb) {
    // @ts-ignore window is defined -prf
    window.location.href = url
    return false
  }

  if (await InAppBrowser.isAvailable()) {
    // use in-app browser
    const res = await InAppBrowser.openAuth(url, returnUrl, {
      // iOS Properties
      ephemeralWebSession: false,
      // Android Properties
      showTitle: false,
      enableUrlBarHiding: true,
      enableDefaultShare: false,
    })
    if (res.type === 'success' && res.url) {
      const fragment = extractHashFragment(res.url)
      if (fragment) {
        const ucan = await parseUrlForUcan(fragment)
        if (ucan) {
          await authStore.addUcan(ucan)
          return true
        }
      }
    } else {
      console.log('Not completed', res)
      return false
    }
  } else {
    // use system browser
    Linking.openURL(url)
  }
  return true
}

export class ReactNativeStore extends auth.AuthStore {
  private keypair: ucan.EdKeypair
  private ucanStore: ucan.Store

  constructor(keypair: ucan.EdKeypair, ucanStore: ucan.Store) {
    super()
    this.keypair = keypair
    this.ucanStore = ucanStore
  }

  static async load(): Promise<ReactNativeStore> {
    const keypair = await ReactNativeStore.loadOrCreateKeypair()

    const storedUcans = await ReactNativeStore.getStoredUcanStrs()
    const ucanStore = await ucan.Store.fromTokens(storedUcans)

    return new ReactNativeStore(keypair, ucanStore)
  }

  static async loadOrCreateKeypair(): Promise<ucan.EdKeypair> {
    const storedKey = await storage.loadString('adxKey')
    if (storedKey) {
      return ucan.EdKeypair.fromSecretKey(storedKey)
    } else {
      // @TODO: again just stand in since no actual root keys
      const keypair = await ucan.EdKeypair.create({exportable: true})
      storage.saveString('adxKey', await keypair.export())
      return keypair
    }
  }

  static async getStoredUcanStrs(): Promise<string[]> {
    const storedStr = await storage.loadString('adxUcans')
    if (!storedStr) {
      return []
    }
    return storedStr.split(',')
  }

  static setStoredUcanStrs(ucans: string[]): void {
    storage.saveString('adxUcans', ucans.join(','))
  }

  protected async getKeypair(): Promise<ucan.EdKeypair> {
    return this.keypair
  }

  async addUcan(token: ucan.Chained): Promise<void> {
    this.ucanStore.add(token)
    const storedUcans = await ReactNativeStore.getStoredUcanStrs()
    ReactNativeStore.setStoredUcanStrs([...storedUcans, token.encoded()])
  }

  async getUcanStore(): Promise<ucan.Store> {
    return this.ucanStore
  }

  async clear(): Promise<void> {
    storage.clear()
  }

  async reset(): Promise<void> {
    this.clear()
    this.keypair = await ReactNativeStore.loadOrCreateKeypair()
    this.ucanStore = await ucan.Store.fromTokens([])
  }
}