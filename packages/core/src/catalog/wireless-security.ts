/**
 * WIRELESS & SECURITY CATALOG
 * 
 * Catálogo de dispositivos wireless, firewalls y otros dispositivos especiales
 */

import { wirelessCatalog } from './wireless';
import { securityCatalog } from './security';
import { otherDeviceCatalog } from './other-devices';

export default [...wirelessCatalog, ...securityCatalog, ...otherDeviceCatalog];
