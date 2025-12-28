import { init, id } from '@instantdb/react'

const APP_ID = '70fe6be0-4e75-4477-8565-b9063a81a91a'

// Initialize InstantDB
export const db = init({
  appId: APP_ID
})

// Export id generator for creating new records
export { id }
