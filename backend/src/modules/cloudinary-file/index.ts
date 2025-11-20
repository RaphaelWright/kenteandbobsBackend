import { ModuleProviderExports } from '@medusajs/framework/types'
import CloudinaryFileProviderService from './service'

const services = [CloudinaryFileProviderService]

const providerExport: ModuleProviderExports = {
  services,
}

export default providerExport

